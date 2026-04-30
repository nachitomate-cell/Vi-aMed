const CACHE_NAME = 'vinamed-cache-v4';

// Solo cachear activos estáticos que NO son los bundles de Vite
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo2.png',
  '/logo3.png'
];

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación: Eliminar TODOS los caches anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NO interceptar peticiones a otros dominios (Firebase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // NO interceptar los assets de Vite — siempre ir a la red
  // Vite genera hashes únicos por build, cachearlos causa MIME errors
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navegación SPA: intentar red primero, caer en index.html si offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then(r => r || fetch('/index.html'))
      )
    );
    return;
  }

  // Resto de activos estáticos: caché primero, luego red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

