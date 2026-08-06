"use client";

import { CalendarClock, MapPin } from "lucide-react";
import { DAY_FULL, DAY_ORDER } from "@/features/insights/compute-insights";

type UpcomingClass = {
  id: string;
  subject: string;
  shortName: string | null;
  code: string | null;
  color: string;
  room: string | null;
  startTime: Date;
  endTime: Date;
  days: string[];
};

type Props = {
  classes: UpcomingClass[];
  now: Date;
};

function formatClock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

type DayGroup = {
  dayIdx: number;
  offset: number;
  label: string;
  items: UpcomingClass[];
};

export function UpcomingDays({ classes, now }: Props) {
  const todayIdx = now.getDay();

  const groups: DayGroup[] = [];
  for (let offset = 1; offset <= 4 && groups.length < 3; offset++) {
    const dayIdx = (todayIdx + offset) % 7;
    const dayKey = DAY_ORDER[(dayIdx + 6) % 7]; // DAY_ORDER is monday-first
    if (!dayKey) continue;
    const items = classes
      .filter((c) => c.days.includes(dayKey))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (items.length === 0) continue;
    const full = DAY_FULL[dayKey];
    if (!full) continue;
    const label = offset === 1 ? "Tomorrow" : full.slice(0, 3);
    groups.push({ dayIdx, offset, label, items });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/40 p-5 text-center">
        <p className="text-sm font-medium text-foreground">No upcoming classes</p>
        <p className="mt-1 text-xs text-muted-foreground">Next 4 days look clear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {groups.length} day{groups.length !== 1 ? "s" : ""} with classes
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {groups.map((g) => (
          <div key={`${g.dayIdx}-${g.offset}`} className="flex gap-3">
            <div className="flex w-16 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card py-2">
              <span className="text-[11px] font-semibold text-muted-foreground">{g.label}</span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {g.items.map((c) => {
                const name = c.shortName?.trim() || c.code?.trim() || c.subject;
                return (
                  <div
                    key={c.id}
                    className="flex min-w-0 items-center gap-2 rounded-xl border border-border/40 bg-card px-2.5 py-1.5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{name}</p>
                      {c.room?.trim() && (
                        <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5 shrink-0" /> {c.room.trim()}
                        </p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {formatClock(c.startTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
