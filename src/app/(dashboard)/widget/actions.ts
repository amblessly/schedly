"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";
import { scheduleService } from "@/server/services/schedule.service";
import { auditLog } from "@/server/lib/audit";

export type WidgetTokenResult = { success: true; url: string } | { success: false; error: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateToken() {
  return randomBytes(32).toString("base64url");
}

function buildWidgetUrl(token: string) {
  return `${APP_URL}/widget?token=${token}`;
}

async function resolveUserByToken(token: string) {
  if (!token || token.length < 20) return null;
  const user = await db.user.findUnique({ where: { widgetToken: token } });
  return user ?? null;
}

export async function getWidgetToken(): Promise<WidgetTokenResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const existing = await db.user.findUnique({
    where: { id: session.user.id },
    select: { widgetToken: true },
  });

  let token = existing?.widgetToken ?? null;
  if (!token) {
    token = generateToken();
    await db.user.update({ where: { id: session.user.id }, data: { widgetToken: token } });
    auditLog("widget.token_create", { userId: session.user.id });
  }

  return { success: true, url: buildWidgetUrl(token) };
}

export async function regenerateWidgetToken(): Promise<WidgetTokenResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const token = generateToken();
  await db.user.update({ where: { id: session.user.id }, data: { widgetToken: token } });
  auditLog("widget.token_regenerate", { userId: session.user.id });

  return { success: true, url: buildWidgetUrl(token) };
}

export async function getSchedulesByToken(token: string) {
  const user = await resolveUserByToken(token);
  if (!user) return null;

  return scheduleService.getByUser(user.id);
}