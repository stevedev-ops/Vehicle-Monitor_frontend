const CACHE_NAME = 'vehicle-monitor-v9';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/app.js',
  '/js/db.js',
  '/js/ai_engine.js',
  '/js/seed_data.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/static/manifest.json',
  '/static/css/app.css',
  '/static/js/app.js',
  '/static/js/db.js',
  '/static/js/ai_engine.js',
  '/static/js/seed_data.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app assets for 100% offline operation');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Cache addAll error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Allow Vercel Analytics and insights to bypass Service Worker cache
  if (url.pathname.startsWith('/_vercel/')) {
    return;
  }

  // 1. Navigation requests (Opening the app completely offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/', { ignoreSearch: true })
        .then((cached) => cached || caches.match('/index.html', { ignoreSearch: true }))
        .then((cached) => cached || fetch(event.request))
        .catch(() => caches.match('/', { ignoreSearch: true }))
    );
    return;
  }

  // 2. Cache-First strategy for static assets
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((fetchRes) => {
        if (fetchRes && fetchRes.status === 200 && event.request.method === 'GET') {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return fetchRes;
      }).catch(() => {
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
        return caches.match('/', { ignoreSearch: true });
      });
    })
  );
});

