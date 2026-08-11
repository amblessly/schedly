import { NextResponse } from "next/server";
import {
  verifyQstashRequest,
  sendClassReminderPush,
} from "@/server/services/qstash-reminder.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// QStash delivers an exact-time HTTP request here for each scheduled class
// reminder. Always returns 200 so QStash doesn't retry a no-op; idempotency
// is enforced server-side via reminders.lastSentAt.
export async function POST(req: Request) {
  const raw = await req.text();
  const valid = await verifyQstashRequest(req, raw);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (JSON.parse(raw || "{}") || {}) as {
      reminderId?: string;
      fireAt?: number;
    };
    if (!body.reminderId) {
      return NextResponse.json({ ok: true });
    }
    const result = await sendClassReminderPush({
      reminderId: body.reminderId,
      scheduledFireAt: typeof body.fireAt === "number" ? body.fireAt : Date.now(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[REMINDER_FIRE]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
