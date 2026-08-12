import { PipelineLogger } from "@/server/lib/structured-logger";
import { incrementUsage, USAGE_SERVICES } from "@/server/lib/usage-counter";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/** Ordered list of OpenRouter API keys tried on failure (primary → backup). */
const OPENROUTER_KEYS = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2,
].filter((k): k is string => !!k && k.trim().length > 0);

const GENERATION_MODELS = [
  "google/gemma-4-26b-a4b-it:free",                        // Primary (fast, accurate)
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",    // Fallback (only on errors)
];

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface FlashcardGenerationResult {
  cards: GeneratedFlashcard[];
  model: string;
}

const FLASHCARD_PROMPT = `You are a study helper for Filipino students (high school and college). Read the study material below and turn its KEY CONCEPTS into Q&A flashcards.

Rules:
- One concept per card. The FRONT is a short question or prompt ("What is photosynthesis?", "Define mitosis"). The BACK is a complete but concise answer (1-3 sentences, no filler).
- Cover the most important and testable ideas: definitions, formulas, dates, people, causes/effects, step-by-step processes, comparisons.
- 8 to 20 flashcards depending on material size.
- Plain text only — no markdown, no LaTeX delimiters.
- Return ONLY valid JSON, no extra text:
{"flashcards":[{"front":"...","back":"..."}]}`;

