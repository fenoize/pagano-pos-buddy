const CACHE_NAME = 'paganos-pos-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
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

// Install event - precargar app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Activa inmediatamente la nueva versión
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
  self.clients.claim(); // Toma control inmediatamente
});

// Fetch event - estrategias de caché
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // No cachear endpoints sensibles
  if (SENSITIVE_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estrategia para HTML: network-first con fallback a caché
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, actualizar caché y devolver
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, usar caché como fallback
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/');
            });
        })
    );
    return;
  }

  // Estrategia para recursos estáticos: cache-first con actualización en background
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar en background
            fetch(event.request)
              .then((response) => {
                if (response.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                  });
                }
              })
              .catch(() => {}); // Ignorar errores de actualización en background
            
            return cachedResponse;
          }
          
          // Si no está en caché, buscar en red y cachear
          return fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
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

  // Para el resto de requests: network-first
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});