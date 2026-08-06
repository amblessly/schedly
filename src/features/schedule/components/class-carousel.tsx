"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

type CarouselClass = {
  id: string;
  subject: string;
  shortName: string | null;
  code: string | null;
  color: string;
  room: string | null;
  instructor: string | null;
  startTime: Date;
  endTime: Date;
};

type Props = {
  classes: CarouselClass[];
  now: Date;
};

type Status = "finished" | "ongoing" | "next" | "upcoming";

function formatClock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.round(ms / 60000));
  if (total <= 0) return "starts now";
  if (total < 60) return `starts in ${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `starts in ${h}h ${m}m` : `starts in ${h}h`;
}

export function ClassCarousel({ classes, now }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Resolve each class to a status, labelling the single next upcoming one as "next".
  const status: Status[] = classes.map((c) => {
    if (now.getTime() >= c.endTime.getTime()) return "finished";
    if (now.getTime() >= c.startTime.getTime()) return "ongoing";
    return "upcoming";
  });
  const nextIdx = status.indexOf("upcoming");
  if (nextIdx >= 0) status[nextIdx] = "next";

  useEffect(() => {
    const el = trackRef.current;
    if (!el || classes.length === 0) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const step = card ? card.offsetWidth + 16 : 0;
    const idx = step ? Math.round(el.scrollLeft / step) : 0;
    setActive(Math.max(0, Math.min(classes.length - 1, idx)));
  }, [classes.length]);

  if (classes.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/40 p-6 text-center">
        <p className="text-sm font-medium text-foreground">No classes today</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You&apos;re free all day — a perfect time to relax or catch up on tasks.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={() => {
          const el = trackRef.current;
          if (!el || classes.length === 0) return;
          const card = el.querySelector<HTMLElement>("[data-carousel-card]");
          if (!card) return;
          const step = card.offsetWidth + 16;
          const idx = Math.round(el.scrollLeft / step);
          setActive(Math.max(0, Math.min(classes.length - 1, idx)));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {classes.map((c, i) => {
          const st = status[i];
          const name = c.shortName?.trim() || c.code?.trim() || c.subject;
          const activeCard = i === active;
          return (
            <div
              key={c.id}
              data-carousel-card
              className={cn(
                "relative flex shrink-0 snap-center flex-col rounded-3xl p-5 transition-all duration-300",
                "w-[85%] max-w-[420px]",
                activeCard ? "scale-100 shadow-lg" : "scale-[0.96] opacity-80"
              )}
              style={{ backgroundColor: c.color || "var(--secondary)" }}
            >
              {st === "next" && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background">
                  Next
                </span>
              )}

              <p className="line-clamp-2 pr-16 text-2xl font-bold leading-tight tracking-tight text-background">
                {name}
              </p>

              {st === "next" && (
                <p className="mt-1 text-xs font-medium text-background/80">
                  {formatCountdown(c.startTime.getTime() - now.getTime())}
                </p>
              )}

              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-background">
                <CalendarClock className="h-4 w-4" />
                {formatClock(c.startTime)} – {formatClock(c.endTime)}
              </div>

              {(c.room?.trim() || c.instructor?.trim()) && (
                <div className="mt-2 flex flex-col gap-1 text-xs text-background/80">
                  {c.room?.trim() && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {c.room.trim()}
                    </span>
                  )}
                  {c.instructor?.trim() && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> {c.instructor.trim()}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto pt-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    st === "finished" && "bg-background/15 text-background/80",
                    (st === "ongoing" || st === "next") && "bg-foreground text-background",
                    st === "upcoming" && "bg-background/20 text-background"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {st === "finished"
                    ? "Finished"
                    : st === "ongoing"
                      ? "Ongoing"
                      : st === "next"
                        ? "Up next"
                        : "Upcoming"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {classes.length > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {classes.map((c, i) => (
              <span
                key={c.id}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === active ? "w-6 bg-foreground" : "w-2 bg-foreground/25"
                )}
              />
            ))}
          </div>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {active + 1} / {classes.length}
          </span>
        </div>
      )}
    </div>
  );
}