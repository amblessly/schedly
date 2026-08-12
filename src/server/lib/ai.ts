import { preprocessImage } from "./image-processing";
import { PipelineLogger } from "./structured-logger";
import { incrementUsage, saveLimitSnapshot, USAGE_SERVICES } from "./usage-counter";
import { OPENROUTER_KEYS, openRouterServiceFor } from "./openrouter-keys";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/**
 * Confidence below this threshold triggers a single fallback vision-model
 * re-extraction. High-confidence results skip the fallback entirely, keeping
 * the common path to a single AI call.
 */
const CONFIDENCE_THRESHOLD = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.75);

/* ===== Vision Models (Image Understanding) =====
 * Ordered primary -> fallback. The fallback is ONLY used when the primary
 * errors out (rate limit / outage) — not on low confidence. Keeps the common
 * path to a single AI call for fast uploads.
 *
 * Primary: Gemma 4 26B — fastest measured free vision model on OpenRouter
 * (~49s end-to-end on a real schedule photo, reliable confident output). */
const VISION_MODELS = [
  "google/gemma-4-26b-a4b-it:free",                        // Primary (fast, accurate)
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",    // Fallback (only on errors)
];

/* ===== Validation/Reasoning Models =====
 * Used only as a last resort when the vision model fails to produce a usable
 * result (no classes at all). Primary is a reasoning model, Gemma as fallback.
 * (Note: `tencent/hy3:free` no longer exists on OpenRouter and was removed.) */
const VALIDATION_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", // Primary (reasoning)
  "google/gemma-4-26b-a4b-it:free",                      // Fallback
];

const RETRY_DELAYS = [1000];

/**
 * Single, concise extraction prompt. Day abbreviation expansion is delegated to
 * the deterministic normalizer (src/server/lib/day-normalizer.ts), so the model
 * only returns raw day tokens — shrinking its failure surface and token usage.
 * One pass, low latency.
 */
