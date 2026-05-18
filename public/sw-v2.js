/**
 * ajew.org Service Worker v2 — Phase 1 Renovation
 * =================================================
 * PWA: offline reader caching, install prompt, background sync
 *
 * Strategy:
 * - Reader JSON files: stale-while-revalidate (fast + fresh)
 * - Reader HTML pages: network-first with cache fallback
 * - Static assets (CSS/JS/fonts/images): cache-first, long TTL
 * - API calls: network only
 */

const CACHE_NAME = 'ajew-v2-renovation';
const ICON_CACHE = 'ajew-icons-v1';

// Core assets to pre-cache on install
const CORE_ASSETS = [
  '/',
  '/reader',
  '/search-enhanced',
  '/my-flame',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/og-image.png',
  '/reader/catalog.json',
];

// Reader JSON patterns to cache aggressively
const READER_JSON_REGEX = /\/reader\/.*\.json$/;

// Static asset patterns (cache-first)
const STATIC_REGEX = /\.(css|js|woff2?|ttf|otf|svg|png|jpe?g|gif|ico)$/;

// ═══════════════════════════════════════
// INSTALL — pre-cache core assets
// ═══════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        // Some assets might not exist yet — that's OK
        console.warn('[SW] Pre-cache warning:', err.message);
      });
    })
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════
// ACTIVATE — clean old caches
// ═══════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ICON_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ═══════════════════════════════════════
// FETCH — routing strategy
// ═══════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api-')) return;
  if (url.hostname !== 'ajew.org' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return;

  // Route by pattern
  if (READER_JSON_REGEX.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.startsWith('/reader/')) {
    event.respondWith(networkFirstWithCache(request));
  } else if (STATIC_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    // Default: network first for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(networkFirstWithCache(request));
    } else {
      event.respondWith(networkOnly(request));
    }
  }
});

// ═══════════════════════════════════════
// STRATEGIES
// ═══════════════════════════════════════

/**
 * Cache-first: fastest for static assets
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first with cache fallback: HTML pages
 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html') || new Response('Offline — check your connection', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate: reader JSON content
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch and update cache in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached version if available, otherwise wait for network
  return cached || fetchPromise || new Response(JSON.stringify({ error: 'Offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Network only: for API calls and dynamic content
 */
async function networkOnly(request) {
  return fetch(request);
}

// ═══════════════════════════════════════
// MESSAGE HANDLER — cache management
// ═══════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_SPECIFIC_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls || []).catch(() => {});
      })
    );
  }

  if (event.data?.type === 'CACHE_READER_BOOK') {
    event.waitUntil(
      (async () => {
        const { bookUrl } = event.data;
        // Client sends the book's index URL
        try {
          const response = await fetch(bookUrl);
          const data = await response.json();
          const urls = (data.torahs || []).map(t => {
            if (t && t.url) return new URL(t.url, self.location.origin).href;
            return null;
          }).filter(Boolean);

          const cache = await caches.open(CACHE_NAME);
          await Promise.all(urls.map(url => {
            return cache.match(url).then(cached => {
              if (!cached) {
                return fetch(url).then(r => {
                  if (r.ok) cache.put(url, r.clone());
                });
              }
            });
          }));
        } catch (err) {
          console.warn('[SW] Cache book error:', err);
        }
      })()
    );
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => caches.open(CACHE_NAME))
    );
  }
});

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS (future)
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  // Reserved for future daily spark / streak notifications
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'ajew.org', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    });
  }
});
