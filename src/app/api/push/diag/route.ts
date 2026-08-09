import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

// Temporary diagnostic: the service worker posts every raw push payload here
// so we can confirm delivery from FCM all the way into the SW, and see the
// exact bytes the browser hands to the push handler.
export async function POST(req: Request) {
  try {
    const raw = (await req.text()).slice(0, 2000);
    const adminUser = await db.user.findFirst({ where: { isAdmin: true } });
    if (adminUser) {
      await db.notification.create({
        data: {
          userId: adminUser.id,
          type: "system",
          title: "PUSH-DIAG",
          body: raw || "(empty payload)",
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
