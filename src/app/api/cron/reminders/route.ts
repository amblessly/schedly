import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders } from "@/server/services/reminder-dispatcher.service";
import { dispatchTodoDeadlines } from "@/server/services/todo-deadline-reminder.service";
import { scheduleQstashReminders } from "@/server/services/qstash-reminder.service";
import { auditLog } from "@/server/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchDueReminders();
    auditLog("reminders.cron", result);

    // To-do deadline reminders for every user (fires even when the app is
    // closed; the client heartbeat covers the open-app case).
    const todos = await dispatchTodoDeadlines();
    auditLog("reminders.todos", todos);

    // Schedule exact-time QStash messages for the next round of occurrences.
    const scheduled = await scheduleQstashReminders();
    auditLog("reminders.qstash", scheduled);

    return NextResponse.json({ ok: true, ...result, todos, qstash: scheduled });
  } catch (err) {
    console.error("[CRON_REMINDERS]", err);
    return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}