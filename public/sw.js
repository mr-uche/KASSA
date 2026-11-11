/* Offline selling shell only. Never cache Kassa API responses,
 * authentication requests, payment pages or secrets. */
const CACHE = "kassa-offline-shell-v1";
const OFFLINE_PATH = "/offline-sales";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) =>
      name.startsWith("kassa-offline-shell-") && name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "PREPARE_OFFLINE") return;
  const assets = Array.isArray(event.data.assets) ? event.data.assets : [];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The user has to visit the page online once before relying on it offline.
    const resources = [OFFLINE_PATH, "/logo.png", ...assets].filter((value) => {
      if (typeof value !== "string") return false;
      try {
        const url = new URL(value, self.location.origin);
        return url.origin === self.location.origin &&
          (url.pathname === OFFLINE_PATH || url.pathname === "/logo.png" ||
            url.pathname.startsWith("/_next/static/"));
      } catch { return false; }
    });
    await Promise.allSettled(resources.map((url) => cache.add(url)));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const asset = url.pathname.startsWith("/_next/static/") || url.pathname === "/logo.png";
  if (asset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(request);
      if (saved) return saved;
      const live = await fetch(request);
      if (live.ok) await cache.put(request, live.clone());
      return live;
    })());
    return;
  }

  if (request.mode === "navigate" && url.pathname === OFFLINE_PATH) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const live = await fetch(request);
        if (live.ok) await cache.put(OFFLINE_PATH, live.clone());
        return live;
      } catch {
        return (await cache.match(OFFLINE_PATH)) ??
          new Response("Offline selling has not yet been prepared. Open this page once while online.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
  }
});
