import { type NextRequest, NextResponse } from "next/server";
import { getReleaseInfo } from "@/server/lib/release-store";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const info = await getReleaseInfo();
    return NextResponse.json(
      { current: info },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[ADMIN_APK_API] Error:", error);
    return NextResponse.json({ current: null }, { status: 200 });
  }
}
