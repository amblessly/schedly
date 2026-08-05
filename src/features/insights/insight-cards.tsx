"use client";

import {
  Clock,
  Coffee,
  Flame,
  Feather,
  Timer,
  BarChart3,
  CalendarOff,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ScheduleInsights,
  minutesToHoursLabel,
  formatClock,
  DAY_FULL,
  DAY_SHORT,
} from "./compute-insights";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="border-border/50 [--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function UtilCard({ pct }: { pct: number }) {
  return (
    <Card className="border-border/50 [--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">Weekly Utilization</CardTitle>
        <BarChart3 className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold tracking-tight text-foreground">{pct}%</span>
          <span className="pb-1 text-xs text-muted-foreground">of your week</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FreeTimeCard({ insights }: { insights: ScheduleInsights }) {
  const recurring = insights.recurringFree;
  const fullyFree = insights.fullyFreeDays;

  return (
    <Card className="border-border/50 [--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">Free Time Finder</CardTitle>
        <Sparkles className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {recurring.length === 0 && fullyFree.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Your week looks fully booked — consider scheduling some breathing room.
          </p>
        )}
        {recurring.slice(0, 3).map((r, i) => {
          const days = r.days.map((d) => DAY_SHORT[d]).join(", ");
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
              <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-snug text-foreground">
                <span className="font-semibold">
                  {minutesToHoursLabel(r.endMinutes - r.startMinutes)} free
                </span>{" "}
                every {days} ({formatClock(r.startMinutes)} – {formatClock(r.endMinutes)})
              </p>
            </div>
          );
        })}
        {fullyFree.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
            <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-snug text-foreground">
              <span className="font-semibold">
                {fullyFree.map((d) => DAY_FULL[d]).join(", ")}
              </span>{" "}
              {fullyFree.length === 1 ? "is" : "are"} completely free
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScheduleInsightsCards({ insights }: { insights: ScheduleInsights }) {
  return (
    <section aria-label="Schedule insights">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Insights</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Clock}
          label="Weekly Hours"
          value={minutesToHoursLabel(insights.totalWeeklyMinutes)}
          sub={`${insights.activeDayCount} active day${insights.activeDayCount !== 1 ? "s" : ""}`}
        />
        <MetricCard
          icon={Coffee}
          label="Free Hours"
          value={minutesToHoursLabel(insights.freeHours * 60)}
          sub="this week"
          accent="text-emerald-500"
        />
        {insights.busiestDay && (
          <MetricCard
            icon={Flame}
            label="Busiest Day"
            value={DAY_FULL[insights.busiestDay.day] ?? insights.busiestDay.day}
            sub={minutesToHoursLabel(insights.busiestDay.busyMinutes)}
            accent="text-orange-500"
          />
        )}
        {insights.lightestDay && (
          <MetricCard
            icon={Feather}
            label="Lightest Day"
            value={DAY_FULL[insights.lightestDay.day] ?? insights.lightestDay.day}
            sub={minutesToHoursLabel(insights.lightestDay.busyMinutes)}
            accent="text-sky-500"
          />
        )}
        {insights.longestEvent && (
          <MetricCard
            icon={Timer}
            label="Longest Event"
            value={insights.longestEvent.subject}
            sub={minutesToHoursLabel(insights.longestEvent.durationMinutes)}
          />
        )}
        <MetricCard
          icon={BarChart3}
          label="Avg Daily Load"
          value={minutesToHoursLabel(insights.averageDailyMinutes)}
          sub="per day"
        />
        <UtilCard pct={insights.weeklyUtilizationPct} />
        <FreeTimeCard insights={insights} />
      </div>
    </section>
  );
}
