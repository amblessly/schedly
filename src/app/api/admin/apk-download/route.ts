import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { b2Client, B2_BUCKET } from "@/server/lib/b2-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!B2_BUCKET) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const version = (request.nextUrl.searchParams.get("v") || "").replace(/^v/i, "").trim();

  if (!/^\d+(\.\d+)*$/.test(version)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  try {
    const apkPath = `releases/Schedly-${version.replace(/^v/i, "").trim()}-release.apk`;
    const object = await b2Client().send(
      new GetObjectCommand({ Bucket: B2_BUCKET, Key: apkPath })
    );

    if (!object.Body) {
      return NextResponse.json({ error: "APK not found" }, { status: 404 });
    }

    const stream = Readable.toWeb(object.Body as unknown as Readable) as unknown as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="Schedly-${version}-release.apk"`,
      "Cache-Control": "no-store",
    };
    if (typeof object.ContentLength === "number") {
      headers["Content-Length"] = String(object.ContentLength);
    }

    return new NextResponse(stream, { status: 200, headers });
  } catch (error) {
    console.error("[APK_DOWNLOAD_API] Error:", error);
    return NextResponse.json({ error: "APK not found" }, { status: 404 });
  }
}
