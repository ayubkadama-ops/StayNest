const CACHE_NAME = 'makazi-go-shell-v5';
const APP_SHELL = [
  '/',
  '/index.html',
  '/listings.html',
  '/listing-detail.html',
  '/offline.html',
  '/styles.css',
  '/accessibility.css',
  '/manifest.webmanifest',
  '/assets/makazi-go-icon-192.png',
  '/assets/makazi-go-icon-512.png'
];
const SHELL_PATHS = new Set(APP_SHELL);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('makazi-go-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/service-worker.js' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !url.search && SHELL_PATHS.has(url.pathname)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        const cachedPage = !url.search && SHELL_PATHS.has(url.pathname)
          ? await caches.match(url.pathname)
          : null;
        return cachedPage || await caches.match('/offline.html');
      }
    })());
    return;
  }

  if (!/\.(?:css|js|mjs|png|jpe?g|webp|svg|woff2?|ttf|webmanifest)$/i.test(url.pathname)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return await caches.match(request, { ignoreSearch: true }) || Response.error();
    }
  })());
});
