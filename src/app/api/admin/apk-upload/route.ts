import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/server/lib/auth";
import {
  computeVersionCode,
  putReleaseApk,
  putReleaseInfo,
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
    const { versionName, updateMessage: rawMessage, apkUrl } = await request.json();
    const clean = String(versionName || "").replace(/^v/i, "").trim();
    const updateMessage =
      String(rawMessage || "").trim() || `New version ${clean} is now available.`;

    if (!clean) {
      return NextResponse.json({ error: "Version name is required." }, { status: 400 });
    }

    const apkKey = `releases/Schedly-${clean}-release.apk`;
    const sourceUrl =
      String(apkUrl || "").trim() ||
      `https://github.com/sairwhat/project-schedly/raw/master/release/Schedly-${clean}-release.apk`;

    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: `Could not fetch APK from source (${res.status}).` },
        { status: 502 }
      );
    }

    await putReleaseApk(
      apkKey,
      Readable.fromWeb(res.body as unknown as import("node:stream/web").ReadableStream),
      "application/vnd.android.package-archive"
    );

    const proxyUrl = `https://app.schedly.shop/api/admin/apk-download?v=${clean}`;

    const versionInfo = {
      versionCode: computeVersionCode(clean),
      versionName: clean,
      apkUrl: proxyUrl,
      updateMessage,
    };

    await putReleaseInfo(versionInfo);

    return NextResponse.json({ ok: true, versionInfo, url: proxyUrl });
  } catch (error) {
    console.error("[APK_UPLOAD_API] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
