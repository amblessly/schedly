"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download, GraduationCap } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Skeleton as BoneSkeleton } from "boneyard-js/react";
import { SchedulePreview } from "@/features/schedule/components/schedule-preview";
import type { ClassData, ScheduleData } from "@/features/dashboard/lib/types";

type ScheduleSectionProps = {
  schedules: ScheduleData[] | null;
  activeClasses: ClassData[];
  activeSchedule: ScheduleData | null;
  scheduleCount: number;
  idx: number;
  downloading: boolean;
  onDownload: () => void;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  scheduleRef: React.RefObject<HTMLDivElement | null>;
  captureRef: React.RefObject<HTMLDivElement | null>;
};

// Full-width timetable below the bento grid. If the user has several
// schedules, left/right arrows flip between them; a hidden off-screen render
// powers the "Download image" export.
export function ScheduleSection({
  schedules,
  activeClasses,
  activeSchedule,
  scheduleCount,
  idx,
  downloading,
  onDownload,
  setActiveIndex,
  scheduleRef,
  captureRef,
}: ScheduleSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">Your Schedule</h2>

      <BoneSkeleton
        name="dashboard-schedule"
        loading={schedules === null}
        fallback={
          // Skeleton mirrors the timetable card: window dots + filename + action
          // button on top, then the 7-column day header and class cells.
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="ml-2 h-3 w-32" />
              <Skeleton className="ml-auto h-8 w-32 rounded-lg" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-10 w-full" />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 21 }).map((_, i) => (
                <Skeleton key={`c-${i}`} className="h-14 w-full" />
              ))}
            </div>
          </div>
        }
      >
      {schedules && schedules.length === 0 ? (
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
                    <div className="flex shrink-0 items-center rounded-full border border-border/60 bg-muted/30 p-0.5">
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
                  <Button variant="outline" size="sm" onClick={onDownload} disabled={downloading} className="shrink-0">
                    {downloading ? (
                      <>
                        <Spinner size={16} color="var(--foreground)" className="sm:mr-2" />{" "}
                        <span className="hidden sm:inline"> Saving...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 sm:mr-2" />{" "}
                        <span className="hidden sm:inline">Download image</span>
                      </>
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
      </BoneSkeleton>
    </section>
  );
}