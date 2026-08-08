"use client";

/* Client-side web push helpers: subscribe the user's device to Schedly's
 * push service and persist the subscription server-side. */

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-key", { cache: "no-store" });
  if (!res.ok) throw new Error("Push not configured");
  const body = (await res.json()) as { publicKey?: string };
  if (!body.publicKey) throw new Error("Push not configured");
  return body.publicKey;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return false;
  }

  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch {
    return false;
  }

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — make sure the server knows about it.
    await persistSubscription(existing);
    return true;
  }

  const publicKey = await getVapidPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
  });
  await persistSubscription(sub);
  return true;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    await persistRemoval(sub);
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

async function persistSubscription(sub: PushSubscription): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.toJSON() as { p256dh?: string; auth?: string },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!res.ok) throw new Error("Failed to save subscription");
}

async function persistRemoval(sub: PushSubscription): Promise<void> {
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    // Best-effort removal; ignoring errors here is fine.
  }
}