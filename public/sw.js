/* Nutrova service worker — SAFE version.

   The previous version cached "/" and, on ANY failed GET, responded with
   that cached "/" HTML. When a hashed Next.js chunk 404'd after a deploy,
   the browser received HTML instead of JavaScript → syntax error → the app
   hung forever on the loading splash.

   Rules now:
   - NEVER touch /_next/ (hashed build assets) or /api/ — always go to network.
   - Only navigation requests get an offline fallback.
   - Never serve "/" in place of a script/style/asset request. */

const CACHE = "nutrova-sw-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Drop every older cache (including the broken nutrova-tracker-v1)
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "nutrova-skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Build assets + API: always network, never cached, never substituted.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) return;

  // Pages: network first, cached copy only as an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/")) || Response.error())
    );
    return;
  }

  // Everything else (icons, manifest): network first, cache fallback for the
  // SAME request only — never a generic "/" HTML fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error())
  );
});
