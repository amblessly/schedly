"use server";

import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { reminderService } from "@/server/services/reminder.service";
import { auditLog } from "@/server/lib/audit";

export async function getUserReminders() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];
  return reminderService.getByUser(session.user.id);
}

export type UpdateReminderResult =
  | { success: true }
  | { success: false; error: string };

export async function updateReminder(
  reminderId: string,
  data: { minutesBefore?: number; isActive?: boolean }
): Promise<UpdateReminderResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const minutes = data.minutesBefore;
  if (minutes != null && (minutes < 0 || minutes > 1440 || !Number.isInteger(minutes))) {
    return { success: false, error: "Invalid minutes" };
  }

  const reminder = await reminderService.getById(reminderId);
  if (!reminder || reminder.userId !== session.user.id) {
    return { success: false, error: "Reminder not found" };
  }

  try {
    await reminderService.update(reminderId, {
      minutesBefore: minutes ?? undefined,
      isActive: data.isActive ?? undefined,
    });
    auditLog("reminders.update", { reminderId, minutesBefore: minutes, isActive: data.isActive });
    return { success: true };
  } catch (err) {
    console.error("[UPDATE_REMINDER]", err);
    return { success: false, error: "Failed to update reminder" };
  }
}