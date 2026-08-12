"use server";

import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";
import { notificationService } from "@/server/services/notification.service";
import { auditLog } from "@/server/lib/audit";

export async function getUserNotifications() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];
  return notificationService.getByUser(session.user.id);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return 0;
  return notificationService.countUnread(session.user.id);
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };
  try {
    await notificationService.markAsRead(id);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };
  try {
    await notificationService.markAllAsRead(session.user.id);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };
  try {
    await notificationService.delete(id);
    auditLog("notification.delete", { userId: session.user.id, notificationId: id });
    return { success: true };
  } catch {
    return { success: false };
  }
}
