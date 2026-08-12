import { getUsage, getLimitSnapshots, todayKey } from "@/server/lib/usage-counter";

export type LimitsService = "openrouter_1" | "openrouter_2" | "gemini" | "qstash" | "b2_upload" | "b2_download";

export type LimitsStat = {
  id: string;
  name: string;
  description: string;
  usage: number;
  limit: number;
  bytesUsed?: number;
  bytesLimit?: number;
  unit: "requests" | "transactions" | "bandwidth";
  color: "ok" | "warn" | "critical";
  realtime?: {
    usage: number;
    limit: number | null;
    reset: string | null;
    remaining: number | null;
    isFreeTier: boolean;
    label: string;
  };
};

/** Request/day caps for each external service (free tier unless noted). */
const CAPS: Record<LimitsService, { name: string; description: string; limit: number; unit: "requests" | "transactions" }> = {
  openrouter_1: { name: "OpenRouter Key 1", description: "AI extraction + flashcard generation", limit: 50, unit: "requests" },
  openrouter_2: { name: "OpenRouter Key 2", description: "AI extraction + flashcard generation (backup key)", limit: 50, unit: "requests" },
  gemini: { name: "Gemini Flash", description: "Fallback AI model for extraction", limit: 1500, unit: "requests" },
  qstash: { name: "QStash Messages", description: "Scheduled class reminders + push delivery", limit: 1000, unit: "transactions" },
  b2_upload: { name: "B2 Uploads (Class C)", description: "Image uploads to Backblaze", limit: 2500, unit: "transactions" },
  b2_download: { name: "B2 Downloads (Class B)", description: "Image downloads / previews", limit: 2500, unit: "transactions" },
};

/** Backblaze free tier: 1 GB/day download bandwidth. */
const B2_BANDWIDTH_LIMIT_BYTES = 1_000_000_000;

/** Real-time per-key usage/limit from OpenRouter's key endpoint. */
async function fetchOpenRouterInfo(
  apiKey: string,
): Promise<LimitsStat["realtime"] | undefined> {
  if (!apiKey) return undefined;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      data?: {
        label?: string;
        usage_daily?: number;
        limit?: number | null;
        limit_reset?: string | null;
        limit_remaining?: number | null;
        is_free_tier?: boolean;
      };
    };
    const d = json.data;
    if (!d) return undefined;
    return {
      usage: d.usage_daily ?? 0,
      limit: d.limit ?? null,
      reset: d.limit_reset ?? null,
      remaining: d.limit_remaining ?? null,
      isFreeTier: d.is_free_tier ?? true,
      label: d.label ?? "",
    };
  } catch {
    return undefined;
  }
}

function colorFor(usage: number, limit: number): LimitsStat["color"] {
  const pct = limit > 0 ? usage / limit : 1;
  if (pct >= 0.9) return "critical";
  if (pct >= 0.7) return "warn";
  return "ok";
}

export async function getLimitsStats() {
  const usage = await getUsage(todayKey());
  const byService = new Map(usage.map((u) => [u.service, u]));

  const [or1, or2, snapshots] = await Promise.all([
    fetchOpenRouterInfo(process.env.OPENROUTER_API_KEY ?? ""),
    fetchOpenRouterInfo(process.env.OPENROUTER_API_KEY_2 ?? ""),
    getLimitSnapshots(),
  ]);

  const stats: LimitsStat[] = Object.entries(CAPS).map(([id, cap]) => {
    const row = byService.get(id);
    const count = row?.count ?? 0;

    const keyInfo = id === "openrouter_1" ? or1 : id === "openrouter_2" ? or2 : undefined;
    const snap =
      id === "openrouter_1"
        ? snapshots.openrouter_1
        : id === "openrouter_2"
          ? snapshots.openrouter_2
          : undefined;

    // For OpenRouter keys the provider-side x-ratelimit snapshot is the
    // authoritative real-time number (it also reflects failed attempts, which
    // consume the daily cap); the local request counter is only a fallback
    // until the first provider response has been captured.
    const usage =
      snap?.limit != null ? Math.max(0, snap.limit - (snap.remaining ?? snap.limit)) : count;
    const limit = snap?.limit ?? cap.limit;

    const realtime: LimitsStat["realtime"] = snap
      ? {
          usage,
          limit: snap.limit,
          reset: snap.resetAt ? snap.resetAt.toISOString() : (keyInfo?.reset ?? null),
          remaining: snap.remaining,
          isFreeTier: keyInfo?.isFreeTier ?? true,
          label: keyInfo?.label ?? "",
        }
      : keyInfo
        ? {
            usage: keyInfo.usage,
            limit: keyInfo.limit,
            reset: keyInfo.reset,
            remaining: keyInfo.remaining,
            isFreeTier: keyInfo.isFreeTier,
            label: keyInfo.label,
          }
        : undefined;

    return {
      id,
      name: cap.name,
      description: cap.description,
      usage,
      limit,
      unit: cap.unit,
      color: colorFor(usage, limit),
      realtime,
    };
  });

  // B2 download bandwidth (1 GB/day free tier).
  const b2DownBytes = byService.get("b2_download")?.bytes ?? 0;
  stats.push({
    id: "b2_bandwidth",
    name: "B2 Download Bandwidth",
    description: "1 GB/day free download bandwidth",
    usage: b2DownBytes,
    limit: B2_BANDWIDTH_LIMIT_BYTES,
    bytesUsed: b2DownBytes,
    bytesLimit: B2_BANDWIDTH_LIMIT_BYTES,
    unit: "bandwidth",
    color: colorFor(b2DownBytes, B2_BANDWIDTH_LIMIT_BYTES),
  });

  return { stats, date: todayKey() };
}
