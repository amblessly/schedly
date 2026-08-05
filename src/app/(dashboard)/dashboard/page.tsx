"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import html2canvas from "html2canvas-pro";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUserSchedules } from "@/app/(dashboard)/schedule/actions";
import { getAiInsights } from "@/app/(dashboard)/dashboard/actions";
import { retry } from "@/lib/retry";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
import { useTodos } from "@/features/todo/use-todos";
import {
  computeScheduleInsights,
  getFreeTimeToday,
  DAY_ORDER,
  DAY_FULL,
  formatClock,
  minutesToHoursLabel,
  type InsightItem,
  type FreePeriod,
} from "@/features/insights/compute-insights";
import { ScheduleInsightsCards } from "@/features/insights/insight-cards";
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
  GraduationCap,
  Coffee,
  Bell,
  Sparkles,
  Plus,
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

function fmtDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function reminderKind(c: ClassData): { label: string; cls: string } {
  const now = new Date();
  const dayIdx = DAY_NAMES.indexOf(c.days[0] ?? "");
  if (dayIdx < 0) return { label: "Upcoming", cls: "text-slate-400" };
  const diff = (dayIdx - now.getDay() + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(c.startTime.getHours(), c.startTime.getMinutes(), 0, 0);
  const ms = start.getTime() - now.getTime();
  const dayLabel = c.days.length > 1 ? `${c.days.map((d) => d.slice(0, 3).toUpperCase()).join("/")}` : c.days[0]?.slice(0, 3).toUpperCase();
  if (ms < 0) return { label: "Done", cls: "text-slate-400" };
  if (diff === 0) return { label: "Today", cls: "text-emerald-600" };
  if (diff === 1) return { label: `Tomorrow ${dayLabel}`, cls: "text-amber-600" };
  return { label: `${dayLabel} ${formatClock(start.getHours() * 60 + start.getMinutes())}`, cls: "text-slate-400" };
}

function getNextClass(classes: ClassData[]) {
  if (!classes.length) return null;
  const now = new Date();
  const nowDay = now.getDay();
  let best: { class: ClassData; startMs: number; endMs: number } | null = null;

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
      const startMs = start.getTime() - now.getTime();
      if (best === null || startMs < best.startMs) {
        best = { class: c, startMs, endMs: end.getTime() - now.getTime() };
      }
    }
  }
  return best;
}

interface GallerySavePlugin {
  save(options: { data: string; filename: string }): Promise<{ success: boolean }>;
}
const GallerySave = registerPlugin<GallerySavePlugin>("GallerySave");

export default function DashboardPage() {
  const { user } = useAuth();
  const { todos, addTodo } = useTodos();
  const [schedules, setSchedules] = useState<ScheduleData[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

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
  const nextClass = getNextClass(allClasses);

  // Schedule insights are derived purely from class times (client-side, offline).
  const insightItems: InsightItem[] = allClasses.map((c) => ({
    subject: c.shortName?.trim() || c.code?.trim() || c.subject,
    days: c.days,
    startMinutes: toMin(c.startTime),
    endMinutes: toMin(c.endTime),
  }));
  const insights = computeScheduleInsights(insightItems);
  const todayDay = DAY_ORDER[(new Date().getDay() + 6) % 7] ?? "monday";
  const freeToday = getFreeTimeToday(insightItems, todayDay);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysTodos = todos.filter((t) => t.dueDate === todayStr);

  // The longest free window today — the practical answer to "when can I study / rest?"
  const longestBreakToday = freeToday.freePeriods.reduce<FreePeriod | null>(
    (best, p) => (best === null || p.durationMinutes > best.durationMinutes ? p : best),
    null
  );

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const todaysClasses = allClasses
    .filter((c) => c.days.includes(todayDay))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const handleAddTodo = (e: FormEvent) => {
    e.preventDefault();
    const text = newTodo.trim();
    if (!text) return;
    addTodo(text, "medium", todayStr);
    setNewTodo("");
  };

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

      {/* At a Glance */}
      <div className="grid grid-cols-2 items-start gap-3">
        {/* Next Class */}
        <Card className="border-border/50 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Class
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {schedules === null ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : nextClass ? (
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {nextClass.class.shortName?.trim() || nextClass.class.code?.trim() || nextClass.class.subject}
                </p>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {nextClass.class.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {nextClass.class.room}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {nextClass.startMs <= 0
                      ? `Happening now · ends in ${fmtDuration(nextClass.endMs)}`
                      : `Starts in ${fmtDuration(nextClass.startMs)}`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming classes</p>
            )}
          </CardContent>
        </Card>

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
                {todaysTodos.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
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
                {todaysTodos.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{todaysTodos.length - 4} more
                  </li>
                )}
              </ul>
            )}
            <form onSubmit={handleAddTodo} className="mt-3 flex items-center gap-1.5">
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a task for today…"
                className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label="Add task"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                disabled={!newTodo.trim()}
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Reminders Today */}
        <Card className="border-border/50 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reminders
            </CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {schedules === null ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : todaysClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes today</p>
            ) : (
              <ul className="space-y-2">
                {todaysClasses.slice(0, 4).map((c, i) => {
                  const startMin = c.startTime.getHours() * 60 + c.startTime.getMinutes();
                  const endMin = c.endTime.getHours() * 60 + c.endTime.getMinutes();
                  const isLive = nowMin >= startMin && nowMin <= endMin;
                  const kind = reminderKind(c);
                  return (
                    <li key={`${c.subject}-${i}`} className="flex items-start gap-2 text-sm">
                      <Clock className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isLive ? "text-primary" : "text-muted-foreground/60"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {c.shortName?.trim() || c.code?.trim() || c.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatClock(startMin)} – {formatClock(endMin)}
                          {c.room ? ` · ${c.room}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${kind.cls}`}>
                        {isLive ? "Now" : kind.label}
                      </span>
                    </li>
                  );
                })}
                {todaysClasses.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{todaysClasses.length - 4} more
                  </li>
                )}
              </ul>
            )}
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
              <p className="text-sm text-muted-foreground">
                No classes today — enjoy the {DAY_FULL[todayDay]}.
              </p>
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
              <p className="text-sm text-muted-foreground">
                Packed day — no long breaks available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Insights */}
      {schedules && allClasses.length > 0 && (
        <>
          <ScheduleInsightsCards
            insights={insights}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInsights}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4 text-primary" /> Generate insights</>
                )}
              </Button>
            }
          />
          {aiError && (
            <p className="text-xs text-destructive">{aiError}</p>
          )}
          {aiSuggestions && aiSuggestions.length > 0 && (
            <Card className="border-border/50 [--card-spacing:--spacing(5)]">
              <CardContent className="space-y-2">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-primary/5 px-3 py-2.5">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm leading-snug text-foreground">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Generated Schedule Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Schedule</h2>
          {schedules && schedules.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download image</>
              )}
            </Button>
          )}
        </div>

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
              <SchedulePreview classes={allClasses} filename="schedule.png" />
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
