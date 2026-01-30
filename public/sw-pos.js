// Service Worker para POS - Estrategia Network First
// Prioriza siempre la versión más reciente del servidor

// Import OneSignal SDK for push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'paganos-pos-v1';

// Assets estáticos mínimos para fallback offline
const STATIC_ASSETS = [
  '/pos',
  '/icons/paganos-192.png',
  '/icons/paganos-512.png'
];

// Install: pre-cache assets mínimos
self.addEventListener('install', (event) => {
  console.log('[SW-POS] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW-POS] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW-POS] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('paganos-pos-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW-POS] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo manejar requests dentro del scope /pos/
  if (!url.pathname.startsWith('/pos') && 
      !url.pathname.startsWith('/icons') && 
      !url.pathname.startsWith('/src') &&
      !url.pathname.startsWith('/assets')) {
    return;
  }
  
  // No cachear APIs, Supabase, ni auth
  if (url.hostname.includes('supabase') || 
      url.pathname.includes('/api/') ||
      url.pathname.includes('/rest/') ||
      url.pathname.includes('/functions/') ||
      url.pathname.includes('/auth/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la respuesta es válida, cachearla y devolverla
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si falla la red, buscar en cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Para navegación, devolver la página principal del POS
          if (event.request.mode === 'navigate') {
            return caches.match('/pos');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
