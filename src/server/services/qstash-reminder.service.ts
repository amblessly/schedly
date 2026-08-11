import { Client, Receiver } from "@upstash/qstash";
import { db } from "@/server/db/client";
import { sendPush, isVapidConfigured } from "@/server/lib/web-push";
import { sendFCMPush, isFcmConfigured } from "@/server/lib/firebase-admin";
import { nextOccurrence } from "@/server/services/reminder-dispatcher.service";
import type { DayOfWeek } from "@/generated/prisma/client";

/*
 * Exact-time class reminders via Upstash QStash.
 *
 * Vercel Hobby crons run at most once per day (with ±59min precision), so the
 * server can't hit every reminder window by itself. QStash delivers an HTTP
 * request at an exact time, so we schedule two messages per class occurrence:
 *   - "pre"   at [class start - minutesBefore] → the "Upcoming class" push
 *   - "start" at [class start]                 → the "Class starting now" push
 * The `/api/reminders/fire` endpoint turns each into the same push + in-app
 * notification the dispatcher sends.
 *
 * Scheduling is refreshed from three places: the daily cron (everyone, safety
 * net), the client layout after login/navigation (throttled), and the
 * reminder update action (immediately after edits). Delivery is deduped per
 * (user, occurrence) — both server-side (reminders.lastSentAt /
 * lastStartSentAt) and at scheduling time (one message per occurrence even
 * when duplicate schedules/reminders exist) — so re-scheduling and duplicate
 * schedules never double-notify.
 */

let _client: Client | null = null;

// QStash free tier caps how far ahead a message can be scheduled (7 days).
const MAX_DELAY_MS = 604_800_000; // 604800 seconds

function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  if (!_client) _client = new Client({ token });
  return _client;
}

export function isQstashConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_TOKEN &&
      process.env.QSTASH_CURRENT_SIGNING_KEY &&
      process.env.QSTASH_NEXT_SIGNING_KEY
  );
}

export async function verifyQstashRequest(req: Request, rawBody: string): Promise<boolean> {
  if (!isQstashConfigured()) return true;
  const signature = req.headers.get("upstash-signature") || "";
  if (!signature) return false;
  try {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });
    return await receiver.verify({ signature, body: rawBody });
  } catch (err) {
    console.error("[QSTASH_VERIFY]", err);
    return false;
  }
}

export async function scheduleQstashReminders(
  now: Date = new Date(),
  userId?: string
): Promise<{ scheduled: number; skipped: number; total: number }> {
  const client = getQStashClient();
  if (!client) return { scheduled: 0, skipped: 0, total: 0 };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://app.schedly.shop";

  const reminders = await db.reminder.findMany({
    where: userId ? { isActive: true, userId } : { isActive: true },
    include: {
      class: true,
      user: { select: { id: true, timezone: true } },
    },
  });

  let scheduled = 0;
  let skipped = 0;

  // One message per (user, occurrence) even when the same class exists in
  // several schedules — otherwise every duplicate reminder row schedules its
  // own push and the user gets N identical notifications.
  const seenPre = new Set<string>();
  const seenStart = new Set<string>();

  for (const reminder of reminders) {
    const cls = reminder.class;
    if (cls.days.length === 0) continue;

    const tz = reminder.user.timezone || "Asia/Manila";
    const occ = nextOccurrence(cls.startTime, cls.days as DayOfWeek[], tz, now);
    if (occ === null) continue;

    const minutes = reminder.minutesBefore * 60 * 1000;
    const key = `${reminder.userId}:${occ}`;

    // "Upcoming class" push at exactly [start - minutesBefore].
    const preAt = occ - minutes;
    if (
      preAt > now.getTime() &&
      preAt <= now.getTime() + MAX_DELAY_MS &&
      !seenPre.has(key)
    ) {
      seenPre.add(key);
      try {
        await client.publishJSON({
          url: `${baseUrl}/api/reminders/fire`,
          method: "POST",
          body: { reminderId: reminder.id, occ, kind: "pre" },
          // The Upstash-Not-Before header expects unix SECONDS (not ms).
          notBefore: Math.floor(preAt / 1000),
          messageId: `rem-${reminder.id}-${occ}-pre`,
          retries: 1,
        });
        scheduled++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/duplicate|already exists|maxDelay/i.test(msg)) {
          skipped++;
        } else {
          console.error("[QSTASH_SCHEDULE]", err);
        }
      }
    }

    // "Class starting now" push at exactly [start].
    if (
      occ > now.getTime() &&
      occ <= now.getTime() + MAX_DELAY_MS &&
      !seenStart.has(key)
    ) {
      seenStart.add(key);
      try {
        await client.publishJSON({
          url: `${baseUrl}/api/reminders/fire`,
          method: "POST",
          body: { reminderId: reminder.id, occ, kind: "start" },
          notBefore: Math.floor(occ / 1000),
          messageId: `rem-${reminder.id}-${occ}-start`,
          retries: 1,
        });
        scheduled++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/duplicate|already exists|maxDelay/i.test(msg)) {
          skipped++;
        } else {
          console.error("[QSTASH_SCHEDULE]", err);
        }
      }
    }
  }

  return { scheduled, skipped, total: reminders.length };
}

