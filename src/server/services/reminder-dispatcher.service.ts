import { db } from "@/server/db/client";
import { sendPush, isVapidConfigured } from "@/server/lib/web-push";
import { sendFCMPush, isFcmConfigured } from "@/server/lib/firebase-admin";
import type { DayOfWeek } from "@/generated/prisma/client";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Wall-clock hour/minute of a stored class time. Class times are saved with
 *  UTC components carrying the intended local wall clock (see parseTime). */
function wallParts(d: Date): { h: number; m: number } {
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

/** Offset (ms) of a given IANA timezone at a moment, so wall-clock times can
 *  be translated to absolute instants without a date library. */
function tzOffsetMs(timezone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return asUtc - at.getTime();
  } catch {
    return 0;
  }
}

/** Local weekday (0=Sunday) of `at` in the given timezone. */
function localWeekday(timezone: string, at: Date): number {
  try {
    const key = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(at);
    const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(key);
    return idx >= 0 ? idx : at.getUTCDay();
  } catch {
    return at.getUTCDay();
  }
}

/** Next occurrence (epoch ms, strictly after `now`) of a class that falls on
 *  `days`, interpreted as wall-clock hh:mm in the user's timezone. */
export function nextOccurrence(
  startTime: Date,
  days: DayOfWeek[],
  timezone: string,
  now: Date
): number | null {
  const { h, m } = wallParts(startTime);
  const tz = timezone || "UTC";

  for (let i = 0; i <= 14; i++) {
    const probe = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const localKey = DAYS_OF_WEEK[localWeekday(tz, probe)]!;
    if (!days.includes(localKey)) continue;

    const offset = tzOffsetMs(tz, probe);
    const instant = Date.UTC(
      probe.getUTCFullYear(),
      probe.getUTCMonth(),
      probe.getUTCDate(),
      h,
      m
    ) - offset;
    if (instant > now.getTime()) return instant;
  }
  return null;
}

export async function dispatchDueReminders(now: Date = new Date()) {
  if (!isVapidConfigured() && !isFcmConfigured()) return { sent: 0, checked: 0 };

  const reminders = await db.reminder.findMany({
    where: { isActive: true },
    include: {
      class: { include: { schedule: true } },
      user: { select: { id: true, timezone: true } },
    },
  });

  const subsByUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  const subRows = await db.pushSubscription.findMany();
  for (const sub of subRows) {
    const list = subsByUser.get(sub.userId) ?? [];
    list.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    subsByUser.set(sub.userId, list);
  }

  const fcmTokensByUser = new Map<string, number>();
  const fcmRows = await db.fCMToken.findMany({ select: { userId: true } });
  for (const row of fcmRows) {
    fcmTokensByUser.set(row.userId, (fcmTokensByUser.get(row.userId) ?? 0) + 1);
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const reminder of reminders) {
    const cls = reminder.class;
    if (cls.days.length === 0) continue;

    const tz = reminder.user.timezone || "UTC";
    const occ = nextOccurrence(cls.startTime, cls.days as DayOfWeek[], tz, now);
    if (occ === null) continue;

    const label = cls.shortName?.trim() || cls.code?.trim() || cls.subject;
    const startLabelTxt = startLabel(cls.startTime);
    const minutes = reminder.minutesBefore;

    // 1) "Upcoming" push: now falls inside [occurrence - minutesBefore, occurrence - 30s].
    //    The 30s slack prevents double-delivery when two crons run back-to-back.
    const dueFrom = occ - minutes * 60 * 1000;
    const dueTo = occ - 30 * 1000;
    const inBeforeWindow = now.getTime() >= dueFrom && now.getTime() <= dueTo;
    // Dedupe: never fire twice for the same occurrence.
    const beforeFired = reminder.lastSentAt && reminder.lastSentAt.getTime() >= dueFrom;

    if (inBeforeWindow && !beforeFired) {
      // FCM is the primary channel; legacy web-push subs are the fallback
      // for devices that subscribed before the FCM migration.
      if ((fcmTokensByUser.get(reminder.userId) ?? 0) === 0) {
        const subs = subsByUser.get(reminder.userId) ?? [];
        if (subs.length > 0) {
          await Promise.all(
            subs.map(async (sub) => {
              const result = await sendPush(sub, {
                title: "Upcoming class",
                body:
                  minutes > 0
                    ? `${label} starts in ${minutes} min (${startLabelTxt})`
                    : `${label} starts now (${startLabelTxt})`,
                url: "/schedule",
              });
if (result.stale) staleEndpoints.push(sub.endpoint);
            })
          );
        }
      } else {
        await sendFCMPush({
          userId: reminder.userId,
          title: "Upcoming class",
          body:
            minutes > 0
              ? `${label} starts in ${minutes} min (${startLabelTxt})`
              : `${label} starts now (${startLabelTxt})`,
          url: "/schedule",
        });
      }

      await db.reminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: new Date(dueFrom) },
      });

      // Also record in the in-app notification list.
      await db.notification.create({
        data: {
          userId: reminder.userId,
          type: "class_reminder",
          title: "Upcoming class",
          body: `Reminder: ${label} starts in ${minutes} min.`,
          scheduledAt: new Date(occ),
        },
      });

      sent++;
      continue;
    }

    // 2) "Starting now" window: exactly at the class time (cron fires on the
    //    top of the minute, so allow up to 60s of delay). Fires a second
    //    notification so the user knows the class has begun.
    const inStartWindow = now.getTime() >= occ && now.getTime() <= occ + 60 * 1000;
    // Dedupe against the before-window marker (dueFrom < occ, so an upcoming
    // push never blocks the "starting now" one).
    if (inStartWindow && !(reminder.lastSentAt && reminder.lastSentAt.getTime() >= occ)) {
      // FCM is the primary channel; legacy web-push subs are the fallback.
      if ((fcmTokensByUser.get(reminder.userId) ?? 0) === 0) {
        const subs = subsByUser.get(reminder.userId) ?? [];
        if (subs.length > 0) {
          await Promise.all(
            subs.map(async (sub) => {
              const result = await sendPush(sub, {
                title: "Class starting now",
                body: `You have class today — ${label} at ${startLabelTxt}`,
                url: "/schedule",
              });
              if (result.stale) staleEndpoints.push(sub.endpoint);
            })
          );
        }
      } else {
        await sendFCMPush({
          userId: reminder.userId,
          title: "Class starting now",
          body: `You have class today — ${label} at ${startLabelTxt}`,
          url: "/schedule",
        });
      }

      await db.reminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: new Date(occ) },
      });

      // Also record in the in-app notification list.
      await db.notification.create({
        data: {
          userId: reminder.userId,
          type: "class_reminder",
          title: "Class starting now",
          body: `${label} starts now (${startLabelTxt})`,
          scheduledAt: new Date(occ),
        },
      });

      sent++;
      continue;
    }
  }

  if (staleEndpoints.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
  }

  return { sent, checked: reminders.length };
}

function startLabel(startTime: Date): string {
  const { h, m } = wallParts(startTime); // stored wall clock == intended wall clock
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export { DAYS_OF_WEEK };