import type { Job } from "bullmq";
import { generateFlashcardsFromText, generateFlashcardsFromImage } from "../lib/flashcard-extract";
import { generateFlashcardsViaOpenRouter } from "../lib/openrouter-flashcard";
import { geminiCircuitBreaker } from "../lib/circuit-breaker";
import { db } from "../db/client";
import { extractPdfText } from "../lib/pdf-extract";

export interface FlashcardJobData {
  uploadId: string;
  userId: string;
  buffer?: Buffer;
  buffers?: Buffer[];
  fileName?: string;
  fileNames?: string[];
  fileType?: "pdf" | "image";
  fileTypes?: Array<"pdf" | "image">;
  mime?: string;
  mimes?: string[];
  combinedText?: string;
  imageBuffers?: Buffer[];
  imageMimes?: string[];
  deckName: string;
  subject?: string;
  topic?: string;
  cardCount: number;
}

export interface FlashcardJobResult {
  uploadId: string;
  cardsCount: number;
  status: "completed" | "failed";
  error?: string;
  provider?: string;
}

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

export async function processFlashcardData(
  data: FlashcardJobData,
  jobId?: string
): Promise<FlashcardJobResult> {
  const { uploadId, cardCount, topic } = data;

  console.log(`[FLASHCARD_WORKER] Processing job ${jobId || uploadId} for upload ${uploadId}`);

  if (geminiCircuitBreaker.isOpen()) {
    console.log(`[FLASHCARD_WORKER] Gemini circuit breaker open, using OpenRouter fallback`);
  }

  // Normalize inputs - support both single and multi-file
  const buffers: Buffer[] = data.buffers ?? (data.buffer ? [data.buffer] : []);
  const fileNames: string[] = data.fileNames ?? (data.fileName ? [data.fileName] : []);
  const fileTypes: Array<"pdf" | "image"> = data.fileTypes ?? (data.fileType ? [data.fileType] : []);
  const mimes: string[] = data.mimes ?? (data.mime ? [data.mime] : []);

  let combinedText: string = data.combinedText ?? "";
  const imageBuffers: Buffer[] = data.imageBuffers ?? [];
  const imageMimes: string[] = data.imageMimes ?? [];

  // If combinedText not provided, build it from PDF buffers
  if (!combinedText) {
    for (let i = 0; i < buffers.length; i++) {
      if (fileTypes[i] === "pdf") {
        try {
          const buf = buffers[i] as Buffer;
          const { text } = await extractPdfText(buf);
          if (text && text.trim().length >= 50) {
            combinedText += `\n\n--- ${fileNames[i] || `Document ${i + 1}`} ---\n${text}`;
          }
        } catch (err) {
          console.error(`[FLASHCARD_WORKER] PDF parse failed for ${fileNames[i]}:`, err);
        }
      } else {
        imageBuffers.push(buffers[i] as Buffer);
        imageMimes.push(mimes[i] || "image/jpeg");
      }
    }
  }

  let cards: Array<{ question: string; answer: string }> = [];
  let provider = "gemini";
  let geminiError: unknown = null;

  try {
    if (combinedText.trim().length >= 50 && imageBuffers.length === 0) {
      if (!geminiCircuitBreaker.isOpen()) {
        const result = await generateFlashcardsFromText(combinedText, cardCount, topic);
        cards = result.cards;
      } else {
        throw new Error("Gemini circuit breaker open");
      }
    } else if (imageBuffers.length > 0 && combinedText.trim().length < 50) {
      if (!geminiCircuitBreaker.isOpen()) {
        const firstImage = imageBuffers[0] as Buffer;
        const firstMime = imageMimes[0] || "image/jpeg";
        const base64 = firstImage.toString("base64");
        const mimeType = firstMime.startsWith("image/") ? firstMime : "image/jpeg";
        const result = await generateFlashcardsFromImage(base64, mimeType, cardCount, topic);
        cards = result.cards;
      } else {
        throw new Error("Gemini circuit breaker open");
      }
    } else if (imageBuffers.length > 0 && combinedText.trim().length >= 50) {
      if (!geminiCircuitBreaker.isOpen()) {
        const firstImage = imageBuffers[0] as Buffer;
        const firstMime = imageMimes[0] || "image/jpeg";
        const base64 = firstImage.toString("base64");
        const mimeType = firstMime.startsWith("image/") ? firstMime : "image/jpeg";
        const result = await generateFlashcardsFromImage(base64, mimeType, cardCount, topic);
        cards = result.cards;
      } else {
        throw new Error("Gemini circuit breaker open");
      }
    } else {
      await db.upload.update({
        where: { id: uploadId },
        data: { status: "failed", errorMessage: "Could not extract readable text from uploads" },
      });
      return { uploadId, cardsCount: 0, status: "failed", error: "Insufficient content" };
    }

    if (cards.length === 0) {
      throw new Error("No cards generated");
    }

    geminiCircuitBreaker.recordSuccess();
  } catch (err) {
    geminiError = err;
    console.error(`[FLASHCARD_WORKER] Gemini failed:`, err);
    geminiCircuitBreaker.recordFailure();

    console.log(`[FLASHCARD_WORKER] Falling back to OpenRouter...`);
    provider = "openrouter";

    try {
      const promptTemplate = topic
        ? FLASHCARD_GENERATION_WITH_TOPIC_PROMPT.replace("{TOPIC}", topic)
        : FLASHCARD_GENERATION_PROMPT;

      const truncated = combinedText.slice(0, 25000);
      const finalPrompt = `${promptTemplate}\n\nGenerate ${cardCount} flashcards.\n\nStudy material:\n${truncated}`;

      const result = await generateFlashcardsViaOpenRouter(finalPrompt);
      cards = result.cards;

      if (cards.length === 0) {
        throw new Error("No cards generated from OpenRouter");
      }
    } catch (openrouterError) {
      console.error(`[FLASHCARD_WORKER] OpenRouter fallback failed:`, openrouterError);
      const errorMessage = openrouterError instanceof Error ? openrouterError.message : "Unknown error";
      await db.upload.update({
        where: { id: uploadId },
        data: { status: "failed", errorMessage: `AI generation failed. Gemini: ${err instanceof Error ? err.message : "error"}. OpenRouter: ${errorMessage}` },
      });
      return { uploadId, cardsCount: 0, status: "failed", error: errorMessage, provider };
    }
  }

  await db.upload.update({
    where: { id: uploadId },
    data: {
      status: "completed",
      aiResult: { cards, provider } as unknown as Record<string, unknown>,
    },
  });

  return { uploadId, cardsCount: cards.length, status: "completed", provider };
}

export async function processFlashcardJob(
  job: Job<FlashcardJobData>
): Promise<FlashcardJobResult> {
  return processFlashcardData(job.data, job.id);
}