async function callOpenRouter(
  model: string,
  messages: unknown[],
  apiKey = process.env.OPENROUTER_API_KEY,
): Promise<unknown> {
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
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    const snippet = bodyText.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `AI provider returned a non-JSON response (status ${response.status}): ${snippet || "(empty)"}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `AI API error: ${response.status} - ${
        (data as { error?: { message?: string } })?.error?.message || "Unknown"
      }`
    );
  }

  // Track which OpenRouter key served this call (cap dashboard).
  const which =
    apiKey === process.env.OPENROUTER_API_KEY ? "OPENROUTER_1" : "OPENROUTER_2";
  void incrementUsage(USAGE_SERVICES[which]);

  return data;
}

function parseFlashcardJson(data: unknown): GeneratedFlashcard[] {
  const obj = data as { choices?: { message: { content: string } }[] };
  const text = obj.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from AI");

  const jsonMatch = String(text).match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");

  const parsed = JSON.parse(jsonMatch[0]) as { flashcards?: unknown };
  const cards = Array.isArray(parsed.flashcards) ? parsed.flashcards : null;
  if (!cards) throw new Error("AI response missing flashcards array");

  const cleaned = cards
    .map((c) => {
      const card = c as { front?: unknown; back?: unknown };
      return {
        front: typeof card.front === "string" ? card.front.trim().slice(0, 500) : "",
        back: typeof card.back === "string" ? card.back.trim().slice(0, 2000) : "",
      };
    })
    .filter((c) => c.front && c.back);

  if (cleaned.length === 0) throw new Error("AI returned no usable flashcards");
  return cleaned;
}

/**
 * Google Gemini (free tier: ~1,500 requests/day, vision included).
 * Used FIRST when GEMINI_API_KEY is set — OpenRouter stays as fallback so
 * the 50 free-requests/day OpenRouter cap can never hard-block generation.
 */
async function callGemini(
  parts: { text: string; image?: { data: string; mimeType: string } }
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contentParts: Record<string, unknown>[] = [];
  if (parts.image) {
    contentParts.push({
      inline_data: { mime_type: parts.image.mimeType, data: parts.image.data },
    });
  }
  contentParts.push({ text: parts.text });

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: FLASHCARD_PROMPT }] },
      contents: [{ role: "user", parts: contentParts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  const bodyText = await response.text();
  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`Gemini returned a non-JSON response (status ${response.status})`);
  }
  if (!response.ok) {
    throw new Error(
      `Gemini API error: ${response.status} - ${
        (data as { error?: { message?: string } })?.error?.message || "Unknown"
      }`
    );
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.[0]?.text;

  // Track Gemini daily usage (cap dashboard).
  void incrementUsage(USAGE_SERVICES.GEMINI);

  return text ?? null;
}

function parseGeminiFlashcards(text: string | null): GeneratedFlashcard[] {
  if (!text) throw new Error("No response from Gemini");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");
  const parsed = JSON.parse(jsonMatch[0]) as { flashcards?: unknown };
  const cards = Array.isArray(parsed.flashcards) ? parsed.flashcards : null;
  if (!cards) throw new Error("Gemini response missing flashcards array");

  const cleaned = cards
    .map((c) => {
      const card = c as { front?: unknown; back?: unknown };
      return {
        front: typeof card.front === "string" ? card.front.trim().slice(0, 500) : "",
        back: typeof card.back === "string" ? card.back.trim().slice(0, 2000) : "",
      };
    })
    .filter((c) => c.front && c.back);

  if (cleaned.length === 0) throw new Error("Gemini returned no usable flashcards");
  return cleaned;
}

async function generateWithProviders(parts: {
  text: string;
  image?: { data: string; mimeType: string };
}): Promise<FlashcardGenerationResult> {
  // Gemini primary (free tier ~1,500 requests/day, vision included) so the
  // OpenRouter free-model daily cap can never hard-block generation.
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGemini(parts);
      const cards = parseGeminiFlashcards(text);
      PipelineLogger.info("flashcards", "Generated via Gemini", { cards: cards.length });
      return { cards, model: "gemini-flash-latest" };
    } catch (err) {
      PipelineLogger.warn("flashcards", "Gemini failed, falling back to OpenRouter", {}, err);
    }
  }

  if (OPENROUTER_KEYS.length === 0) {
    throw new Error("No OpenRouter API key configured");
  }

  const openRouterMessages = parts.image
    ? [
        {
          role: "system",
          content: FLASHCARD_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${parts.image.mimeType};base64,${parts.image.data}`,
              },
            },
            { type: "text", text: parts.text },
          ],
        },
      ]
    : [
        {
          role: "system",
          content: FLASHCARD_PROMPT,
        },
        { role: "user", content: parts.text },
      ];

  // Try each OpenRouter key in order (primary → backup).
  for (let keyIndex = 0; keyIndex < OPENROUTER_KEYS.length; keyIndex++) {
    const apiKey = OPENROUTER_KEYS[keyIndex]!;
    for (const model of GENERATION_MODELS) {
      try {
        const data = await callOpenRouter(model, openRouterMessages, apiKey);
        const cards = parseFlashcardJson(data);
        PipelineLogger.info("flashcards", "Generated", {
          model,
          key: keyIndex + 1,
          cards: cards.length,
        });
        return { cards, model };
      } catch (err) {
        PipelineLogger.warn("flashcards", `Model ${model} (key ${keyIndex + 1}) failed`, {}, err);
      }
    }
    PipelineLogger.warn("flashcards", `OpenRouter key ${keyIndex + 1} exhausted, trying next key`);
  }

  throw new Error("Flashcard generation failed (all OpenRouter keys and Gemini)");
}

/** Generate Q&A flashcards from plain text (PDF text or pasted notes). */
export async function generateFlashcardsFromText(
  text: string,
  title: string
): Promise<FlashcardGenerationResult> {
  const material = text.slice(0, 120_000).trim();
  if (!material) throw new Error("No text to generate from");

  return generateWithProviders({
    text: `Study material (${title}):\n\n${material}`,
  });
}

/** Generate Q&A flashcards from an image (notes / handout photo). */
export async function generateFlashcardsFromImage(
  base64: string,
  contentType: string,
  title: string
): Promise<FlashcardGenerationResult> {
  return generateWithProviders({
    text: `This image is study material titled "${title}". Create flashcards from its content.`,
    image: { data: base64, mimeType: contentType },
  });
}
