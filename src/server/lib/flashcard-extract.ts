import { GEMINI_KEYS, geminiServiceFor } from "./gemini-keys";
import { generateFlashcardsViaOpenRouter } from "./openrouter-flashcard";
import { incrementUsage } from "./usage-counter";

const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

const FLASHCARD_GENERATION_PROMPT = `You are an expert flashcard creator for students. Generate high-quality flashcards from the provided study material.

Rules:
1. Questions must be based ONLY on the uploaded study material. Do NOT invent facts not in the source.
2. Avoid duplicate questions.
3. Keep questions clear, concise, and study-friendly.
4. Answers should be concise but sufficient for studying.
5. Prioritize important concepts, definitions, processes, formulas, examples, and facts.
6. If a topic is provided, focus primarily on that topic.
7. Generate the requested number of cards when enough source material exists.
8. If there is not enough information, generate fewer cards rather than hallucinating.

Return ONLY valid JSON with this structure:
{
  "cards": [
    {
      "question": "What is a variable?",
      "answer": "A variable is a named storage location in memory that holds a value which can be changed during program execution."
    }
  ]
}`;

const FLASHCARD_GENERATION_WITH_TOPIC_PROMPT = `You are an expert flashcard creator for students. Generate high-quality flashcards from the provided study material, focusing specifically on the given topic.

Topic to focus on: {TOPIC}

Rules:
1. Questions must be based ONLY on the uploaded study material. Do NOT invent facts not in the source.
2. Focus PRIMARILY on the specified topic. Only include other content if directly relevant.
3. Avoid duplicate questions.
4. Keep questions clear, concise, and study-friendly.
5. Answers should be concise but sufficient for studying.
6. Prioritize important concepts, definitions, processes, formulas, examples, and facts related to the topic.
7. Generate the requested number of cards when enough source material exists on the topic.
8. If there is not enough information on the topic, generate fewer cards rather than hallucinating or filling with unrelated content.

Return ONLY valid JSON with this structure:
{
  "cards": [
    {
      "question": "What is a variable?",
      "answer": "A variable is a named storage location in memory that holds a value which can be changed during program execution."
    }
  ]
}`;

export type FlashcardGenerationResult = {
  cards: Array<{ question: string; answer: string }>;
};

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 3000, 5000, 10000, 15000];
const KEY_RETRY_DELAY = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateFlashcardResult(raw: Record<string, unknown>): FlashcardGenerationResult {
  const cards = Array.isArray(raw.cards) ? raw.cards : [];

  const normalizedCards = cards
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      question: typeof c.question === "string" ? c.question.trim() : "",
      answer: typeof c.answer === "string" ? c.answer.trim() : "",
    }))
    .filter((c) => c.question.length > 0 && c.answer.length > 0);

  const seen = new Set<string>();
  const deduped = normalizedCards.filter((c) => {
    const key = c.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { cards: deduped };
}

function isRetryableError(status: number): boolean {
  return status === 503 || status === 429;
}

async function callGeminiFlashcard(
  parts: Record<string, unknown>[],
  prompt: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) throw new Error("No Gemini API key configured");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    let response: Response;
    try {
      response = await fetch(`${GEMINI_GENERATE_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
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
      console.error(`[FLASHCARD_AI] Gemini error ${status} (attempt ${attempt + 1}/${MAX_RETRIES}):`, msg);

      if (isRetryableError(status) && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt] || 15000;
        console.log(`[FLASHCARD_AI] Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      throw new Error(`Gemini API error: ${status} - ${msg}`);
    }

    const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  }

  throw new Error("Max retries exceeded for Gemini API");
}

async function tryGeminiKeys(
  parts: Record<string, unknown>[],
  prompt: string,
): Promise<FlashcardGenerationResult> {
  const errors: Error[] = [];
  for (const apiKey of GEMINI_KEYS) {
    try {
      const raw = await callGeminiFlashcard(parts, prompt, apiKey);
      return validateFlashcardResult(raw);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[FLASHCARD_AI] Gemini key failed, trying next (${GEMINI_KEYS.indexOf(apiKey) + 1}/${GEMINI_KEYS.length}):`, error.message);
      errors.push(error);
      await sleep(KEY_RETRY_DELAY);
    }
  }
  const lastError = errors[errors.length - 1];
  throw new Error(`All ${GEMINI_KEYS.length} Gemini keys failed for flashcard generation. Last error: ${lastError?.message}`);
}

/**
 * Generate flashcards from text content (PDF extracted text)
 */
export async function generateFlashcardsFromText(
  textContent: string,
  count: number,
  topic?: string,
): Promise<FlashcardGenerationResult> {
  if (!textContent || textContent.trim().length < 50) {
    throw new Error("Document contains insufficient content for flashcard generation");
  }

  // Truncate to avoid token limits (leave room for prompt + response)
  const truncated = textContent.slice(0, 25000);
  
  const prompt = topic
    ? FLASHCARD_GENERATION_WITH_TOPIC_PROMPT.replace("{TOPIC}", topic)
    : FLASHCARD_GENERATION_PROMPT;
  
  const finalPrompt = `${prompt}\n\nGenerate ${count} flashcards.\n\nStudy material:\n${truncated}`;

  // Gemini first (multi-key rotation), OpenRouter as fallback
  try {
    return await tryGeminiKeys([{ text: truncated }], finalPrompt);
  } catch (err) {
    console.error("[FLASHCARD_AI] All Gemini keys failed — falling back to OpenRouter:", err);
    try {
      return await generateFlashcardsViaOpenRouter(truncated);
    } catch (orErr) {
      console.error("[FLASHCARD_AI] OpenRouter fallback failed:", orErr);
      throw new Error("Generation failed. Please try again later.");
    }
  }
}

/**
 * Generate flashcards from an image (base64) using Gemini vision
 */
export async function generateFlashcardsFromImage(
  base64Data: string,
  mimeType: string,
  count: number,
  topic?: string,
): Promise<FlashcardGenerationResult> {
  const prompt = topic
    ? FLASHCARD_GENERATION_WITH_TOPIC_PROMPT.replace("{TOPIC}", topic)
    : FLASHCARD_GENERATION_PROMPT;

  const finalPrompt = `${prompt}\n\nGenerate ${count} flashcards.`;

  // Gemini vision first (multi-key rotation), OpenRouter as fallback
  try {
    return await tryGeminiKeys(
      [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: "Generate flashcards from this image exactly as the system instructions describe. Return ONLY valid JSON." },
      ],
      finalPrompt,
    );
  } catch (err) {
    console.error("[FLASHCARD_AI] Gemini vision failed:", err);
    throw new Error("AI flashcard generation failed. Please try again later.");
  }
}