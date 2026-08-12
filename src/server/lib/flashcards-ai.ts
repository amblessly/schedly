import { PipelineLogger } from "@/server/lib/structured-logger";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

async function callOpenRouter(model: string, messages: unknown[]): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

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

/** Generate Q&A flashcards from plain text (PDF text or pasted notes). */
export async function generateFlashcardsFromText(
  text: string,
  title: string
): Promise<FlashcardGenerationResult> {
  const material = text.slice(0, 120_000).trim();
  if (!material) throw new Error("No text to generate from");

  const messages = [
    {
      role: "system",
      content: FLASHCARD_PROMPT,
    },
    {
      role: "user",
      content: `Study material (${title}):\n\n${material}`,
    },
  ];

  let lastError: unknown;
  for (const model of GENERATION_MODELS) {
    try {
      const data = await callOpenRouter(model, messages);
      const cards = parseFlashcardJson(data);
      PipelineLogger.info("flashcards", "Generated", {
        model,
        cards: cards.length,
      });
      return { cards, model };
    } catch (err) {
      lastError = err;
      PipelineLogger.warn("flashcards", `Model ${model} failed`, {}, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Flashcard generation failed");
}

/** Generate Q&A flashcards from an image (notes / handout photo). */
export async function generateFlashcardsFromImage(
  base64: string,
  contentType: string,
  title: string
): Promise<FlashcardGenerationResult> {
  const messages = [
    {
      role: "system",
      content: FLASHCARD_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${contentType};base64,${base64}` },
        },
        {
          type: "text",
          text: `This image is study material titled "${title}". Create flashcards from its content.`,
        },
      ],
    },
  ];

  let lastError: unknown;
  for (const model of GENERATION_MODELS) {
    try {
      const data = await callOpenRouter(model, messages);
      const cards = parseFlashcardJson(data);
      PipelineLogger.info("flashcards", "Generated from image", {
        model,
        cards: cards.length,
      });
      return { cards, model };
    } catch (err) {
      lastError = err;
      PipelineLogger.warn("flashcards", `Model ${model} failed (image)`, {}, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Flashcard generation failed");
}
