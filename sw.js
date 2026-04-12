// ===== SERVICE WORKER - PARAÍSO ASTRAL =====
// Minimal service worker. Precachea el app shell y usa network-first para HTML
// (así los cambios se ven rápido) + cache-first para CSS/JS (para que la primera
// carga offline funcione).
//
// NOTA: Esta SW existe pero NO se registra desde index.html por ahora. Si querés
// habilitar PWA/offline real, agregá esto al final de app.js:
//   if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

const CACHE_VERSION = 'v4';
const APP_SHELL_CACHE = 'paraiso-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'paraiso-runtime-' + CACHE_VERSION;

// App Shell — archivos estáticos siempre disponibles offline.
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/base.css',
  '/styles/theme.css',
  '/styles/components.css',
  '/js/config.js',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/firestoreClient.js',
  '/js/cloudinaryClient.js',
  '/js/dataSource.js',
  '/js/app.js'
];

// Install: precache del app shell.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(function (cache) { return cache.addAll(APP_SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Activate: limpiar caches viejos.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== APP_SHELL_CACHE && k !== RUNTIME_CACHE; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Fetch: estrategia por tipo.
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // Solo manejamos GET del mismo origen.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Navegación / HTML → network-first con fallback a cache (y a /index.html).
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').indexOf('text/html') !== -1) {
    event.respondWith(
      fetch(request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // CSS / JS / imágenes locales → cache-first.
  if (url.pathname.startsWith('/styles/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Resto (Firestore, Cloudinary, Firebase SDKs) → network directo, sin cachear.
});
