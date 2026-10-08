/* Nutrova service worker — SELF-DISABLING.

   History: an earlier version cached "/" and, on any failed GET, replied with
   that cached HTML. After a deploy the hashed Next.js chunks 404'd, so the
   browser got HTML where JavaScript was expected → the app hung on the
   loading splash. Caching a frequently-redeployed app gives us almost nothing
   and keeps producing blank / stale screens on phones.

   This worker therefore does the opposite of caching: it removes every cache,
   unregisters itself, and reloads open pages once. It intercepts no requests,
   so a stale worker can never serve wrong content again. The in-app reminder
   alarms do not depend on this file. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      /* Deliberately NOT calling client.navigate() here: reloading on activate
         would re-register this worker and loop forever. Unregistering is
         enough — the next normal page load is already clean. */
    })()
  );
});

/* No fetch handler on purpose — every request goes straight to the network. */
