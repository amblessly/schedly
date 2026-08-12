"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getLimitsStatsAction } from "../actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Gauge, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LimitsStat = {
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1_024) return `${(n / 1_024).toFixed(1)} KB`;
  return `${n} B`;
}

function StatBar({ stat }: { stat: LimitsStat }) {
  const isBandwidth = stat.unit === "bandwidth";
  const usage = isBandwidth ? stat.bytesUsed ?? stat.usage : stat.usage;
  const limit = isBandwidth ? stat.bytesLimit ?? stat.limit : stat.limit;
  const pct = limit > 0 ? Math.min(100, (usage / limit) * 100) : 100;

  const colors = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    critical: "bg-red-500",
  } as const;

  const badge = {
    ok: {
      text: "OK",
      icon: CheckCircle,
      cls: "bg-emerald-500/10 text-emerald-600",
    },
    warn: {
      text: "70%+",
      icon: Gauge,
      cls: "bg-amber-500/10 text-amber-600",
    },
    critical: {
      text: "90%+",
      icon: AlertTriangle,
      cls: "bg-red-500/10 text-red-600",
    },
  } as const;

  const b = badge[stat.color];
  const usageLabel = isBandwidth ? formatBytes(usage) : formatNumber(usage);
  const limitLabel = isBandwidth ? formatBytes(limit) : formatNumber(limit);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{stat.name}</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                b.cls
              )}
            >
              <b.icon className="h-3 w-3" />
              {b.text}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold text-foreground">
            {usageLabel}
            <span className="text-muted-foreground"> / {limitLabel}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{pct.toFixed(1)}%</div>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", colors[stat.color])}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      {stat.realtime && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {stat.realtime.isFreeTier && (
            <span>Free tier key — 50 req/day soft limit</span>
          )}
          {stat.realtime.limit != null && (
            <span>
              Provider limit: {formatNumber(stat.realtime.usage)}/
              {formatNumber(stat.realtime.limit)}
              {stat.realtime.reset ? ` (resets ${new Date(stat.realtime.reset).toLocaleTimeString()})` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLimitsPage() {
  const { user } = useAuth();
  const isAdmin = Boolean((user as Record<string, unknown> | null)?.isAdmin);
  const [stats, setStats] = useState<LimitsStat[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getLimitsStatsAction();
        if (cancelled) return;
        setStats(res.stats);
        setDate(res.date);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load limits");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center text-sm text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Service Limits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily usage caps for {date || "today"}. These reset every 24 hours.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && stats && (
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-primary" />
                Today&apos;s Usage
              </CardTitle>
              <CardDescription className="text-xs">
                {date} · resets at midnight
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {stats.map((stat) => (
                <StatBar key={stat.id} stat={stat} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !stats && !error && (
        <p className="text-sm text-muted-foreground">No data available yet.</p>
      )}

      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Tips</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>
            OpenRouter free keys share a ~50 req/day limit — the dashboard uses both keys so calls
            alternate automatically.
          </li>
          <li>B2 free tier: 1 GB/day download bandwidth + 2,500 Class B &amp; C transactions/day.</li>
          <li>When a cap is at 90%+ it turns red — consider slowing down or adding a payment method.</li>
        </ul>
      </div>
    </div>
  );
}
