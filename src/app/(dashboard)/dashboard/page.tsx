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
import { ClassCarousel } from "@/features/schedule/components/class-carousel";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo,
  Download,
  Loader2,
  GraduationCap,
  Sparkles,
  ChevronRight,
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

function toMin(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
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

      {/* Today's Classes — carousel left, status cards right */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_240px]">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Today&apos;s Classes
              </h2>
              <p className="text-sm text-muted-foreground">
                {schedules === null
                  ? "Loading…"
                  : todaysClasses.length === 0
                    ? "No classes today"
                    : `${todaysClasses.length} class${todaysClasses.length !== 1 ? "es" : ""} today`}
              </p>
            </div>
            <Link
              href="/schedule"
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
            >
              Full timetable <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3">
            {schedules === null ? (
              <div className="space-y-3">
                <Skeleton className="h-[190px] w-[78%] max-w-[340px] rounded-3xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-2 w-6 rounded-full" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              </div>
            ) : (
              <ClassCarousel classes={todaysClasses} now={now} />
            )}
          </div>
        </div>

        {/* Status cards — tasks + free time, stacked on the right */}
        <div className="flex flex-col gap-3">
          <Link
            href="/todo"
            className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListTodo className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {todaysTodos.length > 0
                  ? `${todaysTodos.length} task${todaysTodos.length !== 1 ? "s" : ""}`
                  : "Plan your day"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {todaysTodos.length > 0 ? "due today" : "Add something to do"}
              </p>
            </div>
          </Link>

          {schedules !== null &&
            (freeToday.isFullyFree ? (
              <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-600">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Free all day</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Nothing scheduled today
                  </p>
                </div>
              </div>
            ) : longestBreakToday ? (
              <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-600">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Free until {formatClock(longestBreakToday.endMinutes)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Longest break · {minutesToHoursLabel(longestBreakToday.durationMinutes)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Class starts soon</p>
                  <p className="truncate text-xs text-muted-foreground">No long breaks today</p>
                </div>
              </div>
            ))}
        </div>
      </div>
      {schedules && allClasses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={handleGenerateInsights}
            disabled={aiLoading}
            className="w-full rounded-3xl border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted disabled:cursor-default"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {weeklyInsightText}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{weeklyInsightSub}</p>
                </div>
              </div>
              {aiLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : aiSuggestions ? (
                <span className="shrink-0 text-xs font-medium text-primary">More AI tips</span>
              ) : (
                <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  AI tips
                </span>
              )}
            </div>
          </button>

          {aiError && <p className="mt-2 text-xs text-destructive">{aiError}</p>}

          {aiSuggestions && aiSuggestions.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {aiSuggestions.map((s, i) => (
                <Card key={i} className="rounded-2xl border-border/60 [--card-spacing:--spacing(4)]">
                  <CardContent className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-sm leading-snug text-foreground">{s}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
