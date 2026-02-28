// ===== SERVICE WORKER AVANZADO - PARAÍSO ASTRAL =====

const CACHE_NAME = 'paraiso-astral-v2';
const APP_SHELL_CACHE = 'paraiso-shell-v2';
const RUNTIME_CACHE = 'paraiso-runtime-v2';

// App Shell - archivos críticos que siempre deben estar disponibles
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/styles/base.css',
  '/styles/theme.css', 
  '/styles/components.css',
  '/js/core/store.js',
  '/js/core/api.js',
  '/js/core/auth.js',
  '/js/core/router.js',
  '/js/app.js',
  '/js/db.js',
  '/manifest.json'
];

// Archivos que pueden cachearse dinámicamente
const CACHEABLE_ROUTES = [
  '/events',
  '/artists', 
  '/news',
  '/tickets'
];

// Estrategias de cacheo
const CACHE_STRATEGIES = {
  // App Shell: Cache First (siempre desde cache)
  appShell: (request) => {
    return caches.match(request).then(response => {
      return response || fetch(request);
    });
  },

  // API: Stale While Revalidate (cache primero, luego actualizar)
  staleWhileRevalidate: (request) => {
    return caches.match(request).then(response => {
      const fetchPromise = fetch(request).then(fetchResponse => {
        if (fetchResponse.ok) {
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, fetchResponse.clone());
          });
        }
        return fetchResponse;
      });
      return response || fetchPromise;
    });
  },

  // Imágenes: Cache First con expiración
  cacheFirst: (request) => {
    return caches.match(request).then(response => {
      if (response) {
        // Verificar si la respuesta no está muy antigua (24 horas)
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const responseDate = new Date(dateHeader);
          const now = new Date();
          const hoursDiff = (now - responseDate) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            return response;
          }
        }
      }
      
      return fetch(request).then(fetchResponse => {
        if (fetchResponse.ok) {
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, fetchResponse.clone());
          });
        }
        return fetchResponse;
      });
    });
  },

  // Network First para datos críticos
  networkFirst: (request) => {
    return fetch(request).then(fetchResponse => {
      if (fetchResponse.ok) {
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(request, fetchResponse.clone());
        });
      }
      return fetchResponse;
    }).catch(() => {
      return caches.match(request);
    });
  }
};

// Instalación - precache del App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache del App Shell
      caches.open(APP_SHELL_CACHE).then(cache => {
        return cache.addAll(APP_SHELL_FILES);
      }),
      
      // Cache inicial de datos estáticos
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll([
          '/js/db.js'
        ]);
      })
    ])
  );
  
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activación - limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Liminar caches antiguos
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => 
            key !== CACHE_NAME && 
            key !== APP_SHELL_CACHE && 
            key !== RUNTIME_CACHE
          ).map(key => caches.delete(key))
        );
      })
    ])
  );
});

// Fetch - manejo de solicitudes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar solicitudes HTTP(S) de nuestro origen
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Determinar estrategia basada en el tipo de solicitud
  let strategy;
  
  if (APP_SHELL_FILES.includes(url.pathname) || 
      url.pathname === '/' || 
      url.pathname.endsWith('.html')) {
    // App Shell - Cache First
    strategy = CACHE_STRATEGIES.appShell;
  } 
  else if (url.pathname.startsWith('/js/') || 
           url.pathname.startsWith('/styles/')) {
    // Recursos estáticos - Cache First
    strategy = CACHE_STRATEGIES.cacheFirst;
  }
  else if (request.method === 'GET' && 
           (CACHEABLE_ROUTES.some(route => url.pathname.startsWith(route)) ||
            url.pathname.includes('/events/') ||
            url.pathname.includes('/artists/') ||
            url.pathname.includes('/news/'))) {
    // Rutas de la app - Stale While Revalidate
    strategy = CACHE_STRATEGIES.staleWhileRevalidate;
  }
  else if (url.pathname.includes('/admin') || 
           url.pathname.includes('/profile')) {
    // Rutas sensibles - Network First
    strategy = CACHE_STRATEGIES.networkFirst;
  }
  else {
    // Por defecto - Network First
    strategy = CACHE_STRATEGIES.networkFirst;
  }

  event.respondWith(strategy(request));
});

// Manejo de errores y fallbacks
self.addEventListener('fetch', event => {
  const { request } = event;
  
  event.respondWith(
    fetch(request)
      .catch(() => {
        // Fallback para cuando no hay conexión
        if (request.mode === 'navigate') {
          // Para navegación, servir el index.html
          return caches.match('/index.html');
        }
        
        // Para otros recursos, intentar caché
        return caches.match(request);
      })
  );
});

// Background Sync para sincronización cuando vuelve la conexión
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Función de sincronización de datos
async function syncData() {
  try {
    // Aquí iría la lógica para sincronizar datos pendientes
    // Por ejemplo: ventas offline, cambios en perfil, etc.
    console.log('Sincronizando datos pendientes...');
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}

// Push notifications (preparado para futuro VAPID)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Abrir la app en la página relevante
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic Sync para actualizaciones automáticas
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-events') {
    event.waitUntil(updateEventsData());
  }
});

// Actualizar datos de eventos periódicamente
async function updateEventsData() {
  try {
    // Aquí iría la lógica para actualizar datos de eventos
    console.log('Actualizando datos de eventos...');
  } catch (error) {
    console.error('Error actualizando eventos:', error);
  }
}
