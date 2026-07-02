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

// Respuesta de fallback cuando la red falla y no hay caché disponible.
function respuestaOffline(request) {
  const accept = request.headers.get('accept') || '';
  if (request.mode === 'navigate' || accept.includes('text/html')) {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Sin conexión</title>' +
      '<div style="font-family:system-ui;padding:32px;text-align:center;color:#0F172A">' +
      '<h1 style="margin:0 0 8px">Sin conexión</h1>' +
      '<p style="color:#64748B">No se pudo cargar la página. Verifique su conexión e intente nuevamente.</p>' +
      '</div>',
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('', { status: 504, statusText: 'Gateway Timeout' });
}

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NO interceptar peticiones a otros dominios (Firebase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // NO interceptar los assets de Vite — siempre ir a la red
  // Vite genera hashes únicos por build, cachearlos causa MIME errors
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('[sw] fetch de asset falló:', url.pathname, err);
        return respuestaOffline(event.request);
      })
    );
    return;
  }

  // Navegación SPA: intentar red primero, caer en index.html si offline.
  // Rutas como /generar no existen como HTML físico; deben resolver a index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (netErr) {
          try {
            const cached = await caches.match('/index.html');
            if (cached) return cached;
            return await fetch('/index.html');
          } catch (fallbackErr) {
            console.warn('[sw] navegación offline y sin index.html en caché:', url.pathname, fallbackErr);
            return respuestaOffline(event.request);
          }
        }
      })()
    );
    return;
  }

  // Resto de activos estáticos: caché primero, luego red.
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      } catch (err) {
        console.warn('[sw] fetch estático falló:', url.pathname, err);
        return respuestaOffline(event.request);
      }
    })()
  );
});

