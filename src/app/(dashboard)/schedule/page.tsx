"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMounted } from "@/lib/use-mounted";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
import { ScheduleCalendar } from "@/features/schedule/components/schedule-calendar";
import { getUserSchedules, getSchedule, deleteSchedule } from "./actions";
import { retry } from "@/lib/retry";
import { withOfflineCache } from "@/lib/offline-cache";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Skeleton as BoneSkeleton } from "boneyard-js/react";
import { ArrowLeft, Calendar, Camera, Trash2 } from "lucide-react";
import { AppNavPanel } from "@/components/app-nav-panel";
import { HeaderAvatar } from "@/components/header-avatar";
import { NotificationBell } from "@/components/notification-bell";

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

type Phase = "list" | "view";

export default function SchedulePage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>("list");

  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleData | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  // Gate the schedules count on mount: it's only known after the client-side
  // fetch, so rendering it during SSR causes a hydration mismatch.
  const mounted = useMounted();

  useEffect(() => {
    if (!authLoading) {
      retry(() => withOfflineCache("schedule:list", () => getUserSchedules()), { delayMs: 2000 }).then((data) => {
        setSchedules(data as ScheduleData[]);
        setLoadingSchedules(false);
      });
    }
  }, [authLoading]);

  const handleViewSchedule = async (scheduleId: string) => {
    const data = await withOfflineCache(`schedule:detail:${scheduleId}`, () => getSchedule(scheduleId));
    if (data) {
      setSelectedSchedule(data as ScheduleData);
      setPhase("view");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Delete this schedule?")) return;
    const result = await deleteSchedule(scheduleId);
    if (result.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      if (activeScheduleId === scheduleId) {
        setActiveScheduleId(null);
      }
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule(null);
        setPhase("list");
      }
    }
  };

  const handleBackToList = () => {
    setSelectedSchedule(null);
    setPhase("list");
  };

  return (
    <div className="mx-auto w-full max-w-6xl pt-8 md:pt-0">
      {phase === "list" && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
          <div className="flex items-start gap-3">
            <HeaderAvatar />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Calendar
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {mounted
                  ? `${schedules.length} schedule${schedules.length !== 1 ? "s" : ""} saved`
                  : "Your class schedule"
                }
              </p>
            </div>
          </div>
          <NotificationBell variant="inline" className="hidden md:flex" />
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AppNavPanel />

        <div className="min-w-0 flex-1 mx-auto w-full max-w-4xl md:mx-0">
      {/* === VIEW TIMETABLE === */}
      {phase === "view" && selectedSchedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon-sm" onClick={handleBackToList} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-10 px-3 text-destructive hover:text-destructive"
              onClick={() => handleDeleteSchedule(selectedSchedule.id)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
          <SchedulePreview
            classes={selectedSchedule.classes}
            filename={`${selectedSchedule.title}.png`}
          />
        </div>
      )}

      {/* === CALENDAR === */}
      {phase === "list" && (
        <div className="space-y-4">
          <BoneSkeleton
            name="schedule-page-list"
            loading={loadingSchedules}
            fallback={
              <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            }
          >
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
              <Calendar className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground">No schedules yet</h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Upload a photo of your class schedule and let Schedly extract your timetable automatically.
              </p>
              <Button className="mt-5" onClick={() => router.push("/capture")}>
                <Camera className="mr-2 h-4 w-4" /> Upload Schedule
              </Button>
            </div>
          ) : (
            <ScheduleCalendar
              schedules={schedules}
              activeScheduleId={activeScheduleId}
              onActiveChange={setActiveScheduleId}
              onDeleteSchedule={handleDeleteSchedule}
              onViewSchedule={handleViewSchedule}
            />
          )}
          </BoneSkeleton>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
