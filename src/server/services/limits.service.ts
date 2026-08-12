import { getUsage, getLimitSnapshots, todayKey } from "@/server/lib/usage-counter";
import { OPENROUTER_KEYS, OPENROUTER_SERVICES } from "@/server/lib/openrouter-keys";

export type LimitsService = "openrouter" | "gemini" | "qstash" | "b2_upload" | "b2_download";

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

type Cap = { name: string; description: string; limit: number; unit: "requests" | "transactions" };

/** OpenRouter free-model cap per key (~50 req/day). Combined across all keys. */
const OPENROUTER_DEFAULT_LIMIT_PER_KEY = 50;

/** Request/day caps for each external service (free tier unless noted). */
const CAPS: Record<LimitsService, Cap> = {
  openrouter: {
    name: "OpenRouter (All Keys)",
    description: "AI extraction — combined across every configured key",
    limit: OPENROUTER_DEFAULT_LIMIT_PER_KEY,
    unit: "requests",
  },
  gemini: { name: "Gemini Flash", description: "Fallback AI model for extraction", limit: 1500, unit: "requests" },
  qstash: { name: "QStash Messages", description: "Scheduled class reminders + push delivery", limit: 10000, unit: "transactions" },
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

  const [orInfo, snapshots] = await Promise.all([
    Promise.all(OPENROUTER_KEYS.map((key) => fetchOpenRouterInfo(key))),
    getLimitSnapshots(),
  ]);

  // Per-key real-time usage, preferring the provider x-ratelimit snapshot
  // (authoritative — it also reflects failed attempts, which consume the daily
  // cap), then the /key endpoint, then the local request counter.
  const perKey = OPENROUTER_SERVICES.map((service, i) => {
    const snap = snapshots[service];
    const info = orInfo[i];
    const counted = byService.get(service)?.count ?? 0;
    return {
      usage:
        snap?.limit != null ? Math.max(0, snap.limit - (snap.remaining ?? snap.limit)) : (info?.usage ?? counted),
      limit: snap?.limit ?? info?.limit ?? OPENROUTER_DEFAULT_LIMIT_PER_KEY,
      remaining: snap?.remaining ?? info?.remaining ?? null,
      reset: snap?.resetAt ? snap.resetAt.toISOString() : (info?.reset ?? null),
      isFreeTier: info?.isFreeTier ?? true,
      label: info?.label ?? `Key ${i + 1}`,
    };
  });

  const orUsage = perKey.reduce((sum, k) => sum + k.usage, 0);
  const orLimit = perKey.reduce((sum, k) => sum + k.limit, 0);
  const knownRemaining = perKey.filter((k) => k.remaining != null);
  const orRemaining =
    knownRemaining.length === 0 ? null : knownRemaining.reduce((sum, k) => sum + (k.remaining ?? 0), 0);
  const orReset =
    perKey
      .map((k) => k.reset)
      .filter((r): r is string => !!r)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const orFree = perKey.every((k) => k.isFreeTier);
  const orLabel = perKey.map((k) => k.label).filter(Boolean).join(", ");

  const stats: LimitsStat[] = (Object.entries(CAPS) as [LimitsService, Cap][])
    .filter(([id]) => id !== "openrouter")
    .map(([id, cap]) => {
      const row = byService.get(id);
      const count = row?.count ?? 0;
      return {
        id,
        name: cap.name,
        description: cap.description,
        usage: count,
        limit: cap.limit,
        unit: cap.unit,
        color: colorFor(count, cap.limit),
      };
    });

  if (perKey.length > 0) {
    stats.unshift({
      id: "openrouter",
      name: CAPS.openrouter.name,
      description: `${CAPS.openrouter.description} (${perKey.length} key${perKey.length === 1 ? "" : "s"})`,
      usage: orUsage,
      limit: orLimit,
      unit: "requests",
      color: colorFor(orUsage, orLimit),
      realtime: {
        usage: orUsage,
        limit: orLimit,
        reset: orReset,
        remaining: orRemaining,
        isFreeTier: orFree,
        label: orLabel,
      },
    });
  }

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
