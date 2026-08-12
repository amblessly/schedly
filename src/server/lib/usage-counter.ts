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
  OPENROUTER_3: "openrouter_3",
  OPENROUTER_4: "openrouter_4",
  OPENROUTER_5: "openrouter_5",
  OPENROUTER_6: "openrouter_6",
  OPENROUTER_7: "openrouter_7",
  OPENROUTER_8: "openrouter_8",
  OPENROUTER_9: "openrouter_9",
  OPENROUTER_10: "openrouter_10",
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

export type LimitSnapshotValue = {
  remaining: number | null;
  limit: number | null;
  resetAt: Date | null;
};

/**
 * Persist the provider-side rate-limit snapshot from response headers
 * (e.g. OpenRouter `x-ratelimit-remaining/limit/reset`). Fire-and-forget:
 * snapshot failures never fail the underlying operation.
 */
export async function saveLimitSnapshot(
  service: UsageService,
  snapshot: { remaining: number | null; limit: number | null; resetAt: string | null },
): Promise<void> {
  try {
    const toInt = (v: number | null): number | null =>
      v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
    const remaining = toInt(snapshot.remaining);
    const limit = toInt(snapshot.limit);
    const resetAt =
      snapshot.resetAt && !Number.isNaN(Number(snapshot.resetAt))
        ? new Date(Number(snapshot.resetAt))
        : null;
    if (limit == null && remaining == null && resetAt == null) return;
    await db.limitSnapshot.upsert({
      where: { service },
      create: { service, remaining, limit, resetAt },
      update: { remaining, limit, resetAt },
    });
  } catch (err) {
    console.error(`[USAGE] failed to save limit snapshot for ${service}:`, err);
  }
}

/** Latest persisted limit snapshot per service. */
export async function getLimitSnapshots(): Promise<Record<string, LimitSnapshotValue>> {
  try {
    const rows = await db.limitSnapshot.findMany();
    const map: Record<string, LimitSnapshotValue> = {};
    for (const r of rows) {
      map[r.service] = { remaining: r.remaining, limit: r.limit, resetAt: r.resetAt };
    }
    return map;
  } catch (err) {
    console.error("[USAGE] failed to read limit snapshots:", err);
    return {};
  }
}
