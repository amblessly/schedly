import type { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Client, B2_BUCKET } from "@/server/lib/b2-client";

export type ReleaseInfo = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  updateMessage: string;
};

export const VERSION_KEY = "releases/version.json";

function notFound(err: unknown): boolean {
  return (err as { name?: string }).name === "NoSuchKey";
}

/** Read releases/version.json from B2. Returns null if it does not exist. */
export async function getReleaseInfo(): Promise<ReleaseInfo | null> {
  if (!B2_BUCKET) {
    throw new Error("B2 storage not configured (B2_BUCKET missing)");
  }
  try {
    const object = await b2Client().send(
      new GetObjectCommand({ Bucket: B2_BUCKET, Key: VERSION_KEY })
    );
    if (!object.Body) return null;
    const bytes = await object.Body.transformToByteArray();
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as ReleaseInfo;
  } catch (err) {
    if (notFound(err)) return null;
    throw err;
  }
}

/** Write releases/version.json to B2. */
export async function putReleaseInfo(info: ReleaseInfo): Promise<void> {
  if (!B2_BUCKET) {
    throw new Error("B2 storage not configured (B2_BUCKET missing)");
  }
  await b2Client().send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: VERSION_KEY,
      Body: JSON.stringify(info, null, 2),
      ContentType: "application/json",
    })
  );
}

/** Write a release APK to B2. */
export async function putReleaseApk(
  key: string,
  body: Readable | ReadableStream | Uint8Array,
  contentType: string
): Promise<void> {
  if (!B2_BUCKET) {
    throw new Error("B2 storage not configured (B2_BUCKET missing)");
  }
  await b2Client().send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export function computeVersionCode(versionName: string): number {
  const clean = versionName.replace(/^v/i, "").trim();
  const parts = clean.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  const [major = 0, minor = 0, patch = 0] = parts;
  return major * 10000 + minor * 100 + patch;
}
