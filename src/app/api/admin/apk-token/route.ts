import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/server/lib/auth";
import {
  computeVersionCode,
  putReleaseApk,
  putReleaseInfo,
  type ReleaseInfo,
} from "@/server/lib/release-store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const versionName = (url.searchParams.get("versionName") || "").replace(/^v/i, "").trim();
    const updateMessage =
      url.searchParams.get("updateMessage")?.trim() ||
      (versionName ? `New version ${versionName} is now available.` : "");

    if (!versionName) {
      return NextResponse.json({ error: "Version name is required." }, { status: 400 });
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: "APK body is required." }, { status: 400 });
    }

    const apkKey = `releases/Schedly-${versionName}-release.apk`;
    await putReleaseApk(
      apkKey,
      Readable.from(bytes),
      "application/vnd.android.package-archive"
    );

    const versionInfo: ReleaseInfo = {
      versionCode: computeVersionCode(versionName),
      versionName,
      apkUrl: `https://app.schedly.shop/api/admin/apk-download?v=${versionName}`,
      updateMessage,
    };

    await putReleaseInfo(versionInfo);

    return NextResponse.json({ ok: true, versionInfo });
  } catch (error) {
    console.error("[APK_TOKEN_API] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
