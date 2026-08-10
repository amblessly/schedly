import { type NextRequest, NextResponse } from "next/server";
import { getReleaseInfo } from "@/server/lib/release-store";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const info = await getReleaseInfo();

    if (!info) {
      return NextResponse.json(
        { hasUpdate: false },
        { status: 404 }
      );
    }

    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[VERSION_API] Error:", error);
    return NextResponse.json({ hasUpdate: false }, { status: 500 });
  }
}
