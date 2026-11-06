/* Tazza offline support: the app opens and works without a network.
   Pages and assets are fetched from the network when possible and kept for next time; hashed
   build files are served from the cache first. Sync and export calls are never cached. */
const CACHE = 'tazza-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/sync') || url.pathname.startsWith('/__tazza')) return;

  const hashed = url.pathname.startsWith('/assets/');
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(hashed ? request : request.mode === 'navigate' ? '/' : request);
      if (hashed && cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request.mode === 'navigate' ? '/' : request, fresh.clone());
        return fresh;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});
