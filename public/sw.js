/* KASSA offline shell v2.
 * Only the public client-rendered offline sales shell and static assets are
 * cached. Never cache authenticated API responses, payment pages, JWTs or
 * protected business data. Actual sales stay in encrypted IndexedDB. */
const CACHE = "kassa-offline-shell-v2";
const PREVIOUS_CACHE = "kassa-offline-shell-v1";
const OFFLINE_PATH = "/offline-sales";
const APP_ROUTES = [
  ["/dashboard", "home"],
  ["/sales/new", "new-sale"],
  ["/transactions", "transactions"],
  ["/scan", "scan"],
  ["/reports", "reports"],
  ["/products", "products"],
  ["/customers", "customers"],
  ["/staff-branches", "staff"],
  ["/settings", "settings"], ["/profile", "profile"],
  ["/sales", "new-sale"],
];
function routeSection(path) {
  // Support a saved home-screen shortcut or opening the main domain offline.
  if (path === "/" || path === "/login") return "home";
  for (const [prefix, section] of APP_ROUTES) {
    if (path === prefix || path.startsWith(prefix + "/")) return section;
  }
  return null;
}
async function cachedOfflinePage() {
  const current = await caches.open(CACHE);
  return (await current.match(OFFLINE_PATH, { ignoreVary: true })) ||
    (await caches.open(PREVIOUS_CACHE)).match(OFFLINE_PATH, { ignoreVary: true });
}

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const proposed = Array.isArray(event.data.assets) ? event.data.assets : [];
    const resources = [...new Set([OFFLINE_PATH, "/logo.png", ...proposed])].filter((path) => {
      if (typeof path !== "string") return false;
      try {
        const url = new URL(path, self.location.origin);
        return url.origin === self.location.origin &&
          (url.pathname === OFFLINE_PATH || url.pathname === "/logo.png" ||
            url.pathname.startsWith("/_next/static/"));
      } catch { return false; }
    }).slice(0, 250);
    const results = await Promise.allSettled(resources.map((url) => cache.add(url)));
    const prepared = results.length >= 2 &&
      results.every((result) => result.status === "fulfilled") &&
      Boolean(await cache.match(OFFLINE_PATH, { ignoreVary: true }));
    if (prepared) {
      // Keep old cached shell until the new one is actually ready.
      await caches.delete(PREVIOUS_CACHE);
    }
    if (event.source && "postMessage" in event.source) {
      event.source.postMessage({ type: "KASSA_OFFLINE_SHELL", prepared });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/logo.png") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const stored = await cache.match(request);
      if (stored) return stored;
      const prior = await (await caches.open(PREVIOUS_CACHE)).match(request);
      if (prior) return prior;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  if (request.mode !== "navigate") return;

  if (url.pathname === OFFLINE_PATH) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !url.search) {
          await (await caches.open(CACHE)).put(OFFLINE_PATH, response.clone());
        }
        return response;
      } catch {
        return (await cachedOfflinePage()) ??
          new Response("Offline selling is not yet prepared. Open Kassa online once and prepare this device.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
    return;
  }

  const section = routeSection(url.pathname);
  if (!section) return;
  // Route real navigation through the cloud while online. If it fails because
  // there is no network, navigate to the locally cached offline Kassa shell.
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      if (await cachedOfflinePage()) {
        return Response.redirect(
          new URL(OFFLINE_PATH + "?section=" + encodeURIComponent(section), self.location.origin), 302);
      }
      return new Response(
        "Kassa is offline and the offline workspace has not been prepared on this device.", {
          status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }
  })());
});