"use server";

import { db } from "@/server/db/client";
import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";

export async function checkUsername(
  username: string
): Promise<{ available: boolean } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized" };

  const cleaned = username.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  if (cleaned.length < 3 || cleaned.length > 30) {
    return { error: "Username must be 3–30 characters" };
  }

  try {
    const existing = await db.user.findUnique({
      where: { username: cleaned },
      select: { id: true },
    });
    const isSelf = existing?.id === session.user.id;
    return { available: !existing || isSelf };
  } catch (err) {
    console.error("[checkUsername]", err);
    return { error: "Could not check username. Try again." };
  }
}