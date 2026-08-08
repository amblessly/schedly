"use client";

/* Client-side web push helpers: subscribe the user's device to Schedly's
 * push service and persist the subscription server-side. */

export type PushResult =
  | { ok: true }
  | { ok: false; reason: string };

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

/** Ensure the service worker is registered before relying on `ready`. */
async function ensureActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active) return existing;
  } catch {
    // Fall through to register().
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  } catch {
    // Registration may still be pending; `ready` below handles it.
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<PushResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "Push isn't supported on this browser." };
  }
  if (Notification.permission === "denied") {
    return {
      ok: false,
      reason:
        "Notifications are blocked on this device. Enable them in your browser or phone settings, then try again.",
    };
  }

  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    if (result === "denied") {
      return {
        ok: false,
        reason:
          "Notifications are blocked on this device. Enable them in your browser or phone settings, then try again.",
      };
    }
    if (result !== "granted") {
      return { ok: false, reason: "Notification permission wasn't granted." };
    }
  }

  const reg = await ensureActiveRegistration();
  if (!reg) {
    return {
      ok: false,
      reason: "The app's background service is still starting up. Refresh, then try again.",
    };
  }

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const publicKey = await getVapidPublicKey();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }
    // Already subscribed — make sure the server knows about it.
    await persistSubscription(sub);
    return { ok: true };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (
      name === "NotAllowedError" ||
      name === "PermissionDeniedError" ||
      (err as { message?: string })?.message?.includes("permission")
    ) {
      return {
        ok: false,
        reason:
          "Notifications are blocked on this device. Enable them in your browser or phone settings, then try again.",
      };
    }
    if (name === "NotSupportedError" || name === "AbortError") {
      return {
        ok: false,
        reason:
          "Push alerts aren't supported on this browser's settings. Open Schedly in Chrome/Edge on Android, or install the app from the Home Screen on iPhone (iOS 16.4+).",
      };
    }
    return {
      ok: false,
      reason: "Couldn't subscribe this device. Check your connection and try again.",
    };
  }
}

export async function unsubscribeFromPush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, reason: "Unsupported on this browser." };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await persistRemoval(sub);
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Couldn't unsubscribe this device." };
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