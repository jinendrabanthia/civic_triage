const CACHE_NAME = 'civic-triage-field-ops-v1';

// Routes to cache for offline access
const PRECACHE_URLS = [
  '/field-ops',
  '/_next/static/css/app/layout.css',
  // In a real PWA we'd use Workbox to cache all _next/static chunks
  // For this demo we'll rely on browser caching and intercept network requests
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For /field-ops and assets, try network first, then cache
  event.respondWith(
    fetch(event.request).then((response) => {
      // If we got a valid response, clone it and cache it
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // If network fails, look in the cache
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        // If it's a page navigation, return the offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/field-ops');
        }
        
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-field-updates') {
    // Ideally we'd trigger the IndexedDB sync here, 
    // but standard Service Worker sync requires Background Sync API which isn't always reliable.
    // Instead, we'll let the client-side app handle the sync when it detects 'online'.
  }
});
