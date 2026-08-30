import { GEMINI_KEYS, geminiServiceFor } from "./gemini-keys";
import { OPENROUTER_KEYS, openRouterServiceFor, isOpenRouterEnabled } from "./openrouter-keys";
import { incrementUsage } from "./usage-counter";

const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const SYLLABUS_EXTRACTION_PROMPT = `You are an academic syllabus extraction engine.

Extract only information explicitly present in the provided syllabus.

Return valid JSON matching the required schema.

Do not invent:
- dates
- assignments
- instructors
- course information
- grades
- requirements

If information is missing, return null.

Preserve uncertainty.

Distinguish:
- exact dates (e.g., "September 15, 2026")
- date ranges (e.g., "September 10-15")
- week-based dates (e.g., "Week 5")
- unspecified dates

Extract academic requirements including assignments, activities, quizzes, exams, projects, presentations, laboratory work, reports, research, practical exams, submissions, and other meaningful academic requirements.

Do not turn general weekly topics into assignments unless the syllabus explicitly identifies them as academic requirements.
Do not treat every topic/chapter as a task.
Do not invent a deadline from a week number.
If a requirement appears multiple times, deduplicate it.

Return ONLY valid JSON with this structure:
{
  "course": {
    "name": null,
    "code": null,
    "section": null,
    "instructor": null,
    "email": null,
    "department": null,
    "semester": null,
    "school_year": null,
    "units": null
  },
  "requirements": [
    {
      "title": "",
      "type": "assignment",
      "description": null,
      "date": null,
      "start_date": null,
      "end_date": null,
      "week": null,
      "date_precision": "exact",
      "source_text": null
    }
  ]
}`;

export type SyllabusCourse = {
  name: string | null;
  code: string | null;
  section: string | null;
  instructor: string | null;
  email: string | null;
  department: string | null;
  semester: string | null;
  school_year: string | null;
  units: string | null;
};

export type SyllabusRequirementRaw = {
  title: string;
  type: string;
  description: string | null;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  week: number | null;
  date_precision: string;
  source_text: string | null;
};

export type SyllabusExtractionResult = {
  course: SyllabusCourse;
  requirements: SyllabusRequirementRaw[];
};

const VALID_REQUIREMENT_TYPES = new Set([
  "assignment", "activity", "quiz", "exam", "project",
  "presentation", "laboratory", "report", "research",
  "recitation", "practical", "submission", "other",
]);

const VALID_DATE_PRECISIONS = new Set(["exact", "range", "week", "unspecified"]);

function normalizeRequirementType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return VALID_REQUIREMENT_TYPES.has(lower) ? lower : "other";
}

function normalizeDatePrecision(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return VALID_DATE_PRECISIONS.has(lower) ? lower : "unspecified";
}

function normalizeResult(raw: Record<string, unknown>): SyllabusExtractionResult {
  const course = (raw.course ?? {}) as Record<string, unknown>;
  const requirements = Array.isArray(raw.requirements) ? raw.requirements : [];

  const normalizedCourse: SyllabusCourse = {
    name: typeof course.name === "string" ? course.name : null,
    code: typeof course.code === "string" ? course.code : null,
    section: typeof course.section === "string" ? course.section : null,
    instructor: typeof course.instructor === "string" ? course.instructor : null,
    email: typeof course.email === "string" ? course.email : null,
    department: typeof course.department === "string" ? course.department : null,
    semester: typeof course.semester === "string" ? course.semester : null,
    school_year: typeof course.school_year === "string" ? course.school_year : null,
    units: typeof course.units === "string" ? course.units : null,
  };

  const normalizedRequirements: SyllabusRequirementRaw[] = requirements
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({
      title: typeof r.title === "string" ? r.title.trim() : "Untitled",
      type: normalizeRequirementType(typeof r.type === "string" ? r.type : "other"),
      description: typeof r.description === "string" ? r.description : null,
      date: typeof r.date === "string" ? r.date : null,
      start_date: typeof r.start_date === "string" ? r.start_date : null,
      end_date: typeof r.end_date === "string" ? r.end_date : null,
      week: typeof r.week === "number" ? r.week : null,
      date_precision: normalizeDatePrecision(typeof r.date_precision === "string" ? r.date_precision : "unspecified"),
      source_text: typeof r.source_text === "string" ? r.source_text : null,
    }));

  return { course: normalizedCourse, requirements: normalizedRequirements };
}

