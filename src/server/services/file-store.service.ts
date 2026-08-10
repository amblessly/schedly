import { put } from "@vercel/blob";
import { db } from "@/server/db/client";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export type StoredFile = {
  url: string;
  uploadId: string;
  storedIn: "blob";
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
};

function extForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

type StoreOptions = {
  folder?: string;
  scheduleId?: string | null;
  status?: "pending" | "uploading" | "processing" | "completed" | "failed";
};

/**
 * Store an image file in Vercel Blob (fast, public URLs). Fail-closed: if
 * Blob is unavailable (suspended/quota/error) the upload fails loudly instead
 * of persisting the image bytes in Postgres (`uploads.file_data`), which
 * caused Neon data-transfer overages. Legacy rows already stored in
 * `file_data` are untouched and still served by `/api/upload/{id}/file` until
 * the backfill migration moves them to Blob.
 */
export async function storeImage(
  userId: string,
  data: Uint8Array,
  mime: string,
  fileName: string,
  opts: StoreOptions = {}
): Promise<StoredFile> {
  const status = opts.status ?? "completed";

  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured — cannot store files");
  }

  try {
    const key = `${opts.folder ?? "files"}/${userId}/${crypto.randomUUID()}.${extForMime(mime)}`;
    const result = await put(key, new Blob([Buffer.from(data)], { type: mime }), {
      access: "public",
      addRandomSuffix: false,
      token: BLOB_TOKEN,
    });
    const upload = await db.upload.create({
      data: {
        userId,
        scheduleId: opts.scheduleId ?? null,
        fileUrl: result.url,
        fileName,
        fileSize: data.byteLength,
        mimeType: mime,
        status,
      },
    });
    return { url: result.url, uploadId: upload.id, storedIn: "blob" };
  } catch (err) {
    console.error("[file-store] Vercel Blob store failed:", err);
    throw new Error("Vercel Blob store unavailable — refusing to persist image bytes in Postgres", { cause: err });
  }
}

/** Remove a stored file by its URL. Blob URLs are left alone (orphaned like
 *  before); DB-backed files delete their upload row. */
export async function deleteStoredFileByUrl(url: string | null | undefined): Promise<void> {
  if (!url || url.startsWith("http")) return;
  const match = url.match(/^\/api\/upload\/([^/]+)\/file$/);
  if (match) {
    await db.upload.delete({ where: { id: match[1] } }).catch(() => {});
  }
}