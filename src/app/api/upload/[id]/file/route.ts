import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";

/**
 * Serves images persisted in Postgres (uploads.file_data) when Vercel Blob
 * is unavailable. Files are public by design — URLs are unguessable UUIDs,
 * matching the public-by-default behavior of Blob URLs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const upload = await db.upload.findUnique({
    where: { id },
    select: { fileData: true, mimeType: true },
  });

  if (!upload?.fileData) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = Buffer.from(upload.fileData, "base64");

  return new NextResponse(bytes, {
    headers: {
      "content-type": upload.mimeType || "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}