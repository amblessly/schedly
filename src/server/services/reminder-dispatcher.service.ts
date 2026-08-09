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

/** Local calendar date + UTC offset of `at` in the given timezone. The wall
 *  clock stored in start_time is the user's local time, so the occurrence
 *  instant must be built from the LOCAL date — not the UTC date, which drifts
 *  by up to a day (e.g. at 18:00 UTC it's already 02:00 the next day in
 *  Asia/Manila). */
function localParts(timezone: string, at: Date): {
  y: number;
  mo: number;
  d: number;
  offsetMs: number;
} {
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
  return { y: get("year"), mo: get("month"), d: get("day"), offsetMs: asUtc - at.getTime() };
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
  return nearestOccurrence(startTime, days, timezone, now, true);
}

/** Latest occurrence (epoch ms, at or before `now`) — lets a delayed cron
 *  still catch an occurrence that already started instead of skipping to the
 *  next week. */
export function lastOccurrence(
  startTime: Date,
  days: DayOfWeek[],
  timezone: string,
  now: Date
): number | null {
  return nearestOccurrence(startTime, days, timezone, now, false);
}

function nearestOccurrence(
  startTime: Date,
  days: DayOfWeek[],
  timezone: string,
  now: Date,
  future: boolean
): number | null {
  const { h, m } = wallParts(startTime);
  const tz = timezone || "UTC";
  const step = future ? 1 : -1;
  let best: number | null = null;

  for (let i = 0; i <= 14; i++) {
    const probe = new Date(now.getTime() + step * i * 24 * 60 * 60 * 1000);
    const localKey = DAYS_OF_WEEK[localWeekday(tz, probe)]!;
    if (!days.includes(localKey)) continue;

    const lp = localParts(tz, probe);
    const instant = Date.UTC(lp.y, lp.mo - 1, lp.d, h, m) - lp.offsetMs;
    if (future) {
      if (instant > now.getTime()) return instant;
    } else if (instant <= now.getTime()) {
      best = best === null ? instant : Math.max(best, instant);
    }
  }
  return best;
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

  // Native Web Push (VAPID) is the primary channel; FCM remains the fallback
  // for devices subscribed before the migration.
  const deliverPush = async (
    reminderUserId: string,
    title: string,
    body: string
  ): Promise<string[]> => {
    const subs = subsByUser.get(reminderUserId) ?? [];
    const stale: string[] = [];
    if (subs.length > 0) {
      await Promise.all(
        subs.map(async (sub) => {
          const result = await sendPush(sub, { title, body, url: "/schedule" });
          if (result.stale) stale.push(sub.endpoint);
        })
      );
      return stale;
    }
    if ((fcmTokensByUser.get(reminderUserId) ?? 0) > 0) {
      await sendFCMPush({ userId: reminderUserId, title, body, url: "/schedule" });
    }
    return stale;
  };

  let sent = 0;
  const staleEndpoints: string[] = [];
  // Grace period after a class starts: a delayed cron can still deliver the
  // "starting now" push during this window instead of skipping the occurrence.
  const START_CATCHUP_MS = 90 * 60 * 1000;

  for (const reminder of reminders) {
    const cls = reminder.class;
    if (cls.days.length === 0) continue;

    const tz = reminder.user.timezone || "UTC";
    const occNext = nextOccurrence(cls.startTime, cls.days as DayOfWeek[], tz, now);
    const occPrev = lastOccurrence(cls.startTime, cls.days as DayOfWeek[], tz, now);

    const label = cls.shortName?.trim() || cls.code?.trim() || cls.subject;
    const startLabelTxt = startLabel(cls.startTime);
    const minutes = reminder.minutesBefore;

    // 1) "Upcoming" push: now is between [occurrence - minutesBefore] and the
    //    class start. Catch-up semantics — a delayed cron fires this as long
    //    as the class hasn't started yet (no fixed end-of-window).
    const beforeFired = reminder.lastSentAt && reminder.lastSentAt.getTime() >= (occNext ?? 0) - minutes * 60 * 1000;
    const inBeforeWindow =
      occNext !== null &&
      now.getTime() >= occNext - minutes * 60 * 1000 &&
      !beforeFired;

    if (inBeforeWindow) {
      const remaining = Math.max(0, Math.round((occNext! - now.getTime()) / 60000));
      staleEndpoints.push(
        ...(await deliverPush(
          reminder.userId,
          "Upcoming class",
          remaining > 0
            ? `${label} starts in ${remaining} min (${startLabelTxt})`
            : `${label} starts now (${startLabelTxt})`
        ))
      );

      await db.reminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: new Date(occNext! - minutes * 60 * 1000) },
      });

      // Also record in the in-app notification list.
      await db.notification.create({
        data: {
          userId: reminder.userId,
          type: "class_reminder",
          title: "Upcoming class",
          body: `Reminder: ${label} starts in ${remaining} min.`,
          scheduledAt: new Date(occNext!),
        },
      });

      sent++;
      continue;
    }

    // 2) "Starting now" push: the most recent occurrence is current (within
    //    the catch-up grace), so a delayed cron still reports it.
    const inStartWindow =
      occPrev !== null &&
      now.getTime() <= occPrev + START_CATCHUP_MS &&
      !(occNext !== null && now.getTime() >= occNext - minutes * 60 * 1000) &&
      !(reminder.lastSentAt && reminder.lastSentAt.getTime() >= occPrev);
    if (inStartWindow) {
      staleEndpoints.push(
        ...(await deliverPush(
          reminder.userId,
          "Class starting now",
          `You have class today — ${label} at ${startLabelTxt}`
        ))
      );

      await db.reminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: new Date(occPrev!) },
      });

      // Also record in the in-app notification list.
      await db.notification.create({
        data: {
          userId: reminder.userId,
          type: "class_reminder",
          title: "Class starting now",
          body: `${label} starts now (${startLabelTxt})`,
          scheduledAt: new Date(occPrev!),
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