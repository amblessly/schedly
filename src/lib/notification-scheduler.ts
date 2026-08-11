"use client";

/* Client-side reminder alarms: computes the next class occurrence from the
 * timetable (same day/time semantics the app uses everywhere) and programs
 * the service worker to fire a local notification at exactly
 * [start - minutesBefore], even when Schedly isn't open (Notification Triggers).
 */

type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const DAY_KEYS: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface Alarm {
  id: string;
  fireAt: number;
  title: string;
  body: string;
  url?: string;
}

interface AlarmClass {
  id: string;
  days: DayKey[];
  startTime: Date | string;
  shortName?: string | null;
  code?: string | null;
  subject?: string | null;
  room?: string | null;
}
interface AlarmSchedule {
  classes: AlarmClass[];
}
interface AlarmReminder {
  id: string;
  classId: string;
  minutesBefore: number;
  isActive: boolean;
}

/**
 * Next occurrence (local epoch ms, strictly after `now`) of a class whose
 * wall-clock start time is stored as UTC hours (the app's convention).
 */
function nextOccurrenceMs(
  startTime: Date | string,
  days: DayKey[],
  now: Date
): number | null {
  const d = new Date(startTime);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (days.length === 0) return null;

  for (let i = 0; i <= 14; i++) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m);
    if (candidate.getTime() <= now.getTime()) continue;
    if (days.includes(DAY_KEYS[candidate.getDay()]!)) return candidate.getTime();
  }
  return null;
}

function clockLabel(h: number, m: number): string {
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function classLabel(cls: AlarmClass): string {
  return cls.shortName?.trim() || cls.code?.trim() || cls.subject?.trim() || "Class";
}

export function computeAlarms(
  schedules: AlarmSchedule[],
  reminders: AlarmReminder[],
  now: Date = new Date()
): Alarm[] {
  const byClass = new Map(reminders.map((r) => [r.classId, r]));
  const alarms: Alarm[] = [];

  for (const schedule of schedules) {
    for (const cls of schedule.classes ?? []) {
      const rem = byClass.get(cls.id);
      if (rem && !rem.isActive) continue;
      const occ = nextOccurrenceMs(cls.startTime, cls.days, now);
      if (occ === null) continue;
      const label = classLabel(cls);
      const time = clockLabel(new Date(cls.startTime).getUTCHours(), new Date(cls.startTime).getUTCMinutes());
      // The "-X min" (upcoming) reminder is served by the server push (QStash
      // exact-time + daily cron). Only the "class starting now" alarm stays
      // local — otherwise the same reminder arrives twice on the device.
      if (occ > now.getTime()) {
        alarms.push({
          id: `${cls.id}:start`,
          fireAt: occ,
          title: "Class starting now",
          body: `You have class today — ${label} at ${time}.`,
          url: "/schedule",
        });
      }
    }
  }
  return alarms;
}

/** Program local alarm reminders into the service worker. */
export async function programReminderAlarms(
  schedules: AlarmSchedule[],
  reminders: AlarmReminder[],
  suppress = false
): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (suppress) {
    await postAlarms([]);
    return;
  }

  const alarms = computeAlarms(schedules, reminders);
  await postAlarms(alarms);
}

async function postAlarms(alarms: Alarm[]): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "PROGRAM_ALARMS", alarms });
  } catch {
    // SW not ready — alarms will re-arm on its own activation.
  }
}