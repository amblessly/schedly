/* Schedly service worker — app-shell + runtime caching for offline support.
 *
 * Strategy:
 *  - Navigation (HTML shell): network-first, falls back to the last good
 *    cached page, then to /offline.html when completely offline.
 *  - RSC payloads (client-side tab switching): stale-while-revalidate — the
 *    page the user already visited renders instantly offline.
 *  - Static build assets (_next/static, icons, images): cache-first. Hashed
 *    filenames are immutable, so cached copies never go stale.
 *  - Schedule images (DB-backed /api/upload ID file endpoint): network-first with
 *    cache fallback so previously loaded schedule photos still render offline.
 *  - Everything else (API, non-GET): network only — we never cache user data
 *    or server responses unless the page itself is cached as HTML.
 */

const CACHE_NAME = "schedly-cache-v3";
const RSC_CACHE = `${CACHE_NAME}-rsc`;

// When offline, navigation can still land on a URL that was never cached
// (e.g. "/" redirects for signed-in users). Fall back to the main app pages
// in a sensible order instead of giving up with the offline screen.
const NAV_FALLBACKS = [
  "/dashboard",
  "/schedule",
  "/notes",
  "/reminders",
  "/pomodoro",
  "/gpa",
  "/login",
  "/",
];

const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/logo.jpg",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
      self.skipWaiting();
    })().catch(() => {
      // Precaching is best-effort — a failed asset must not block activation.
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_NAME) && k !== ALARMS_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Re-arm persisted reminder alarms (SW restarts, cache updates, etc.).
      await armAlarms();
    })()
  );
});

// Auto-download while online: after login the app tells us which pages the
// user will likely open, and we warm the cache for them in the background.
// Also receives programmed class-reminder alarms for local notification
// triggers (fires on time even when Schedly isn't open, no server needed).
const ALARMS_CACHE = "schedly-alarms";

async function readAlarms() {
  try {
    const cache = await caches.open(ALARMS_CACHE);
    const res = await cache.match("/alarms.json");
    if (!res) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAlarms(alarms) {
  const cache = await caches.open(ALARMS_CACHE);
  await cache.put("/alarms.json", new Response(JSON.stringify(alarms), { headers: { "Content-Type": "application/json" } }));
}

/** Re-arm programmed alarms. With Notification Triggers they fire exactly on
 *  time even when the SW later sleeps; storage survives so we re-arm after
 *  every activation. */
async function armAlarms() {
  const alarms = await readAlarms();
  const now = Date.now();
  const remaining = [];
  for (const alarm of alarms) {
    if (alarm.fireAt <= now) continue;
    remaining.push(alarm);
    try {
      if (typeof TimestampTrigger !== "undefined") {
        await self.registration.showNotification(alarm.title, {
          body: alarm.body || "",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: alarm.url || "/" },
          tag: `rem-${alarm.id}`,
          showTrigger: new TimestampTrigger(alarm.fireAt),
        });
      } else if (alarm.fireAt - now <= 60 * 1000) {
        // No Trigger API: best-effort one-shot while the SW is alive.
        setTimeout(() => self.registration.showNotification(alarm.title, {
          body: alarm.body || "",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: alarm.url || "/" },
          tag: `rem-${alarm.id}`,
        }), alarm.fireAt - now).unref?.();
      }
    } catch {
      // A failed trigger must not break other alarms.
    }
  }
  await writeAlarms(remaining);
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "PRECACHE") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const rscCache = await caches.open(RSC_CACHE);
        for (const url of data.urls || []) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              cache.put(url, res.clone());
              // Warm the JS/CSS chunks referenced by the page so it actually
              // renders offline — the HTML shell alone is not enough.
              const html = await res.clone().text();
              const refs = html.match(/\/_next\/static\/[^"']+/g) || [];
              for (const ref of [...new Set(refs)]) {
                try {
                  const asset = await fetch(ref);
                  if (asset.ok) cache.put(ref, asset.clone());
                } catch {
                  // Best-effort.
                }
              }
            }
          } catch {
            // Best-effort; skip pages that fail.
          }
          try {
            // Warm the RSC payload too, keyed by plain path, so the page
            // still navigates client-side when offline.
            const rsc = await fetch(url, { headers: { RSC: "1" } });
            if (rsc.ok) rscCache.put(new URL(url, self.location.origin).pathname, rsc.clone());
          } catch {
            // Best-effort.
          }
        }
      })()
    );
  } else if (data.type === "PROGRAM_ALARMS") {
    event.waitUntil(
      (async () => {
        const now = Date.now();
        const alarms = Array.isArray(data.alarms)
          ? data.alarms.filter((a) => a && typeof a.fireAt === "number" && a.fireAt > now)
          : [];
        await writeAlarms(alarms);
        await armAlarms();
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  const isSameOrigin = url.origin === self.location.origin;

  // --- Navigation: network-first, offline fallback -------------------------
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
          // The requested URL may not be cached directly (e.g. "/" was a
          // redirect while signed in) — serve the best known app page so the
          // user lands on Schedly, not on the offline card.
          for (const route of NAV_FALLBACKS) {
            const fallback = await cache.match(route);
            if (fallback) return fallback;
          }
          return (await cache.match("/offline.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // --- RSC payloads (soft navigation): stale-while-revalidate --------------
  // Next.js fetches these when switching tabs client-side. Caching them lets
  // previously visited tabs load instantly and work offline.
  const isRsc = request.headers.get("RSC") === "1" || url.searchParams.has("__rsc");
  if (isSameOrigin && isRsc) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RSC_CACHE);
        const pathKey = url.origin + url.pathname;
        const cached =
          (await cache.match(request)) || (await cache.match(pathKey));
        const fetched = fetch(request).then((res) => {
          if (res.ok) {
            cache.put(request, res.clone());
            cache.put(pathKey, res.clone());
          }
          return res;
        });
        if (cached) {
          // Background refresh keeps it fresh without waiting on the network.
          fetched.catch(() => {});
          return cached;
        }
        return fetched;
      })()
    );
    return;
  }

  // --- Static assets: cache-first ------------------------------------------
  if (
    isSameOrigin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/images/"))
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          // Revalidate in the background so the next visit is fresh.
          fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
            })
            .catch(() => {});
          return cached;
        }
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // --- Web app manifest: cache-first ---------------------------------------
  if (isSameOrigin && url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // --- Schedule images (DB-backed): network-first, cache fallback ----------
  if (isSameOrigin && url.pathname.startsWith("/api/upload/") && url.pathname.endsWith("/file")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  // --- Blob-storage images (legacy): network-first, cache fallback ---------
  if (
    url.hostname === "blob.vercel-storage.com" ||
    url.hostname.endsWith(".blob.vercel-storage.com")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  // --- Everything else: network only ---------------------------------------
});

// --- Push notifications ----------------------------------------------------
// The server (Vercel Cron → /api/cron/reminders) computes exact class times
// from the timetable and pushes payloads here, so reminders arrive even when
// Schedly isn't open.
self.addEventListener("push", (event) => {
  let data = { title: "Schedly", body: "", url: "/" };
  try {
    const parsed = event.data ? JSON.parse(event.data.text()) : {};
    data = { ...data, ...parsed };
  } catch {
    // Fall back to defaults if the payload isn't valid JSON.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Schedly", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: `schedly-${Date.now()}`,
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});