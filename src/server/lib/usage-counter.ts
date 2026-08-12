import { db } from "@/server/db/client";

/**
 * Daily usage counters for external-service caps (OpenRouter keys, Gemini,
 * QStash, Backblaze B2). Tracked so the admin Limits dashboard can show how
 * close each cap is to being full. Fire-and-forget: counter failures never
 * fail the underlying operation.
 */

export const USAGE_SERVICES = {
  OPENROUTER_1: "openrouter_1",
  OPENROUTER_2: "openrouter_2",
  GEMINI: "gemini",
  QSTASH: "qstash",
  B2_UPLOAD: "b2_upload",
  B2_DOWNLOAD: "b2_download",
} as const;

export type UsageService = (typeof USAGE_SERVICES)[keyof typeof USAGE_SERVICES];

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Increment today's counter for a service (1 unit by default). */
export async function incrementUsage(
  service: UsageService,
  opts: { count?: number; bytes?: number } = {},
): Promise<void> {
  try {
    const date = todayKey();
    const count = opts.count ?? 1;
    const bytes = opts.bytes ?? 0;
    await db.usageCounter.upsert({
      where: { service_date: { service, date } },
      create: { service, date, count, bytes },
      update: {
        count: { increment: count },
        ...(bytes > 0 ? { bytes: { increment: bytes } } : {}),
      },
    });
  } catch (err) {
    console.error(`[USAGE] failed to increment ${service}:`, err);
  }
}

export type UsageSnapshot = {
  service: string;
  date: string;
  count: number;
  bytes: number;
};

/** All counter rows for a given day (defaults to today). */
export async function getUsage(date = todayKey()): Promise<UsageSnapshot[]> {
  const rows = await db.usageCounter.findMany({
    where: { date },
    select: { service: true, date: true, count: true, bytes: true },
  });
  return rows.map((r) => ({
    service: r.service,
    date: r.date,
    count: r.count,
    bytes: Number(r.bytes),
  }));
}
