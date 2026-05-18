/**
 * Service Worker for ajew.org
 * Provides offline support for reader pages and core assets
 */

// Bumped 2026-05-05 (after Vercel rollback) to invalidate stale catalog/index
// caches and let users see the new tinyana §60-§71 commentary.
const CACHE_NAME = 'ajew-v3';
const CORE_ASSETS = [
  '/',
  '/reader',
  '/search-enhanced',
  '/reader/catalog.json',
  '/reader-script.js',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy:
// - Reader JSON files: cache-first (content doesn't change often)
// - Reader pages: network-first with cache fallback
// - Static assets (CSS/JS/images): cache-first
// - API calls: network only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Reader JSON files - stale-while-revalidate.
  // Returns cached copy instantly, refreshes in background so commentary edits
  // propagate without needing another CACHE_NAME bump.
  if (url.pathname.match(/\/reader\/.*\.json$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Static assets — cache-first
  if (url.pathname.match(/\.(css|js|woff2?|ttf|svg|ico|webp|avif)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Images — cache-first
  if (url.pathname.match(/\.(jpg|jpeg|png|gif)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network-first with cache fallback
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }
});
