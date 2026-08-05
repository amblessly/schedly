"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Capacitor, registerPlugin } from "@capacitor/core";
import html2canvas from "html2canvas-pro";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUserSchedules } from "@/app/(dashboard)/schedule/actions";
import { getAiInsights } from "@/app/(dashboard)/dashboard/actions";
import { retry } from "@/lib/retry";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
import { useTodos } from "@/features/todo/use-todos";
import {
  getFreeTimeToday,
  computeScheduleInsights,
  DAY_ORDER,
  DAY_FULL,
  formatClock,
  minutesToHoursLabel,
  type InsightItem,
  type FreePeriod,
} from "@/features/insights/compute-insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock,
  ListTodo,
  Download,
  Loader2,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Coffee,
  Sparkles,
  Plus,
  ChevronRight,
  Sunrise,
} from "lucide-react";
import { publishScheduleToWidget } from "@/features/widget/widget-data";
import { useMounted } from "@/lib/use-mounted";

type ClassData = {
  id: string;
  subject: string;
  shortName: string | null;
  code: string | null;
  instructor: string | null;
  room: string | null;
  section: string | null;
  block: string | null;
  notes: string | null;
  color: string;
  startTime: Date;
  endTime: Date;
  days: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
};

type ScheduleData = {
  id: string;
  title: string;
  semester: string | null;
  academicYear: string | null;
  isActive: boolean;
  createdAt: Date;
  classes: ClassData[];
};

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function toMin(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type UpcomingClass = {
  class: ClassData;
  startMs: number;
  endMs: number;
  dayLabel: string;
  /** True when the class is today or tomorrow (close enough for a countdown). */
  isNear: boolean;
};

function getUpcomingClasses(classes: ClassData[], now: Date): UpcomingClass[] {
  const items: UpcomingClass[] = [];
  const nowDay = now.getDay();

  for (const c of classes) {
    for (const day of c.days) {
      const dayIdx = DAY_NAMES.indexOf(day);
      if (dayIdx < 0) continue;
      const diff = (dayIdx - nowDay + 7) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(c.startTime.getHours(), c.startTime.getMinutes(), 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() + diff);
      end.setHours(c.endTime.getHours(), c.endTime.getMinutes(), 0, 0);
      if (end.getTime() <= now.getTime()) continue; // fully past
      items.push({
        class: c,
        startMs: start.getTime() - now.getTime(),
        endMs: end.getTime() - now.getTime(),
        dayLabel: diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : DAY_FULL[day] ?? day,
        isNear: diff === 0 || diff === 1,
      });
    }
  }

  items.sort((a, b) => a.startMs - b.startMs);
  return items;
}

function formatClockTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeRange(start: Date, end: Date) {
  return `${formatClockTime(start)} – ${formatClockTime(end)}`;
}

// Fills toward the class: elapsed while it's running, or how far the day has
// advanced toward a still-pending class.
function classProgress(item: UpcomingClass, now: Date) {
  if (item.startMs <= 0) {
    const span = item.startMs - item.endMs; // negative duration
    if (span >= 0) return 0;
    return Math.min(100, Math.max(0, (-item.startMs / -span) * 100));
  }
  const dayStart = new Date(now.getTime() + item.startMs);
  dayStart.setHours(0, 0, 0, 0);
  const start = new Date(now.getTime() + item.startMs);
  const total = start.getTime() - dayStart.getTime();
  if (total <= 0) return 0;
  const elapsed = now.getTime() - dayStart.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

interface GallerySavePlugin {
  save(options: { data: string; filename: string }): Promise<{ success: boolean }>;
}
const GallerySave = registerPlugin<GallerySavePlugin>("GallerySave");

export default function DashboardPage() {
  const { user } = useAuth();
  const { todos } = useTodos();
  const [schedules, setSchedules] = useState<ScheduleData[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const scheduleRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Tick every second so countdowns visibly move.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Time-based greeting must be computed after mount — Date.now() differs
  // between the server and the client, which would break hydration.
  const mounted = useMounted();
  const greeting = !mounted
    ? ""
    : (() => {
        const h = new Date().getHours();
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
      })();

  const firstName = (user as { firstName?: string } | null)?.firstName || "User";

  useEffect(() => {
    retry(() => getUserSchedules(), { delayMs: 2000 })
      .then((data) => setSchedules(data as ScheduleData[]))
      .catch(() => setSchedules([]));
  }, []);

  // Publish the active schedule to the home-screen widget whenever schedules change.
  useEffect(() => {
    if (!schedules) return;
    const active =
      schedules.find((s) => s.isActive && s.classes.length > 0) ??
      schedules.find((s) => s.classes.length > 0) ??
      null;
    publishScheduleToWidget(active);
  }, [schedules]);

  const allClasses = (schedules ?? []).flatMap((s) => s.classes);
  const upcomingClasses = getUpcomingClasses(allClasses, now);

  // Schedule insights are derived purely from class times (client-side, offline).
  const insightItems: InsightItem[] = allClasses.map((c) => ({
    subject: c.shortName?.trim() || c.code?.trim() || c.subject,
    days: c.days,
    startMinutes: toMin(c.startTime),
    endMinutes: toMin(c.endTime),
  }));
  const weeklyInsights = computeScheduleInsights(insightItems);
  const todayDay = DAY_ORDER[(new Date().getDay() + 6) % 7] ?? "monday";
  const freeToday = getFreeTimeToday(insightItems, todayDay);

  const todaysClasses = allClasses
    .filter((c) => c.days.includes(todayDay))
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

  const busyDay = weeklyInsights.busiestDay;
  const weeklyInsightText = busyDay
    ? `${DAY_FULL[busyDay.day]} is your busiest day`
    : "Your week looks balanced";
  const weeklyInsightSub = busyDay
    ? `${minutesToHoursLabel(busyDay.busyMinutes)} of classes · ${weeklyInsights.freeHours}h free this week`
    : `${weeklyInsights.freeHours}h free across ${weeklyInsights.activeDayCount} class day${
        weeklyInsights.activeDayCount !== 1 ? "s" : ""
      }`;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysTodos = todos.filter((t) => t.dueDate === todayStr);

  // The longest free window today — the practical answer to "when can I study / rest?"
  const longestBreakToday = freeToday.freePeriods.reduce<FreePeriod | null>(
    (best, p) => (best === null || p.durationMinutes > best.durationMinutes ? p : best),
    null
  );

  // Morning Briefing — a 5-second summary of the day. Signature dashboard feature.
  const briefingTitle = !mounted
    ? "Morning Briefing"
    : (() => {
        const h = new Date().getHours();
        return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
      })();
  const nextClass = upcomingClasses[0];
  const firstClassToday = todaysClasses[0];
  const briefingLines: { icon: string; text: string }[] = [];

  if (nextClass) {
    const n = nextClass.class.shortName?.trim() || nextClass.class.code?.trim() || nextClass.class.subject;
    briefingLines.push({
      icon: "📚",
      text: `Next class: ${n} at ${formatClockTime(nextClass.class.startTime)}`,
    });
  } else {
    briefingLines.push({ icon: "📚", text: "No classes coming up." });
  }

  if (todaysClasses.length > 0) {
    briefingLines.push({
      icon: "⏰",
      text: `You have ${todaysClasses.length} class${todaysClasses.length !== 1 ? "es" : ""} today.`,
    });
  } else {
    briefingLines.push({ icon: "⏰", text: "No classes today." });
  }

  if (firstClassToday) {
    briefingLines.push({
      icon: "☕",
      text: `You're free until ${formatClockTime(firstClassToday.startTime)}.`,
    });
  } else {
    briefingLines.push({ icon: "☕", text: "You're free all day." });
  }

  if (todaysTodos.length > 0) {
    briefingLines.push({
      icon: "✅",
      text: `${todaysTodos.length} task${todaysTodos.length !== 1 ? "s" : ""} due today.`,
    });
  } else {
    briefingLines.push({ icon: "✅", text: "No tasks due today." });
  }

  if (busyDay) {
    briefingLines.push({
      icon: "💡",
      text: `${DAY_FULL[busyDay.day]} is your busiest day this week.`,
    });
  } else {
    briefingLines.push({ icon: "💡", text: "Your week looks balanced." });
  }

  const handleGenerateInsights = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    const payload = insightItems.map((it) => ({
      subject: it.subject,
      days: it.days,
      startTime: `${String(Math.floor(it.startMinutes / 60)).padStart(2, "0")}:${String(it.startMinutes % 60).padStart(2, "0")}`,
      endTime: `${String(Math.floor(it.endMinutes / 60)).padStart(2, "0")}:${String(it.endMinutes % 60).padStart(2, "0")}`,
    }));
    const res = await getAiInsights(payload);
    setAiLoading(false);
    if (res.success) setAiSuggestions(res.suggestions);
    else setAiError(res.error);
  };

  const handleDownload = async () => {
      const node = captureRef.current || scheduleRef.current;
      if (!node) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      });

      const radius = 24;
      const rounded = document.createElement("canvas");
      rounded.width = canvas.width;
      rounded.height = canvas.height;
      const rctx = rounded.getContext("2d")!;
      rctx.clearRect(0, 0, rounded.width, rounded.height);
      rctx.beginPath();
      rctx.moveTo(radius, 0);
      rctx.arcTo(rounded.width, 0, rounded.width, rounded.height, radius);
      rctx.arcTo(rounded.width, rounded.height, 0, rounded.height, radius);
      rctx.arcTo(0, rounded.height, 0, 0, radius);
      rctx.arcTo(0, 0, rounded.width, 0, radius);
      rctx.closePath();
      rctx.clip();
      rctx.drawImage(canvas, 0, 0);

      const dataUrl = rounded.toDataURL("image/png");

      if (Capacitor.isNativePlatform()) {
        const base64 = dataUrl.split(",")[1] || "";
        await GallerySave.save({ data: base64, filename: "schedule.png" });
        alert("Schedule saved to your gallery!");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "schedule.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-8 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Here&apos;s your day at a glance.
        </p>
      </div>

      {/* Morning Briefing — the 5-second summary of the day */}
      <Card className="border-border/50 bg-primary/[0.03] [--card-spacing:--spacing(5)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {briefingTitle} Briefing
          </CardTitle>
          <Sunrise className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {schedules === null ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {briefingLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="w-5 shrink-0 text-center leading-6">{line.icon}</span>
                  <span className="leading-6 text-foreground">{line.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* At a Glance */}
      <div className="grid grid-cols-2 items-start gap-3">
        {/* Next Class — compact: shows roughly one subject, scroll inside the
            card to see the rest (height never grows with content). */}
        <Card className="border-border/50 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Class
            </CardTitle>
            <div className="flex items-center gap-2">
              {upcomingClasses.length > 1 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {upcomingClasses.length} upcoming
                </span>
              )}
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {schedules === null ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : upcomingClasses.length > 0 ? (
              <ul className="max-h-[150px] space-y-2 overflow-y-auto pr-1">
                {upcomingClasses.map((item, i) => {
                  const { class: c, startMs, endMs, dayLabel, isNear } = item;
                  const happeningNow = startMs <= 0;
                  const name = c.shortName?.trim() || c.code?.trim() || c.subject;
                  const featured = i === 0;
                  return (
                    <li
                      key={`${c.id}-${dayLabel}-${startMs}`}
                      className={`rounded-xl border p-3 ${
                        featured ? "border-primary/25 bg-primary/[0.04]" : "border-border/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <p
                            className={`truncate text-foreground ${
                              featured ? "text-[15px] font-semibold" : "text-sm font-medium"
                            }`}
                          >
                            {name}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            happeningNow
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {dayLabel}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          {formatTimeRange(c.startTime, c.endTime)}
                        </span>
                        {c.room?.trim() && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" /> {c.room.trim()}
                          </span>
                        )}
                        {c.instructor?.trim() && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 shrink-0" /> {c.instructor.trim()}
                          </span>
                        )}
                      </div>

                      {isNear && (
                        <>
                          <p
                            className={`mt-1.5 flex items-center gap-1 text-xs ${
                              happeningNow ? "font-semibold text-primary" : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-3 w-3 shrink-0" />
                            {happeningNow
                              ? `Happening now · ends in ${fmtCountdown(endMs)}`
                              : `Starts in ${fmtCountdown(startMs)}`}
                          </p>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-linear"
                              style={{ width: `${classProgress(item, now)}%`, backgroundColor: c.color }}
                            />
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming classes</p>
            )}
          </CardContent>
        </Card>

        {/* Right column: To-Dos always directly above Free Time */}
        <div className="flex flex-col gap-3">
          {/* Today's To-Dos */}
          <Card className="border-border/50 [--card-spacing:--spacing(5)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                To-Dos Today
              </CardTitle>
              <ListTodo className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {todaysTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due today</p>
              ) : (
                <ul className="space-y-1.5">
                  {todaysTodos.slice(0, 3).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          t.completed ? "bg-green-500" : "bg-primary"
                        }`}
                      />
                      <span className={t.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                        {t.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex items-center justify-between">
                <Link
                  href="/todo"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary"
                >
                  <Plus className="h-3 w-3" /> Add a task
                </Link>
                {todaysTodos.length > 3 && (
                  <Link
                    href="/todo"
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View all {todaysTodos.length} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Free time today */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Free Time Today
              </CardTitle>
              <Coffee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {schedules === null ? (
                <Skeleton className="h-4 w-40" />
              ) : freeToday.isFullyFree ? (
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    You&apos;re free today
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    No schedule today — perfect time to relax or catch up on tasks.
                  </p>
                </div>
              ) : longestBreakToday ? (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {minutesToHoursLabel(longestBreakToday.durationMinutes)}
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">
                    longest break · {formatClock(longestBreakToday.startMinutes)} – {formatClock(longestBreakToday.endMinutes)}
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-foreground">No long breaks today</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Packed day — squeeze in short breaks between classes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Schedule + Insights side by side */}
      <div className="grid grid-cols-2 items-stretch gap-3">
        {/* Today's Schedule */}
        <section aria-label="Today's schedule" className="flex h-full flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Today&apos;s Schedule</h2>
            <Link
              href="/schedule"
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary"
            >
              Full timetable <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {schedules === null ? (
            <div className="flex-1 space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : todaysClasses.length === 0 ? (
            <Card className="flex-1 border-border/50 [--card-spacing:--spacing(5)]">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Coffee className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No classes on {DAY_FULL[todayDay]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    You&apos;re free all day — perfect time to relax or catch up on tasks.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 border-border/50 [--card-spacing:--spacing(5)]">
              <CardContent className="divide-y divide-border/60 py-1">
                {todaysClasses.map((c) => {
                  const name = c.shortName?.trim() || c.code?.trim() || c.subject;
                  const done = new Date(c.endTime).getTime() <= now.getTime();
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-foreground">
                        {formatClockTime(c.startTime)}
                      </span>
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${
                            done ? "text-muted-foreground line-through" : "text-foreground"
                          }`}
                        >
                          {name}
                        </p>
                        {c.room?.trim() && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" /> {c.room.trim()}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatClockTime(c.endTime)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Insights — auto weekly insight + optional AI tips */}
        {schedules && allClasses.length > 0 && (
          <section aria-label="Schedule insights" className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Insights</h2>
            </div>

            <Card className="flex-1 border-border/50 [--card-spacing:--spacing(5)]">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{weeklyInsightText}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{weeklyInsightSub}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleGenerateInsights}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</>
                  ) : aiSuggestions ? (
                    "More AI tips"
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4 text-primary" /> AI tips</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* AI tips output below the two cards */}
      {schedules && allClasses.length > 0 && aiError && (
        <p className="mt-2 text-xs text-destructive">{aiError}</p>
      )}

      {schedules && allClasses.length > 0 && aiSuggestions && aiSuggestions.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {aiSuggestions.map((s, i) => (
            <Card key={i} className="border-border/50 [--card-spacing:--spacing(5)]">
              <CardContent className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-snug text-foreground">{s}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generated Schedule Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Your Schedule</h2>

        {schedules === null ? (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 21 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No schedule yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Upload a photo of your class schedule and your timetable will appear here
              automatically.
            </p>
            <Button className="mt-5" onClick={() => (window.location.href = "/schedule")}>
              Upload Schedule
            </Button>
          </div>
        ) : (
          <>
            <div ref={scheduleRef}>
              <SchedulePreview
                classes={allClasses}
                filename="schedule.png"
                action={
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                    {downloading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Download className="mr-2 h-4 w-4" /> Download image</>
                    )}
                  </Button>
                }
              />
            </div>
            <div
              ref={captureRef}
              aria-hidden
              style={{
                position: "fixed",
                left: "-99999px",
                top: 0,
                pointerEvents: "none",
                opacity: 1,
              }}
            >
              <SchedulePreview classes={allClasses} filename="schedule.png" capture />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