function wallParts(d: Date): { h: number; m: number } {
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

function startLabel(startTime: Date): string {
  const { h, m } = wallParts(startTime);
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

async function deliverPushToUser(
  userId: string,
  title: string,
  body: string
): Promise<string[]> {
  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  const stale: string[] = [];
  if (subs.length > 0 && isVapidConfigured()) {
    await Promise.all(
      subs.map(async (sub) => {
        const result = await sendPush(sub, { title, body, url: "/schedule" });
        if (result.stale) stale.push(sub.endpoint);
      })
    );
    return stale;
  }
  if (isFcmConfigured()) {
    await sendFCMPush({ userId, title, body, url: "/schedule" });
  }
  return stale;
}

/**
 * Fire one class reminder (idempotent). Used by the QStash webhook at the
 * scheduled exact time.
 *
 * `kind: "pre"`   → "Upcoming class" at [start - minutesBefore]
 * `kind: "start"` → "Class starting now" at [start]
 *
 * Duplicates (same class in several schedules, cron catch-up, QStash retries)
 * are deduped per (reminder, occurrence): `lastSentAt` guards the upcoming
 * push, `lastStartSentAt` guards the starting-now push.
 */
export async function sendClassReminderPush(args: {
  reminderId: string;
  occ: number;
  kind?: "pre" | "start";
}): Promise<{ sent: boolean; reason?: string }> {
  const { reminderId, occ, kind = "pre" } = args;
  const reminder = await db.reminder.findUnique({
    where: { id: reminderId },
    include: {
      class: true,
      user: { select: { id: true, timezone: true } },
    },
  });
  if (!reminder || !reminder.isActive) return { sent: false, reason: "inactive" };

  const cls = reminder.class;
  const label = cls.shortName?.trim() || cls.code?.trim() || cls.subject;
  const startLabelTxt = startLabel(cls.startTime);

  if (kind === "start") {
    // "Class starting now" — deduped with lastStartSentAt so a cron
    // catch-up or QStash retry never delivers it twice for one occurrence.
    if (reminder.lastStartSentAt && reminder.lastStartSentAt.getTime() >= occ) {
      return { sent: false, reason: "already-sent" };
    }
    const title = "Class starting now";
    const body = `You have class today — ${label} at ${startLabelTxt}`;

    const stale = await deliverPushToUser(reminder.userId, title, body);

    await db.reminder.update({
      where: { id: reminder.id },
      data: { lastStartSentAt: new Date(occ) },
    });

    await db.notification.create({
      data: {
        userId: reminder.userId,
        type: "class_reminder",
        title,
        body: `${label} starts now (${startLabelTxt})`,
        scheduledAt: new Date(occ),
      },
    });

    if (stale.length > 0) {
      await db.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
    }

    return { sent: true };
  }

  // "Upcoming class" at [start - minutesBefore]. The isStarting branch only
  // triggers when the scheduled message was delivered noticeably late.
  if (reminder.lastSentAt && reminder.lastSentAt.getTime() >= occ) {
    return { sent: false, reason: "already-sent" };
  }

  const now = new Date();
  const remaining = Math.max(0, Math.round((occ - now.getTime()) / 60000));
  const isStarting = remaining <= 0;
  const title = isStarting ? "Class starting now" : "Upcoming class";
  const body = isStarting
    ? `You have class today — ${label} at ${startLabelTxt}`
    : remaining > 180
      ? `${label} at ${startLabelTxt}`
      : remaining > 0
        ? `${label} starts in ${remaining} min (${startLabelTxt})`
        : `${label} at ${startLabelTxt}`;

  const stale = await deliverPushToUser(reminder.userId, title, body);

  await db.reminder.update({
    where: { id: reminder.id },
    data: { lastSentAt: new Date(occ) },
  });

  await db.notification.create({
    data: {
      userId: reminder.userId,
      type: "class_reminder",
      title,
      body: isStarting
        ? `${label} starts now (${startLabelTxt})`
        : `Reminder: ${label} at ${startLabelTxt}.`,
      scheduledAt: new Date(occ),
    },
  });

  if (stale.length > 0) {
    await db.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
  }

  return { sent: true };
}
