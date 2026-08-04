"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUserSchedules } from "../schedule/actions";
import { getSchedulesByToken } from "./actions";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
import { Button } from "@/components/ui/button";
import { retry } from "@/lib/retry";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

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
  days: Day[];
};

type ScheduleData = {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  classes: ClassData[];
};

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-white">
          <div className="animate-pulse text-sm text-muted-foreground">Loading schedule…</div>
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}

function WidgetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasToken = !!token;

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleData[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);

  const isLoading = hasToken ? schedules === null : authLoading || schedules === null;

  const fetchSchedules = useCallback(async () => {
    try {
      const data = hasToken ? await getSchedulesByToken(token!) : await getUserSchedules();
      if (hasToken && data === null) {
        setInvalidToken(true);
        setSchedules([]);
      } else {
        setSchedules((data as ScheduleData[]) ?? []);
        setUpdatedAt(new Date());
      }
    } catch {
      /* keep the last known schedule */
    }
  }, [hasToken, token]);

  useEffect(() => {
    if (!hasToken && authLoading) return;
    retry(fetchSchedules, { delayMs: 2000 }).catch(() => setSchedules([]));

    const interval = setInterval(fetchSchedules, 30_000);
    const onFocus = () => fetchSchedules();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [hasToken, authLoading, fetchSchedules]);

  const active =
    schedules?.find((s) => s.isActive && s.classes.length > 0) ??
    schedules?.find((s) => s.classes.length > 0) ??
    null;

  const classes = active?.classes ?? [];
  const today = new Date();
  const todayStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const updatedStr = updatedAt?.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="animate-pulse text-sm text-muted-foreground">Loading schedule…</div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border/50 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
            <GraduationCap className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-bold">Link no longer valid</h1>
          <p className="text-sm text-muted-foreground">
            This widget link was reset or replaced. Open Schedly and generate a new one in
            Settings → Widget.
          </p>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Open Schedly
          </Button>
        </div>
      </div>
    );
  }

  if (!hasToken && !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border/50 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-bold">Schedly</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to see your class schedule widget.
          </p>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-white p-4 sm:p-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Widget header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo.jpg"
              alt="Schedly"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div>
              <p className="text-sm font-bold leading-tight text-foreground">Schedly</p>
              <p className="text-xs leading-tight text-muted-foreground">{todayStr}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/dashboard")}>
            <RefreshCw className="h-3.5 w-3.5" />
            Open app
          </Button>
        </div>

        {/* Schedule card */}
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
          {schedules === null ? (
            <div className="flex items-center justify-center p-16">
              <div className="animate-pulse text-sm text-muted-foreground">Loading schedule…</div>
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No schedule yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Upload a photo of your class schedule and it will appear here automatically.
              </p>
              <Button className="mt-5" onClick={() => router.push("/schedule")}>
                Upload Schedule
              </Button>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <SchedulePreview classes={classes} filename="schedule.png" />
            </div>
          )}
        </div>

        {/* Widget footer */}
        <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
          {updatedAt ? `Updated ${updatedStr} · ` : ""}Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
