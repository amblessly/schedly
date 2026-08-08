import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await db.fCMToken.upsert({
    where: { token },
    create: { userId: session.user.id, token },
    update: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (token) {
    await db.fCMToken.deleteMany({ where: { token, userId: session.user.id } });
  } else {
    // No token sent — drop every FCM token for this user (signed-out cleanup).
    await db.fCMToken.deleteMany({ where: { userId: session.user.id } });
  }
  return NextResponse.json({ ok: true });
}