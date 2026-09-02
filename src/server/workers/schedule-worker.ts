import type { Job } from "bullmq";
import { uploadRepository } from "@/server/repositories/upload.repository";
import { ocrService } from "@/server/services/ocr.service";
import { aiService } from "@/server/services/ai.service";
import { PipelineLogger } from "@/server/lib/structured-logger";

export interface ScheduleJobData {
  uploadId: string;
  userId: string;
  imageUrl: string;
  preloaded?: { data: Uint8Array | Buffer; mimeType: string };
  useAi?: boolean;
}

export interface ScheduleJobResult {
  uploadId: string;
  status: "completed" | "failed";
  error?: string;
  classesCount?: number;
}

function hasAiProvider(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.BYTEZ_API_KEY,
  );
}

export async function processScheduleData(
  data: ScheduleJobData,
  jobId?: string,
): Promise<ScheduleJobResult> {
  const { uploadId, imageUrl, preloaded, useAi } = data;

  console.log(`[SCHEDULE_WORKER] Processing job ${jobId || uploadId} for upload ${uploadId}`);

  try {
    await uploadRepository.updateStatus(uploadId, "processing");

    const wantsAi = useAi ?? hasAiProvider();
    let result;
    try {
      result = wantsAi
        ? await aiService.processImage(imageUrl, preloaded)
        : await ocrService.processImage(imageUrl, preloaded);

      if (!result.success && wantsAi) {
        PipelineLogger.warn("schedule-worker", "AI failed — falling back to OCR", { uploadId });
        result = await ocrService.processImage(imageUrl, preloaded);
      }
    } catch (primaryErr) {
      if (wantsAi) {
        PipelineLogger.warn("schedule-worker", "AI exception — falling back to OCR", { uploadId }, primaryErr as Error);
        result = await ocrService.processImage(imageUrl, preloaded);
      } else {
        throw primaryErr;
      }
    }

    if (!result.success) {
      await uploadRepository.updateStatus(uploadId, "failed", result.error.message);
      return { uploadId, status: "failed", error: result.error.message };
    }

    const aiResult = JSON.parse(JSON.stringify(result.data));
    await uploadRepository.updateAiResult(uploadId, aiResult, "completed");

    const classesCount = (aiResult as { classes?: unknown[] })?.classes?.length ?? 0;
    console.log(`[SCHEDULE_WORKER] Job ${jobId || uploadId} completed with ${classesCount} classes`);
    return { uploadId, status: "completed", classesCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SCHEDULE_WORKER] Job ${jobId || uploadId} failed:`, errorMessage);
    try {
      await uploadRepository.updateStatus(uploadId, "failed", errorMessage);
    } catch (dbErr) {
      console.error(`[SCHEDULE_WORKER] Failed to mark upload ${uploadId} as failed:`, dbErr);
    }
    return { uploadId, status: "failed", error: errorMessage };
  }
}

export async function processScheduleJob(
  job: Job<ScheduleJobData>,
): Promise<ScheduleJobResult> {
  return processScheduleData(job.data, job.id);
}

export const scheduleWorkerConcurrency = 3;
export const scheduleWorkerLimiter = { max: 10, duration: 1000 };