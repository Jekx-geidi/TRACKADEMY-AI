// Trackademic service worker: makes the web app installable and quick to reopen.
//
// Privacy rule: only the app's own code and images are cached. Supabase requests (sign-in,
// records, scores, evidence and profile photos) are cross-origin and are never touched here,
// so no student data is ever stored by the service worker.
const VERSION = 'v4';
const SHELL_CACHE = `trackademic-shell-${VERSION}`;
const STATIC_CACHE = `trackademic-static-${VERSION}`;
const SHELL = ['/', '/manifest.webmanifest', '/icons/splash-192.png', '/icons/splash-512.png', '/icons/icon-maskable-512.png'];

// Also precache the script and stylesheet index.html points at: on the first visit the page
// loads them before this worker takes control, so they'd otherwise only be cached on a second visit.
async function precache() {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(SHELL);
  const html = await (await shell.match('/')).text();
  const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await (await caches.open(STATIC_CACHE)).addAll(files);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Vite's build output under /assets has content-hashed names, so a cached copy never goes stale.
const isHashedAsset = (url) => url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always try the network for the latest app; fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
