"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, Clock, CalendarDays, MapPin, Camera, Info } from "lucide-react";
import { getUserSchedules } from "@/app/(dashboard)/schedule/actions";
import { getUserReminders, updateReminder, type UpdateReminderResult } from "@/app/(dashboard)/reminders/actions";
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";
import { programReminderAlarms } from "@/lib/notification-scheduler";

type Day =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAY_SHORT: Record<Day, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const DAY_FULL: Record<Day, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_KEYS: Day[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MINUTE_OPTIONS = [5, 10, 15, 30, 60];

function fmtTime(value: string | Date): string {
  const d = new Date(value);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function startMinutes(value: string | Date): number {
  const d = new Date(value);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

type ReminderUi = {
  id: string;
  classId: string;
  minutesBefore: number;
  isActive: boolean;
};

export default function RemindersPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<null | Awaited<ReturnType<typeof getUserSchedules>>>(null);
  const [reminders, setReminders] = useState<ReminderUi[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushUpdating, setPushUpdating] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ kind: "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    getUserSchedules()
      .then((s) => {
        if (active) setSchedules(s);
      })
      .catch(() => {
        if (active) setSchedules([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getUserReminders()
      .then((r) => {
        if (active)
          setReminders(
            (r as unknown as ReminderUi[]).map((x) => ({
              ...x,
              // Prisma returns booleans/numbers as-is; keep the shape stable.
            }))
          );
      })
      .catch(() => {
        if (active) setReminders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Restore subscription state from the browser when supported.
  useEffect(() => {
    if (!isPushSupported()) return;
    let active = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (active) setPushEnabled(Boolean(sub));
      })
      .catch(() => {
        if (active) setPushEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Program local alarms whenever schedules or reminder settings change.
  useEffect(() => {
    if (!schedules || reminders.length === 0) return;
    programReminderAlarms(schedules as never, reminders as never).catch(() => {});
  }, [schedules, reminders]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const reminderByClass = new Map(reminders.map((r) => [r.classId, r]));
  const allClasses = (schedules ?? []).flatMap((s) =>
    s.classes.map((c) => ({ ...c, days: c.days as Day[] }))
  );

  const todayKey = DAY_KEYS[now.getDay()]!;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todays = allClasses
    .filter((c) => c.days.includes(todayKey) && startMinutes(c.startTime) > nowMin)
    .sort((a, b) => startMinutes(a.startTime) - startMinutes(b.startTime));

  let visible = todays;
  let contextLabel = "Today";

  if (todays.length === 0) {
    let nextIdx = -1;
    for (let offset = 1; offset <= 7; offset++) {
      const idx = (now.getDay() + offset) % 7;
      if (allClasses.some((c) => c.days.includes(DAY_KEYS[idx]!))) {
        nextIdx = idx;
        break;
      }
    }
    const nextKey = nextIdx >= 0 ? DAY_KEYS[nextIdx]! : null;
    visible = nextKey
      ? allClasses
          .filter((c) => c.days.includes(nextKey))
          .sort((a, b) => startMinutes(a.startTime) - startMinutes(b.startTime))
      : [];
    contextLabel = nextKey ? DAY_FULL[nextKey] : "Upcoming";
  }

  const togglePush = async () => {
    if (pushUpdating) return;
    setPushUpdating(true);
    setPushMessage(null);
    try {
      if (pushEnabled) {
        const result = await unsubscribeFromPush();
        if (result.ok) setPushEnabled(false);
        else setPushMessage({ kind: "error", text: result.reason });
      } else {
        const result = await subscribeToPush();
        if (result.ok) setPushEnabled(true);
        else setPushMessage({ kind: "error", text: result.reason });
      }
    } catch {
      setPushMessage({ kind: "error", text: "Something went wrong. Try again." });
    }
    setPushUpdating(false);
  };

  const toggleReminder = async (classId: string) => {
    const r = reminderByClass.get(classId);
    if (!r) return;
    const res = (await updateReminder(r.id, { isActive: !r.isActive })) as UpdateReminderResult;
    if (res.success) {
      setReminders((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x))
      );
    }
  };

  const changeMinutes = async (reminderId: string, minutes: number) => {
    const res = (await updateReminder(reminderId, { minutesBefore: minutes })) as UpdateReminderResult;
    if (res.success) {
      setReminders((prev) => prev.map((x) => (x.id === reminderId ? { ...x, minutesBefore: minutes } : x)));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-8 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reminders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Push alerts before your next classes — times come straight from your schedule.
        </p>
      </div>

      {/* Push subscription control */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-card/30 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pushEnabled ? "bg-green-500/15 text-green-600" : "bg-primary/12 text-primary"}`}>
            {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Class reminders</p>
            <p className="text-xs text-muted-foreground">
              {pushEnabled
                ? "You'll get a push alert before every class."
                : isPushSupported()
                  ? "Get a push alert before every class."
                  : "Push isn't supported on this browser."}
            </p>
          </div>
        </div>
        <Button
          variant={pushEnabled ? "outline" : "default"}
          size="sm"
          className="h-9 shrink-0"
          onClick={togglePush}
          disabled={pushUpdating || !isPushSupported()}
        >
          {pushEnabled ? "Turn off" : "Turn on"}
        </Button>
      </div>

      {pushMessage && (
        <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {pushMessage.text}
        </p>
      )}

      {pushEnabled && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Reminders fire at the exact class time from your timetable.
        </p>
      )}

      {schedules === null ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border/30 bg-card/30 px-4 py-3.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <Camera className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No classes yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Upload a photo of your class schedule and we&rsquo;ll automatically
            create a reminder for each class.
          </p>
          <Button className="mt-5" onClick={() => router.push("/schedule")}>
            <Camera className="mr-1.5 h-4 w-4" />
            Upload Schedule
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {contextLabel}
          </p>
          <div className="space-y-2">
            {visible.map((c, i) => {
              const reminder = reminderByClass.get(c.id);
              return (
                <div
                  key={c.id ?? i}
                  className="flex items-center gap-4 rounded-xl border border-border/30 bg-card/30 px-4 py-3.5 transition-[background-color,box-shadow] hover:shadow-sm"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: c.color + "1f", color: c.color }}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {c.shortName?.trim() || c.code?.trim() || c.subject}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fmtTime(c.startTime)} &ndash; {fmtTime(c.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {c.days.map((d) => DAY_SHORT[d]).join(", ")}
                      </span>
                      {c.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.room}
                        </span>
                      )}
                    </div>
                  </div>
                  {reminder && (
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        aria-label="Remind minutes before"
                        value={reminder.minutesBefore}
                        onChange={(e) => changeMinutes(reminder.id, Number(e.target.value))}
                        disabled={!reminder.isActive}
                        className="h-9 rounded-lg border border-border/60 bg-card px-2 text-xs font-medium text-foreground outline-none disabled:opacity-40"
                      >
                        {MINUTE_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m} min
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label={reminder.isActive ? "Turn reminder off" : "Turn reminder on"}
                        onClick={() => toggleReminder(reminder.classId)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                          reminder.isActive ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {reminder.isActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}