function dedupRequirements(result: SyllabusExtractionResult): SyllabusExtractionResult {
  const seen = new Set<string>();
  return {
    ...result,
    requirements: result.requirements.filter((r) => {
      const key = `${r.title.toLowerCase()}|${r.date ?? ""}|${r.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

async function callGeminiExtract(
  parts: Record<string, unknown>[],
  apiKey: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) throw new Error("No Gemini API key configured");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  let response: Response;
  try {
    response = await fetch(`${GEMINI_GENERATE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYLLABUS_EXTRACTION_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  void incrementUsage(geminiServiceFor(apiKey));

  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`Gemini returned non-JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const status = response.status;
    const msg = (data as { error?: { message?: string } })?.error?.message || "Unknown";
    console.error(`[SYLLABUS_AI] Gemini error ${status}:`, msg);
    throw new Error(`Gemini API error: ${status} - ${msg}`);
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

async function callOpenRouterExtract(
  textContent: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) throw new Error("No OpenRouter API key configured");

  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Schedly",
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          { role: "system", content: SYLLABUS_EXTRACTION_PROMPT },
          { role: "user", content: textContent },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`OpenRouter returned non-JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const status = response.status;
    const msg = (data as { error?: { message?: string } })?.error?.message || "Unknown";
    throw new Error(`OpenRouter API error: ${status} - ${msg}`);
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    .choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from OpenRouter");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${content.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

/**
 * Extract syllabus information from PDF text content using Gemini (primary)
 * or OpenRouter (fallback). Returns validated and normalized extraction result.
 */
export async function extractSyllabusFromText(
  textContent: string,
): Promise<SyllabusExtractionResult> {
  if (!textContent || textContent.trim().length < 20) {
    throw new Error("Document contains no readable syllabus content");
  }

  const truncated = textContent.slice(0, 15000);

  // Try Gemini keys first (key 1 -> ... -> key N), with up to 3 retries per key
  // on transient failures (429/503) before escalating.
  for (const apiKey of GEMINI_KEYS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = await callGeminiExtract(
          [{ text: truncated }],
          apiKey,
        );
        return dedupRequirements(normalizeResult(raw));
      } catch (err) {
        console.error(`[SYLLABUS_AI] Gemini key attempt ${attempt} failed:`, err);
        if (attempt < 3) await sleep(2000);
      }
    }
  }

  // Fallback to OpenRouter (all keys, key 1 -> ... -> key N)
  if ((await isOpenRouterEnabled()) && OPENROUTER_KEYS.length > 0) {
    for (const apiKey of OPENROUTER_KEYS) {
      try {
        const raw = await callOpenRouterExtract(truncated, apiKey);
        return dedupRequirements(normalizeResult(raw));
      } catch (err) {
        console.error("[SYLLABUS_AI] OpenRouter key failed:", err);
      }
    }
  } else {
    console.error("[SYLLABUS_AI] OpenRouter disabled or no keys configured");
  }

  throw new Error("All AI providers failed. Please try again later.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract syllabus from an image (base64) using Gemini vision.
 * Retries each Gemini key up to 3 times on transient errors.
 */
export async function extractSyllabusFromImage(
  base64Data: string,
  mimeType: string,
): Promise<SyllabusExtractionResult> {
  for (const apiKey of GEMINI_KEYS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = await callGeminiExtract(
          [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
          apiKey,
        );
        return dedupRequirements(normalizeResult(raw));
      } catch (err) {
        console.error(`[SYLLABUS_AI] Gemini vision attempt ${attempt} failed:`, err);
        if (attempt < 3) await sleep(2000);
      }
    }
  }

  throw new Error("AI extraction failed. Please try again later.");
}
