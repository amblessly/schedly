import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.endpoint !== "string" || !body.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const p256dh = body.keys?.p256dh;
  const authKey = body.keys?.auth;
  if (typeof p256dh !== "string" || typeof authKey !== "string") {
    return NextResponse.json({ error: "Missing subscription keys" }, { status: 400 });
  }

  const timezone = typeof body.timezone === "string" ? body.timezone.slice(0, 64) : "UTC";

  await db.$transaction(async (tx) => {
    await tx.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId: session.user.id,
        endpoint: body.endpoint,
        p256dh,
        auth: authKey,
        timezone,
      },
      update: {
        userId: session.user.id,
        p256dh,
        auth: authKey,
        timezone,
      },
    });

    // Remember the user's real timezone (the model defaults to UTC, which
    // would shift every reminder by the DST/UTC offset).
    if (timezone !== "UTC") {
      await tx.user.updateMany({
        where: { id: session.user.id, timezone: "UTC" },
        data: { timezone },
      });
    }
  });

  return NextResponse.json({ ok: true });
}