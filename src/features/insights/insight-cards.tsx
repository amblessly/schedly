"use client";

import {
  Flame,
  Feather,
  CalendarOff,
  Coffee,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ScheduleInsights,
  minutesToHoursLabel,
  formatClock,
  DAY_FULL,
  DAY_SHORT,
} from "./compute-insights";

const PACKED_WEEK_THRESHOLD_PCT = 60;

/**
 * Actionable insight rows, stacked one after another. Each row states a
 * label, a value, and the action it implies — no vanity numbers.
 */
function InsightRow({
  icon: Icon,
  label,
  value,
  action,
  accent = "text-primary",
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  action?: string;
  accent?: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="border-border/50 [--card-spacing:--spacing(5)]">
      <CardContent className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            tone === "warning" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-primary/10"
          }`}
        >
          <Icon className={`h-4 w-4 ${tone === "warning" ? "text-amber-500" : accent}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
        {action && (
          <p className="max-w-[45%] shrink-0 text-right text-xs leading-snug text-muted-foreground">
            {action}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Answers: "Which day should I NOT add plans to?" */
function HeaviestDayRow({ insights }: { insights: ScheduleInsights }) {
  if (!insights.busiestDay) return null;
  return (
    <InsightRow
      icon={Flame}
      accent="text-orange-500"
      label="Heaviest Day"
      value={`${DAY_FULL[insights.busiestDay.day] ?? insights.busiestDay.day} · ${minutesToHoursLabel(insights.busiestDay.busyMinutes)}`}
      action="Try to keep this day free of extra plans."
    />
  );
}

/** Answers: "When is the best time to schedule errands or appointments?" */
function LightestDayRow({ insights }: { insights: ScheduleInsights }) {
  if (!insights.lightestDay) return null;
  return (
    <InsightRow
      icon={Feather}
      accent="text-sky-500"
      label="Best Day for Plans"
      value={`${DAY_FULL[insights.lightestDay.day] ?? insights.lightestDay.day} · ${minutesToHoursLabel(insights.lightestDay.busyMinutes)}`}
      action="Schedule errands, appointments, or study time here."
    />
  );
}

/** Answers: "Which days are completely open?" */
function FreeDaysRow({ insights }: { insights: ScheduleInsights }) {
  if (insights.fullyFreeDays.length === 0) return null;
  return (
    <InsightRow
      icon={CalendarOff}
      accent="text-emerald-500"
      label="Completely Free"
      value={insights.fullyFreeDays.map((d) => DAY_SHORT[d] ?? d).join(", ")}
      action="No commitments — rest or work on personal projects."
    />
  );
}

/** Answers: "Is there a repeatable window I can build a routine around?" */
function RoutineWindowsRow({ insights }: { insights: ScheduleInsights }) {
  if (insights.recurringFree.length === 0) return null;
  return (
    <Card className="border-border/50 [--card-spacing:--spacing(5)]">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Coffee className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Build a Routine
            </p>
            <p className="text-sm font-semibold text-foreground">
              Recurring free windows
            </p>
          </div>
        </div>
        {insights.recurringFree.slice(0, 3).map((r, i) => {
          const days = r.days.map((d) => DAY_SHORT[d] ?? d).join(", ");
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
              <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-snug text-foreground">
                <span className="font-semibold">
                  {minutesToHoursLabel(r.endMinutes - r.startMinutes)} free
                </span>{" "}
                every {days} ({formatClock(r.startMinutes)} – {formatClock(r.endMinutes)}) — reserve it for a recurring habit.
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Answers: "Am I overcommitting this week?" — shown only when utilization is high. */
function PackedWeekRow({ insights }: { insights: ScheduleInsights }) {
  if (insights.weeklyUtilizationPct < PACKED_WEEK_THRESHOLD_PCT) return null;
  return (
    <InsightRow
      icon={AlertTriangle}
      tone="warning"
      label="Week Looks Packed"
      value={`${insights.weeklyUtilizationPct}% booked`}
      action="Consider rescheduling or dropping one thing to keep breathing room."
    />
  );
}

export function ScheduleInsightsCards({ insights }: { insights: ScheduleInsights }) {
  const hasActionable =
    Boolean(insights.busiestDay) ||
    Boolean(insights.lightestDay) ||
    insights.fullyFreeDays.length > 0 ||
    insights.recurringFree.length > 0 ||
    insights.weeklyUtilizationPct >= PACKED_WEEK_THRESHOLD_PCT;

  if (!hasActionable) return null;

  return (
    <section aria-label="Schedule insights">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Insights</h2>
      </div>
      <div className="space-y-3">
        <HeaviestDayRow insights={insights} />
        <LightestDayRow insights={insights} />
        <FreeDaysRow insights={insights} />
        <RoutineWindowsRow insights={insights} />
        <PackedWeekRow insights={insights} />
      </div>
    </section>
  );
}
