"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import html2canvas from "html2canvas-pro";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUserSchedules } from "@/app/(dashboard)/schedule/actions";
import { getAiInsights } from "@/app/(dashboard)/dashboard/actions";
import { getWeatherByCoords, getWeatherByIp, type WeatherData } from "@/app/(dashboard)/dashboard/weather-actions";
import { retry } from "@/lib/retry";
import { withOfflineCache } from "@/lib/offline-cache";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
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
  Download,
  Loader2,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Coffee,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Sun,
  Droplets,
  Wind,
  RefreshCw,
} from "lucide-react";
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
  return d.getUTCHours() * 60 + d.getUTCMinutes();
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

function formatClockTime(d: Date) {
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeRange(start: Date, end: Date) {
  return `${formatClockTime(start)} – ${formatClockTime(end)}`;
}

interface GallerySavePlugin {
  save(options: { data: string; filename: string }): Promise<{ success: boolean }>;
}
const GallerySave = registerPlugin<GallerySavePlugin>("GallerySave");

export default function DashboardPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleData[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const todayListRef = useRef<HTMLDivElement>(null);

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

  const username = (user as { username?: string } | null)?.username || "there";

  useEffect(() => {
    retry(() => withOfflineCache("schedule:list", () => getUserSchedules()), { delayMs: 2000 })
      .then((data) => setSchedules(data as ScheduleData[]))
      .catch(() => setSchedules([]));
  }, []);

  // Fetch weather on mount using browser geolocation, falling back to IP-based
  // detection when permission is denied or unavailable.
  useEffect(() => {
    const fetchByIp = async () => {
      try {
        const res = await getWeatherByIp();
        if (res.success) {
          setWeather(res.data);
        } else {
          setWeatherError(res.error);
        }
      } catch {
        setWeatherError("Failed to fetch weather");
      }
      setWeatherLoading(false);
    };

    if (!navigator.geolocation) {
      fetchByIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          if (res.success) {
            setWeather(res.data);
          } else {
            setWeatherError(res.error);
          }
        } catch {
          setWeatherError("Failed to fetch weather");
        }
        setWeatherLoading(false);
      },
      fetchByIp,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const refreshWeather = useCallback(() => {
    const fetchByIp = async () => {
      try {
        const res = await getWeatherByIp();
        if (res.success) {
          setWeather(res.data);
        } else {
          setWeatherError(res.error);
        }
      } catch {
        setWeatherError("Failed to fetch weather");
      }
      setWeatherLoading(false);
    };

    if (!navigator.geolocation) {
      setWeatherLoading(true);
      setWeatherError(null);
      fetchByIp();
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          if (res.success) {
            setWeather(res.data);
          } else {
            setWeatherError(res.error);
          }
        } catch {
          setWeatherError("Failed to fetch weather");
        }
        setWeatherLoading(false);
      },
      fetchByIp,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // If the user has several schedules, the big timetable below shows them one
  // at a time via left/right arrows. `idx` is the state, clamped to bounds so
  // it can never point past the list (e.g. after a schedule is deleted). It's
  // persisted so the selected schedule survives switching tabs.
  const [activeIndex, setActiveIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem("schedly-active-schedule-idx");
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  const scheduleCount = schedules?.length ?? 0;
  const idx = Math.min(activeIndex, Math.max(0, scheduleCount - 1));
  const activeSchedule =
    scheduleCount > 0 && schedules ? schedules[idx] ?? null : null;
  const activeClasses = activeSchedule?.classes ?? [];

  useEffect(() => {
    window.localStorage.setItem("schedly-active-schedule-idx", String(idx));
  }, [idx]);

  // Schedule insights are derived purely from class times (client-side, offline).
  // Only the currently selected schedule feeds the dashboard cards.
  const insightItems: InsightItem[] = activeClasses.map((c) => ({
    subject: c.shortName?.trim() || c.code?.trim() || c.subject,
    days: c.days,
    startMinutes: toMin(c.startTime),
    endMinutes: toMin(c.endTime),
  }));
  const weeklyInsights = computeScheduleInsights(insightItems);
  const todayDay = DAY_ORDER[(new Date().getDay() + 6) % 7] ?? "monday";
  const freeToday = getFreeTimeToday(insightItems, todayDay);

  const todaysClasses = activeClasses
    .filter((c) => c.days.includes(todayDay))
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

  // Auto-scroll through Today's Classes — one card every 2 seconds, looping
  // back to the first card after the last (1 → 2 → 3 → 4 → 1…). Always
  // advances a single card from the current scroll position so it stays in
  // sync even after a manual scroll. Pauses while the user hovers/touches the
  // list so it never fights their hand.
  useEffect(() => {
    if (todaysClasses.length < 2) return;
    const list = todayListRef.current;
    if (!list) return;

    let paused = false;

    const advance = () => {
      if (paused || list.children.length === 0) return;
      const cardHeight = list.clientHeight;
      if (cardHeight <= 0) return;
      const maxTop = list.scrollHeight - cardHeight;
      const nextTop = list.scrollTop + cardHeight;
      if (nextTop >= maxTop) {
        // Reached the last card — wrap back to the first.
        list.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        list.scrollTo({ top: nextTop, behavior: "smooth" });
      }
    };

    const id = setInterval(advance, 2000);
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);

    list.addEventListener("pointerenter", onEnter);
    list.addEventListener("pointerleave", onLeave);

    return () => {
      clearInterval(id);
      list.removeEventListener("pointerenter", onEnter);
      list.removeEventListener("pointerleave", onLeave);
    };
  }, [todaysClasses.length]);

  // The next class on a day after today (e.g. tomorrow's earliest subject),
  // shown compactly inside the Today's Classes card without expanding it.
  const nextDayClass = (() => {
    if (schedules === null) return null;
    const startDayIdx = new Date().getDay();
    for (let offset = 1; offset <= 7; offset++) {
      const day = DAY_ORDER[(startDayIdx + 6 + offset) % 7] ?? "monday";
      const dayClasses = activeClasses
        .filter((c) => c.days.includes(day))
        .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
      if (dayClasses.length > 0) return { day, cls: dayClasses[0]! };
    }
    return null;
  })();

  const busyDay = weeklyInsights.busiestDay;
  const weeklyInsightText = busyDay
    ? `${DAY_FULL[busyDay.day]} is your busiest day`
    : "Your week looks balanced";
  const weeklyInsightSub = busyDay
    ? `${minutesToHoursLabel(busyDay.busyMinutes)} of classes · ${weeklyInsights.freeHours}h free this week`
    : `${weeklyInsights.freeHours}h free across ${weeklyInsights.activeDayCount} class day${
        weeklyInsights.activeDayCount !== 1 ? "s" : ""
      }`;

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
    if (res.success) {
      setAiSuggestions(res.suggestions);
      setAiVisible(true);
    } else {
      setAiError(res.error);
    }
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
          {greeting}, {username}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Here&apos;s your day at a glance.
        </p>
      </div>

      {/* Bento grid — mixed-size tiles (landscape, square) for a glanceable day */}
      <div className="grid grid-cols-2 items-stretch gap-3">
        {/* Today's Classes — tall tile filling the left column (rows 1–2) */}
        <Card className="col-span-1 row-span-2 flex h-full flex-col border-border/50 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Classes
            </CardTitle>
            <div className="flex items-center gap-2">
              {todaysClasses.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {todaysClasses.length} today
                </span>
              )}
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            {schedules === null ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : todaysClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes today — time to relax or catch up on tasks.
              </p>
            ) : (
              // Ongoing first, upcoming next, finished pushed to the bottom —
              // one compact subject visible at a time, snap-scroll through the rest.
              <div ref={todayListRef} className="my-auto h-[6.5rem] snap-y snap-mandatory overflow-y-auto pr-1">
                {[...todaysClasses]
                  .sort((a, b) => {
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const rank = (c: typeof todaysClasses[number]) => {
                      const startMin = toMin(c.startTime);
                      const endMin = toMin(c.endTime);
                      if (nowMin >= startMin && nowMin < endMin) return 0;
                      if (nowMin < startMin) return 1;
                      return 2;
                    };
                    return rank(a) - rank(b) || toMin(a.startTime) - toMin(b.startTime);
                  })
                  .map((c) => {
                  const name = c.shortName?.trim() || c.code?.trim() || c.subject;
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const startMin = toMin(c.startTime);
                  const endMin = toMin(c.endTime);
                  const finished = nowMin > endMin;
                  const ongoing = !finished && nowMin >= startMin;
                  return (
                    <div
                      key={`${c.id}`}
                      className="flex h-full snap-start flex-col rounded-xl border border-primary/25 bg-primary/[0.04] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <p className="truncate text-[15px] font-semibold text-foreground">
                            {name}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            ongoing
                              ? "bg-destructive/10 text-destructive"
                              : finished
                                ? "bg-foreground/10 text-muted-foreground"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {ongoing ? "Ongoing" : finished ? "Finished" : "Upcoming"}
                        </span>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-1.5 text-xs text-muted-foreground">
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

                      {ongoing && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary">
                          <Clock className="h-3 w-3 shrink-0" />
                          Happening now · ends in {fmtCountdown((endMin - nowMin) * 60000)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {nextDayClass && (
              <div className="mt-2 shrink-0 border-t border-border/60 pt-2">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarClock className="h-3 w-3 shrink-0" />
                  Upcoming · {DAY_FULL[nextDayClass.day]}
                </p>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: nextDayClass.cls.color }}
                    />
                    <p className="truncate text-sm font-medium text-foreground">
                      {nextDayClass.cls.shortName?.trim() || nextDayClass.cls.code?.trim() || nextDayClass.cls.subject}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {formatClockTime(nextDayClass.cls.startTime)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

{/* Weather — square tile */}
        <Card className="border-border/50 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weather
            </CardTitle>
            <div className="flex items-center gap-2">
              {weather && (
                <button
                  type="button"
                  aria-label="Refresh weather"
                  disabled={weatherLoading}
                  onClick={refreshWeather}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${weatherLoading ? "animate-spin" : ""}`} />
                </button>
              )}
              <Sun className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {weatherLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : weatherError ? (
              <p className="text-sm text-destructive">{weatherError}</p>
            ) : weather ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {weather.temperature}°
                    </span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {weather.description}
                    </span>
                  </div>
                  <img
                    src={weather.icon}
                    alt={weather.description}
                    className="h-10 w-10 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <p className="mt-1 text-xs font-medium text-foreground">
                  {weather.city}, {weather.country}
                </p>
                <div className="mt-2 flex items-center gap-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 shrink-0" />
                    {weather.humidity}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3 shrink-0" />
                    {weather.windSpeed} km/h
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No weather data</p>
            )}
          </CardContent>
        </Card>

        {/* Free Time Today — square tile */}
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
                classes={activeClasses}
                filename="schedule.png"
                action={
                  <div className="flex items-center gap-1.5">
                    {/* Left/right arrows appear inside the card, next to the
                        download button, only when the user has several schedules. */}
                    {scheduleCount > 1 && (
                      <div className="flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5">
                        <button
                          type="button"
                          aria-label="Previous schedule"
                          disabled={idx <= 0}
                          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="max-w-[90px] truncate px-1 text-[11px] font-medium text-foreground sm:max-w-[140px]">
                          {activeSchedule?.title?.trim() || `Schedule ${idx + 1}`}
                        </span>
                        <span className="pl-0.5 pr-1 text-[10px] text-muted-foreground">
                          {idx + 1}/{scheduleCount}
                        </span>
                        <button
                          type="button"
                          aria-label="Next schedule"
                          disabled={idx >= scheduleCount - 1}
                          onClick={() => setActiveIndex((i) => Math.min(scheduleCount - 1, i + 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                      {downloading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Download className="mr-2 h-4 w-4" /> Download image</>
                      )}
                    </Button>
                  </div>
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
              <SchedulePreview classes={activeClasses} filename="schedule.png" capture />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
