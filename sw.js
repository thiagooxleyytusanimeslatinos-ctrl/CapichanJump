const CACHE_NAME = 'capi-jump-v4-offline';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  './App.tsx',
  './components/CapiGame.tsx',
  './constants.ts',
  './types.ts',
  './public/icon.svg',
  // Dependencias externas cruciales para funcionamiento offline
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8jc-yh99LIByrqqpuyU7K.woff2',
  'https://esm.sh/react@^19.2.4',
  'https://esm.sh/react-dom@^19.2.4',
  'https://esm.sh/lucide-react@^0.563.0'
];

// Instalación: Descarga todo el juego al almacenamiento local del dispositivo
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Fuerza a la nueva versión a activarse de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets para modo offline total');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activación: Borra cachés antiguas para liberar espacio en el móvil
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones: Prioridad absoluta a la Caché (Cache-First)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si está en caché, lo devolvemos (Modo Offline)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Si no está, intentamos red y guardamos en caché para la próxima vez
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 3. Fallback: Si no hay red ni caché, y es una navegación, devolver index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
      });
    })
  );
});