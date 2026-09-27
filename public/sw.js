const CACHE_NAME = 'tukangsiaga-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin-login.html',
  '/admin-dashboard.html',
  '/progress.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests for basic caching strategy
  if (event.request.method !== 'GET') return;
  
  // Exclude API calls from cache to ensure fresh data
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Network first, fallback to cache
      return fetch(event.request).then((response) => {
        // Update cache
        if (response.status === 200) {
           const responseClone = response.clone();
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});