const SCHEDULE_EXTRACTION_PROMPT = `Treat the uploaded image as a structured class schedule, not plain OCR text. Analyze the complete table layout (rows, columns, merged cells, headers, relationships) first, then extract only valid class entries.

UNIQUE KEY: a class is (subject + room + startTime + endTime). If the same class meets on multiple days with identical room and time, MERGE the days into one record's days array — never create duplicate records. Only split when time or room differs.

Parse day tokens in ANY format (M, T, W, TH, F, SAT, SUN, MW, TF, TTH, MWF, MTW, etc.) and return them as a days ARRAY of raw tokens (e.g. ["MWF"], ["TTH"]). Do NOT expand to full names — pass the original tokens through.

For each real class extract:
- subject, courseCode, instructor, room, section, block
- days: array of raw day tokens
- startTime / endTime: 24-hour "HH:MM" (convert 12h AM/PM)
- notes

Rules:
- 24-hour "HH:MM" time only
- READ TIMES EXACTLY AS PRINTED. Do NOT round, shift, estimate, or "correct" them — the minutes must match the image (e.g. "7:30" is 07:30, never 07:35 or 08:00).
- Convert AM/PM carefully: a class printed as 7:30-9:00 AM is 07:30–09:00; PM classes are 13:00–23:59. Never swap the two halves of the day.
- If a time is faint or hard to read, output your best exact reading of what is printed — never leave it blank and never invent a different time.
- days is always an ARRAY
- Unseen fields -> null (never guess)
- Ignore duplicate OCR text, headers, decorative elements
- If not a schedule -> {"semester": null, "classes": [], "metadata": {"totalClasses": 0, "confidence": 0, "notes": "not_a_schedule"}}

Return ONLY valid JSON:
{
  "semester": "1st Semester 2026",
  "classes": [
    {"subject": "Programming 2", "courseCode": "CS102", "days": ["MW"], "startTime": "07:30", "endTime": "09:00", "room": "Lab 301", "instructor": "Prof. Santos", "section": "BSCS-1A", "block": "BSCS-1A", "notes": null}
  ],
  "metadata": {"totalClasses": 1, "confidence": 0.95, "notes": null}
}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a header value into a finite integer, or null if absent/invalid. */
function toFiniteInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchAndPreprocessImage(imageUrl: string) {
  const stage = "preprocess";
  PipelineLogger.info(stage, "Fetching image", { imageUrl });

  const t0 = performance.now();
  const response = await fetch(imageUrl);
  if (!response.ok) {
    PipelineLogger.error(stage, "Failed to fetch image", { imageUrl, status: response.status });
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);

  PipelineLogger.debug(stage, "Image fetched", {
    bytes: rawBuffer.length,
    contentType,
    fetchMs: Math.round(performance.now() - t0),
  });

  const pt0 = performance.now();
  // Preprocess the image before AI analysis (OpenCV + sharp).
  const processedBuffer = await preprocessImage(rawBuffer);
  PipelineLogger.info(stage, "Image preprocessed", {
    outBytes: processedBuffer.length,
    preprocessMs: Math.round(performance.now() - pt0),
  });

  const base64 = processedBuffer.toString("base64");
  return { base64, contentType: "image/jpeg" };
}

async function callOpenRouter(
  model: string,
  messages: unknown[],
  temperature = 0.1,
  apiKey = process.env.OPENROUTER_API_KEY,
) {
  if (!apiKey) throw new Error("No OpenRouter API key configured");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Schedly",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 2048,
    }),
  });

  // Persist the provider-side rate-limit snapshot (free-model daily cap) so the
  // admin Limits dashboard shows the real number even for failed attempts.
  const whichService = openRouterServiceFor(apiKey);
  void saveLimitSnapshot(whichService, {
    remaining: toFiniteInt(response.headers.get("x-ratelimit-remaining")),
    limit: toFiniteInt(response.headers.get("x-ratelimit-limit")),
    resetAt: response.headers.get("x-ratelimit-reset"),
  });

  // Read the body as text first so a non-JSON response (HTML error page,
  // gateway failure, truncated payload) doesn't throw a raw SyntaxError that
  // escapes as "Unexpected token ... is not valid JSON".
  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    const snippet = bodyText.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `AI provider returned a non-JSON response (status ${response.status}): ${snippet || "(empty)"}`,
    );
  }

  if (!response.ok) {
    const status = response.status;
    const msg = (data as { error?: { message?: string } })?.error?.message || "Unknown";
    console.error(`[AI] API error: ${status} on ${model}:`, msg);

    if (status === 429) {
      const retryAfter = (data as { error?: { metadata?: { retry_after_seconds_raw?: number } } })?.error?.metadata?.retry_after_seconds_raw || 10;
      throw { code: "RATE_LIMITED", model, retryAfter, message: msg };
    }

    throw new Error(`AI API error: ${status} - ${msg}`);
  }

  // Track which OpenRouter key served this call (cap dashboard).
  void incrementUsage(whichService);

  return data;
}

function parseAiResponse(data: unknown) {
  const obj = data as { choices?: { message: { content: string } }[] };
  const first = obj.choices?.[0];
  const text = first?.message?.content;

  if (!text) {
    console.error("[AI] No content in response:", JSON.stringify(data));
    throw new Error("No response from AI");
  }

  const jsonMatch = String(text).match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in AI response. Snippet: ${String(text).slice(0, 200)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new Error(`AI response contained malformed JSON. Snippet: ${jsonMatch[0].slice(0, 200)}`);
  }
}

/**
 * Google Gemini (free tier: ~1,500 requests/day, vision included) — used as
 * the PRIMARY extraction provider so the OpenRouter 50 free-requests/day cap
 * can never hard-block user uploads. OpenRouter stays as the fallback chain.
 */
async function callGemini(
  parts: Record<string, unknown>[],
  opts: { prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(`${GEMINI_GENERATE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: opts.prompt }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.1,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  // Track Gemini daily usage (cap dashboard). Counted on ANY provider response
  // because Google charges quota for failed requests too (429/503).
  void incrementUsage(USAGE_SERVICES.GEMINI);

  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`Gemini returned a non-JSON response (status ${response.status})`);
  }

  if (!response.ok) {
    const status = response.status;
    const msg = (data as { error?: { message?: string } })?.error?.message || "Unknown";
    console.error(`[AI] Gemini API error: ${status}:`, msg);
    throw new Error(`Gemini API error: ${status} - ${msg}`);
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in Gemini response. Snippet: ${text.slice(0, 200)}`);

  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new Error(`Gemini response contained malformed JSON. Snippet: ${jsonMatch[0].slice(0, 200)}`);
  }
}

// Test-only re-exports (used by ai-response.test.ts to assert error handling).
export const callOpenRouterTest = callOpenRouter;
export const parseAiResponseTest = parseAiResponse;

function isRateLimited(err: unknown): err is { retryAfter: number; model: string } {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: unknown }).code === "RATE_LIMITED"
  );
}

/**
 * Runs `call(model)` across the model list, retrying transient errors on the
 * SAME model and escalating to the next model only after that model is
 * exhausted. Returns the first successful result, or throws the last error.
 */
async function runWithModelFallback<T>(
  call: (model: string) => Promise<T>,
  models: string[],
): Promise<T> {
  let lastError: unknown;

  for (const model of models) {
    let exhausted = false;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        PipelineLogger.debug("extract", `Attempt ${attempt + 1}/${RETRY_DELAYS.length + 1}`, { model });
        return await call(model);
      } catch (err) {
        lastError = err;
        if (isRateLimited(err)) {
          console.log(`[AI] Rate limited on ${err.model}`);
          if (attempt < RETRY_DELAYS.length) {
            const delay = Math.min(Math.max(err.retryAfter * 1000, RETRY_DELAYS[attempt]!), 5000);
            await sleep(delay);
            continue;
          }
          exhausted = true;
          break;
        }
        if (attempt < RETRY_DELAYS.length) {
          console.log(`[AI] Transient error, retrying in ${RETRY_DELAYS[attempt]}ms...`);
          await sleep(RETRY_DELAYS[attempt]!);
          continue;
        }
        exhausted = true;
        break;
      }
    }
    if (!exhausted) break;
    console.log(`[AI] Model ${model} exhausted, escalating to next model`);
  }

  const message = lastError instanceof Error ? lastError.message : "AI request failed after all retries";
  throw new Error(message);
}

/**
 * Runs `call(model, apiKey)` across every configured OpenRouter key (in order),
 * escalating to the next key only after the previous key is exhausted across
 * all models. Returns the first successful result, or throws the last error.
 */
async function runWithOpenRouterKeys<T>(
  call: (model: string, apiKey: string) => Promise<T>,
  models: string[],
): Promise<T> {
  if (OPENROUTER_KEYS.length === 0) throw new Error("No OpenRouter API key configured");

  let lastError: unknown;
  for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
    const apiKey = OPENROUTER_KEYS[i]!;
    PipelineLogger.info("extract", `Trying OpenRouter key ${i + 1}/${OPENROUTER_KEYS.length}`);
    try {
      return await runWithModelFallback((model) => call(model, apiKey), models);
    } catch (err) {
      lastError = err;
      console.log(`[AI] OpenRouter key ${i + 1} exhausted, trying next key`);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "All OpenRouter keys failed";
  throw new Error(message);
}

export interface ExtractResult {
  data: Record<string, unknown>;
  model: string;
}

export async function extractScheduleFromImage(
  imageUrl: string,
  preloaded?: { base64: string; contentType: string },
): Promise<ExtractResult> {
  const configuredModel = process.env.OPENROUTER_MODEL;

  // Custom model first (still keeps the fallback chain behind it).
  const models = configuredModel
    ? [configuredModel, ...VISION_MODELS.filter((m) => m !== configuredModel)]
    : VISION_MODELS;

  PipelineLogger.info("extract", "Starting vision extraction", { models });

  const { base64, contentType } = preloaded ?? (await fetchAndPreprocessImage(imageUrl));

  // OpenRouter keys first (key 1 -> key 2 -> ... -> key N). For each key the
  // vision models are tried in order; we only escalate to the next key after
  // the previous one is exhausted (rate-limit / outage). Gemini stays as the
  // VERY last resort so all free OpenRouter keys are burned first.
  let usedModel = models[0]!;
  if (OPENROUTER_KEYS.length > 0) {
    try {
      const data = await runWithOpenRouterKeys(
        (model, apiKey) => {
          usedModel = model;
          return callOpenRouter(
            model,
            [
              {
                role: "user",
                content: [
                  { type: "text", text: SCHEDULE_EXTRACTION_PROMPT },
                  {
                    type: "image_url",
                    image_url: { url: `data:${contentType};base64,${base64}` },
                  },
                ],
              },
            ],
            0.1,
            apiKey,
          ).then(parseAiResponse);
        },
        models,
      );

      PipelineLogger.info("extract", "Vision extraction complete (OpenRouter)", { model: usedModel });
      return { data, model: usedModel };
    } catch (err) {
      PipelineLogger.error("extract", "All OpenRouter keys failed", {}, err);
    }
  }

  // Last resort: Gemini (free tier ~1,500 requests/day, vision included).
  // Retried once: Gemini free tier sometimes returns transient 503 (high demand).
  if (process.env.GEMINI_API_KEY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await callGemini(
          [
            { inline_data: { mime_type: contentType, data: base64 } },
            { text: "Extract the classes from this image exactly as the system instructions describe. Return ONLY valid JSON." },
          ],
          { prompt: SCHEDULE_EXTRACTION_PROMPT },
        );
        PipelineLogger.info("extract", "Vision extraction complete (Gemini)", {
          model: "gemini-flash-latest",
        });
        return { data, model: "gemini-flash-latest" };
      } catch (err) {
        PipelineLogger.error("extract", `Gemini attempt ${attempt} failed`, {}, err);
        if (attempt < 2) await sleep(1500);
      }
    }
  }

  throw new Error("All AI providers failed (OpenRouter 1-N, Gemini)");
}

export async function validateExtractedData(extractedJson: Record<string, unknown>) {
  const configuredModel = process.env.OPENROUTER_VALIDATION_MODEL;
  const models = configuredModel
    ? [configuredModel, ...VALIDATION_MODELS.filter((m) => m !== configuredModel)]
    : VALIDATION_MODELS;

  PipelineLogger.info("validate", "Starting Hy3 re-validation", { models });

  const prompt =
    `Re-validate this extracted schedule JSON. Merge duplicates by (subject+room+startTime+endTime), ` +
    `normalize day tokens, fix impossible times, and return the same JSON schema with an "overallConfidence" field.\n\n` +
    JSON.stringify(extractedJson, null, 2);

  // OpenRouter keys first (key 1 -> ... -> key N), Gemini as the very last
  // resort — same order as vision extraction.
  let usedModel = models[0]!;
  if (OPENROUTER_KEYS.length > 0) {
    try {
      const data = await runWithOpenRouterKeys(
        (model, apiKey) => {
          usedModel = model;
          return callOpenRouter(
            model,
            [{ role: "user", content: prompt }],
            0.1,
            apiKey,
          ).then(parseAiResponse);
        },
        models,
      );
      PipelineLogger.info("validate", "Hy3 re-validation complete", { model: usedModel });
      return data;
    } catch (err) {
      PipelineLogger.error("validate", "All OpenRouter keys failed", {}, err);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await callGemini([{ text: prompt }], { prompt });
        PipelineLogger.info("validate", "Re-validation complete (Gemini)", {
          model: "gemini-flash-latest",
        });
        return data;
      } catch (err) {
        PipelineLogger.error("validate", `Gemini attempt ${attempt} failed`, {}, err);
        if (attempt < 2) await sleep(1500);
      }
    }
  }

  throw new Error("All AI providers failed (OpenRouter 1-N, Gemini)");
}

/* ----------------------------------------------------------------------
   AI Schedule Suggestions (natural-language planning tips)
   ---------------------------------------------------------------------- */

const SUGGESTIONS_PROMPT = `You are a friendly classmate sharing practical study and life tips about this weekly class schedule (JSON). Read it like a person would and give 3-5 short, useful suggestions to help them plan their week.

Focus on:
- Best days/times to fit in appointments, errands, or study blocks
- Recurring free windows they could keep for a routine (study, gym, rest)
- Any day that looks overloaded and how to lighten it
- Long gaps before or after classes
- Anything genuinely useful about their free time

Rules:
- Talk naturally, like a friend giving advice — no corporate or robotic wording, no bullet-point jargon.
- Mention times in 12-HOUR format with AM/PM (e.g. "1 PM to 4 PM", never "13:00-16:00").
- Each suggestion must be a single short sentence (under 25 words), plain, specific, and personal ("you", "your").
- Vary the wording, examples, and sentence structure each time you're asked — do not repeat the same phrases from a previous answer.
- Do NOT invent classes, times, rooms, or people.
- Do NOT mention "AI", "algorithm", "analysis", or "assistant".
- Return ONLY valid JSON: {"suggestions": ["...", "..."]}`;

export type ScheduleSuggestionInput = {
  subject: string;
  days: string[];
  startTime: string;
  endTime: string;
};

/**
 * Generates natural-language planning suggestions for a schedule. Text-only
 * call against the same free models — no image needed.
 */
export async function generateScheduleSuggestions(
  classes: ScheduleSuggestionInput[],
): Promise<string[]> {
  const models = VISION_MODELS;
  const data = await runWithOpenRouterKeys(
    (model, apiKey) =>
      callOpenRouter(
        model,
        [
          {
            role: "user",
            content:
              `${SUGGESTIONS_PROMPT}\n\nWeekly schedule:\n${JSON.stringify(classes, null, 2)}`,
          },
        ],
        0.9,
        apiKey,
      ).then(parseAiResponse),
    models,
  );

  const suggestions = (data as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .slice(0, 5);
}

/* ----------------------------------------------------------------------
   Schedule Consistency Check
   ---------------------------------------------------------------------- */

export interface ConsistencyIssue {
  type: "missing_field" | "invalid_time" | "invalid_day" | "impossible_value" | "malformed_code";
  classIndex: number;
  field: string;
  message: string;
}

const VALID_DAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function checkScheduleConsistency(data: {
  classes?: Array<{
    subject?: string | null;
    courseCode?: string | null;
    days?: string[] | null;
    day?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    instructor?: string | null;
    room?: string | null;
    section?: string | null;
  }>;
}): { issues: ConsistencyIssue[]; score: number } {
  const issues: ConsistencyIssue[] = [];

  for (let i = 0; i < (data.classes ?? []).length; i++) {
    const c = data.classes![i]!;

    const daysList = c.days ?? (c.day ? [c.day] : []);

    if (!c.subject || c.subject.trim() === "") {
      issues.push({ type: "missing_field", classIndex: i, field: "subject", message: `Class ${i + 1} is missing subject` });
    }
    if (!daysList.length) {
      issues.push({ type: "missing_field", classIndex: i, field: "days", message: `Class ${i + 1} is missing days` });
    } else {
      for (const d of daysList) {
        if (!VALID_DAYS.has(d.toLowerCase().trim())) {
          issues.push({ type: "invalid_day", classIndex: i, field: "days", message: `Class ${i + 1} has invalid day "${d}"` });
        }
      }
    }
    if (!c.startTime || c.startTime.trim() === "") {
      issues.push({ type: "missing_field", classIndex: i, field: "startTime", message: `Class ${i + 1} is missing startTime` });
    } else if (!TIME_PATTERN.test(c.startTime)) {
      issues.push({ type: "invalid_time", classIndex: i, field: "startTime", message: `Class ${i + 1} has invalid startTime "${c.startTime}"` });
    }
    if (!c.endTime || c.endTime.trim() === "") {
      issues.push({ type: "missing_field", classIndex: i, field: "endTime", message: `Class ${i + 1} is missing endTime` });
    } else if (!TIME_PATTERN.test(c.endTime)) {
      issues.push({ type: "invalid_time", classIndex: i, field: "endTime", message: `Class ${i + 1} has invalid endTime "${c.endTime}"` });
    }

    if (c.startTime && c.endTime && TIME_PATTERN.test(c.startTime) && TIME_PATTERN.test(c.endTime)) {
      const startMin = parseInt(c.startTime.split(":")[0]!) * 60 + parseInt(c.startTime.split(":")[1]!);
      const endMin = parseInt(c.endTime.split(":")[0]!) * 60 + parseInt(c.endTime.split(":")[1]!);
      if (endMin <= startMin) {
        issues.push({ type: "impossible_value", classIndex: i, field: "endTime", message: `Class ${i + 1} ends before it starts (${c.startTime} → ${c.endTime})` });
      }
    }

    if (c.courseCode && c.courseCode.trim() !== "") {
      const code = c.courseCode.trim();
      if (!/^[A-Za-z0-9\s/-]+$/.test(code) || code.length < 3) {
        issues.push({ type: "malformed_code", classIndex: i, field: "courseCode", message: `Class ${i + 1} has malformed courseCode "${code}"` });
      }
    }
  }

  const totalChecks = (data.classes ?? []).length * 5;
  const failed = issues.length;
  const score = totalChecks > 0 ? Math.max(0, 1 - failed / totalChecks) : 1;

  return { issues, score };
}

/* ----------------------------------------------------------------------
   Conflict Detection (overlapping classes on same day)
   ---------------------------------------------------------------------- */

export interface Conflict {
  classA: number;
  classB: number;
  day: string;
  message: string;
}

export function detectConflicts(data: {
  classes?: Array<{
    days?: string[] | null;
    day?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    subject?: string | null;
  }>;
}): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < (data.classes ?? []).length; i++) {
    for (let j = i + 1; j < (data.classes ?? []).length; j++) {
      const a = data.classes![i]!;
      const b = data.classes![j]!;

      if (!a.startTime || !b.startTime || !a.endTime || !b.endTime) continue;

      const daysA = a.days ?? (a.day ? [a.day] : []);
      const daysB = b.days ?? (b.day ? [b.day] : []);
      if (!daysA.length || !daysB.length) continue;

      if (!TIME_PATTERN.test(a.startTime) || !TIME_PATTERN.test(a.endTime) ||
          !TIME_PATTERN.test(b.startTime) || !TIME_PATTERN.test(b.endTime)) continue;

      const aStart = parseInt(a.startTime.split(":")[0]!) * 60 + parseInt(a.startTime.split(":")[1]!);
      const aEnd = parseInt(a.endTime.split(":")[0]!) * 60 + parseInt(a.endTime.split(":")[1]!);
      const bStart = parseInt(b.startTime.split(":")[0]!) * 60 + parseInt(b.startTime.split(":")[1]!);
      const bEnd = parseInt(b.endTime.split(":")[0]!) * 60 + parseInt(b.endTime.split(":")[1]!);

      if (aStart < bEnd && aEnd > bStart) {
        const normA = daysA.map((d: string) => d.toLowerCase().trim());
        const normB = daysB.map((d: string) => d.toLowerCase().trim());
        const sharedDays = normA.filter((d: string) => normB.includes(d));
        if (sharedDays.length > 0) {
          conflicts.push({
            classA: i,
            classB: j,
            day: sharedDays[0]!,
            message: `"${a.subject || `Class ${i + 1}`}" overlaps with "${b.subject || `Class ${j + 1}`}" on ${sharedDays[0]} (${a.startTime}-${a.endTime} vs ${b.startTime}-${b.endTime})`,
          });
        }
      }
    }
  }

  return conflicts;
}

/* ----------------------------------------------------------------------
   Complete validation pipeline
   ---------------------------------------------------------------------- */

export interface ValidationResult {
  consistency: { issues: ConsistencyIssue[]; score: number };
  conflicts: Conflict[];
  hasConflicts: boolean;
  hasConsistencyIssues: boolean;
}

export function validateSchedule(data: Record<string, unknown>): ValidationResult {
  const consistency = checkScheduleConsistency(data as Parameters<typeof checkScheduleConsistency>[0]);
  const conflicts = detectConflicts(data as Parameters<typeof detectConflicts>[0]);

  return {
    consistency,
    conflicts,
    hasConflicts: conflicts.length > 0,
    hasConsistencyIssues: consistency.issues.length > 0,
  };
}

export { VISION_MODELS, VALIDATION_MODELS, CONFIDENCE_THRESHOLD };
