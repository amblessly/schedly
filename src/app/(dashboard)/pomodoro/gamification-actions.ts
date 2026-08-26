"use server";

import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";

const XP_PER_LEVEL = [0, 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500];
const FOCUS_XP_PER_MINUTE = 1;
const TASK_XP = 5;

function calcLevel(xp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 1; i--) {
    if (xp >= (XP_PER_LEVEL[i] ?? 0)) return i + 1;
  }
  return 1;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getGamificationProfile() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  let profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    profile = await db.userProfile.create({
      data: { userId: session.user.id },
    });
  }

  const today = todayKey();
  if (profile.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakContinues = profile.lastActiveDate === yesterday;

    const updated = await db.userProfile.update({
      where: { userId: session.user.id },
      data: {
        lastActiveDate: today,
        currentStreak: streakContinues ? profile.currentStreak : 1,
        longestStreak: Math.max(
          profile.longestStreak,
          streakContinues ? profile.currentStreak + 1 : 1
        ),
      },
    });
    return updated;
  }

  return profile;
}

export async function logFocusSession(durationMinutes: number, completed: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  if (durationMinutes < 1 || durationMinutes > 480) {
    return { success: false, error: "Invalid duration" };
  }

  const xpEarned = completed ? Math.round(durationMinutes * FOCUS_XP_PER_MINUTE) : 0;

  try {
    await db.focusSession.create({
      data: {
        userId: session.user.id,
        duration: durationMinutes,
        completed,
        xpEarned,
        completedAt: completed ? new Date() : null,
      },
    });

    if (xpEarned > 0) {
      await db.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          xp: xpEarned,
          level: 1,
          totalFocusMinutes: durationMinutes,
          lastActiveDate: todayKey(),
        },
        update: {
          xp: { increment: xpEarned },
          totalFocusMinutes: { increment: durationMinutes },
          lastActiveDate: todayKey(),
        },
      });

      const profile = await db.userProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (profile) {
        const newLevel = calcLevel(profile.xp);
        if (newLevel > profile.level) {
          await db.userProfile.update({
            where: { userId: session.user.id },
            data: { level: newLevel },
          });
        }
      }
    }

    return { success: true, xpEarned };
  } catch (err) {
    console.error("[LOG_FOCUS]", err);
    return { success: false, error: "Failed to log session" };
  }
}

export async function logTaskCompleted() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  try {
    await db.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        xp: TASK_XP,
        level: 1,
        totalTasksCompleted: 1,
        lastActiveDate: todayKey(),
      },
      update: {
        xp: { increment: TASK_XP },
        totalTasksCompleted: { increment: 1 },
        lastActiveDate: todayKey(),
      },
    });

    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (profile) {
      const newLevel = calcLevel(profile.xp);
      if (newLevel > profile.level) {
        await db.userProfile.update({
          where: { userId: session.user.id },
          data: { level: newLevel },
        });
      }
    }
  } catch (err) {
    console.error("[LOG_TASK]", err);
  }
}

export async function getRecentFocusSessions(limit = 7) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  return db.focusSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
