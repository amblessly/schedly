import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { b2Client, B2_BUCKET } from "@/server/lib/b2-client";

export const dynamic = "force-dynamic";

function errorPage(status: number, title: string, detail: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — Schedly</title></head>
    <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fafafa;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px">
      <div style="max-width:420px;text-align:center">
        <div style="font-size:64px;line-height:1">📦</div>
        <h1 style="font-size:22px;margin:16px 0 8px">${title}</h1>
        <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px">${detail}</p>
        <a href="/" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px">Back to Schedly</a>
      </div>
    </body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: NextRequest) {
  if (!B2_BUCKET) {
    return errorPage(503, "Downloads unavailable", "The app update server is not configured yet. Please try again later.");
  }

  const version = (request.nextUrl.searchParams.get("v") || "").replace(/^v/i, "").trim();

  if (!/^\d+(\.\d+)*$/.test(version)) {
    return errorPage(400, "Invalid version", "The download link is missing a valid version number. Please use the in-app update button instead.");
  }

  try {
    const apkPath = `releases/Schedly-${version.replace(/^v/i, "").trim()}-release.apk`;
    const object = await b2Client().send(
      new GetObjectCommand({ Bucket: B2_BUCKET, Key: apkPath })
    );

    if (!object.Body) {
      return errorPage(404, "APK not found", `No Android app file exists for version ${version}. The newest release may still be uploading — please try again in a few minutes.`);
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
    return errorPage(404, "APK not found", "The Android app file could not be downloaded right now. Please try again later.");
  }
}
