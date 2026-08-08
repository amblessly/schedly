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

const CACHE_NAME = "schedly-cache-v2";

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
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Auto-download while online: after login the app tells us which pages the
// user will likely open, and we warm the cache for them in the background.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PRECACHE") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of event.data.urls || []) {
        try {
          const res = await fetch(url);
          if (res.ok) cache.put(url, res.clone());
        } catch {
          // Best-effort; skip pages that fail.
        }
      }
    })()
  );
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
          return cached || (await cache.match("/offline.html"));
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
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        const fetched = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
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