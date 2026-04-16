// ===== SERVICE WORKER - PARAÍSO ASTRAL =====
// Precachea el app shell. Estrategias:
//   - HTML/navigate: network-first (ver cambios rápido) con fallback a cache.
//   - CSS/JS/iconos: cache-first.
//   - Cloudinary (imágenes de eventos/artistas/banner): stale-while-revalidate.
// Firestore no se cachea acá: Firebase SDK ya usa IndexedDB internamente.

const CACHE_VERSION = 'v5';
const APP_SHELL_CACHE = 'paraiso-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'paraiso-runtime-' + CACHE_VERSION;
const IMAGE_CACHE = 'paraiso-images-' + CACHE_VERSION;

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
            .filter(function (k) { return k !== APP_SHELL_CACHE && k !== RUNTIME_CACHE && k !== IMAGE_CACHE; })
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

  if (request.method !== 'GET') return;

  // Cloudinary: stale-while-revalidate (mostramos cache al toque, actualizamos atrás).
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var networkFetch = fetch(request).then(function (res) {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Resto de cross-origin (Firebase SDKs, Firestore): que pase directo a red.
  if (url.origin !== self.location.origin) return;

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

  // Imágenes locales (/banner.jpg y otras en raíz) → stale-while-revalidate.
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var networkFetch = fetch(request).then(function (res) {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Resto del mismo origen → network directo.
});
