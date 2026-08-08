import { put } from "@vercel/blob";
import { db } from "@/server/db/client";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export type StoredFile = {
  url: string;
  uploadId: string;
  storedIn: "blob" | "db";
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
 * Store an image file. Vercel Blob is tried first when configured (fast,
 * public URLs); if the store is unavailable or suspended, the bytes are
 * persisted in Postgres (`uploads.file_data`) and served at
 * `/api/upload/{id}/file`. Always returns a row-backed `uploadId` so the
 * caller can poll AI progress or reuse the record for avatars.
 */
export async function storeImage(
  userId: string,
  data: Uint8Array,
  mime: string,
  fileName: string,
  opts: StoreOptions = {}
): Promise<StoredFile> {
  const status = opts.status ?? "completed";

  if (BLOB_TOKEN) {
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
      console.error("[file-store] Vercel Blob unavailable — falling back to Postgres:", err);
    }
  }

  const upload = await db.upload.create({
    data: {
      userId,
      scheduleId: opts.scheduleId ?? null,
      fileUrl: "",
      fileData: Buffer.from(data).toString("base64"),
      fileName,
      fileSize: data.byteLength,
      mimeType: mime,
      status,
    },
  });
  const url = `/api/upload/${upload.id}/file`;
  await db.upload.update({ where: { id: upload.id }, data: { fileUrl: url } });

  return { url, uploadId: upload.id, storedIn: "db" };
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