// Import OneSignal SDK for push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'paganos-customer-v2';

// Solo cachear rutas y assets del portal de clientes
const urlsToCache = [
  '/',
  '/login',
  '/index.html',
  '/manifest-customer.json',
  '/icons/paganos-192.png',
  '/icons/paganos-512.png',
  '/icons/paganos-maskable-512.png',
  '/icons/paganos-180.png'
];

// Endpoints sensibles que nunca se deben cachear
const SENSITIVE_ENDPOINTS = [
  '/api/pay',
  '/api/payment', 
  '/api/checkout',
  '/api/auth',
  '/api/session',
  '/api/cart',
  '/api/orders/create',
  '/api/orders/close'
];

// Install event - precargar app shell solo del portal
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - estrategias de caché
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // CRITICAL: No cachear NADA bajo /pos/*
  if (url.pathname.startsWith('/pos')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // No cachear endpoints sensibles
  if (SENSITIVE_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // No cachear llamadas a Supabase
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estrategia para HTML del portal: network-first con fallback seguro
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Solo cachear rutas del portal (/, /login)
          if (response.status === 200 && 
              (url.pathname === '/' || url.pathname === '/login')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback offline: mostrar caché solo para rutas del portal
          if (url.pathname === '/' || url.pathname === '/login') {
            return caches.match(event.request)
              .then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                // Shell offline básico sin datos sensibles
                return caches.match('/');
              });
          }
          // Para otras rutas, no hay fallback
          return new Response('Offline - Esta página requiere conexión', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html; charset=utf-8'
            })
          });
        })
    );
    return;
  }

  // Estrategia para recursos estáticos: cache-first solo para assets del portal
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar en background solo si no es de /pos
            if (!url.pathname.startsWith('/pos')) {
              fetch(event.request)
                .then((response) => {
                  if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                      cache.put(event.request, response.clone());
                    });
                  }
                })
                .catch(() => {});
            }
            return cachedResponse;
          }
          
          // Si no está en caché, buscar en red (sin cachear si es /pos)
          return fetch(event.request)
            .then((response) => {
              if (response.status === 200 && !url.pathname.startsWith('/pos')) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // Para el resto de requests del portal: network-first
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Solo ofrecer caché para rutas del portal
        if (!url.pathname.startsWith('/pos')) {
          return caches.match(event.request);
        }
        throw new Error('Offline and outside portal scope');
      })
  );
});
