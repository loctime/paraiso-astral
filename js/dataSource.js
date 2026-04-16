// ===== DATA SOURCE - PARAÍSO ASTRAL =====
// Store reactivo en memoria sobre Firestore.
//
// Ciclo de vida:
//   1. DataSource.init() → abre 3 listeners onSnapshot (events, artists, siteConfig)
//   2. Primer emit viene del cache IndexedDB (instantáneo, sin red) → llena el store
//   3. Cada cambio remoto se propaga al store y notifica a suscriptores
//   4. getEvents/getArtists/getSiteConfig leen del store → cero latencia
//
// Contrato público:
//   DataSource.init()                       -> Promise<void>
//   DataSource.getEvents()                  -> { status, data: Event[] }  (instantáneo si ya booteó)
//   DataSource.getEvent(id)                 -> { status, data: Event | null }
//   DataSource.getArtists()                 -> { status, data: Artist[] }
//   DataSource.getArtist(id)                -> { status, data: Artist | null }
//   DataSource.getSiteConfig()              -> { status, data: SiteConfig }
//   DataSource.subscribe(name, callback)    -> unsubscribe fn
//     name ∈ 'events' | 'artists' | 'siteConfig' | '*' (cualquier cambio)

(function () {
  'use strict';

  // ── Mocks (fallback si Firestore no está disponible) ────────────────────────
  var MOCK_EVENTS = [
    {
      id: 'evt-welcome',
      title: 'Próximamente: nuevo evento',
      venue: 'Por confirmar',
      startAt: '2026-06-15T22:00:00Z',
      endAt: '2026-06-16T06:00:00Z',
      status: 'PUBLISHED',
      coverImage: '',
      description: 'Pronto anunciaremos el próximo evento de Paraíso Astral. Mantenete atento a nuestras redes.',
      lineup: [],
      tags: ['Techno']
    }
  ];

  var MOCK_ARTISTS = [
    {
      id: 'artist-placeholder',
      name: 'Artista de ejemplo',
      role: 'Resident',
      genre: 'Techno',
      emoji: '🎧',
      bio: 'Este es un artista de ejemplo. Cuando cargues artistas reales desde el panel admin van a aparecer acá.',
      events: [],
      socials: { instagram: '', soundcloud: '', spotify: '' },
      photo: ''
    }
  ];

  var MOCK_SITE_CONFIG = {
    name: '',
    tagline: '',
    bio: 'Productora de música electrónica.',
    logo: '',
    heroImage: 'banner.jpg',
    contact: { email: '', whatsapp: '', phone: '' },
    socials: { instagram: '', facebook: '', soundcloud: '', spotify: '', youtube: '' }
  };

  function ok(data) { return { status: 'success', data: data }; }
  function notFound() { return { status: 'error', data: null, message: 'Not found' }; }

  // ── Store interno ───────────────────────────────────────────────────────────
  var store = {
    events: null,      // null = aún no booteado
    artists: null,
    siteConfig: null
  };

  var subscribers = { events: [], artists: [], siteConfig: [], '*': [] };
  var unsubs = [];
  var initPromise = null;

  function notify(name) {
    (subscribers[name] || []).forEach(function (fn) { try { fn(); } catch (_) {} });
    subscribers['*'].forEach(function (fn) { try { fn(name); } catch (_) {} });
  }

  function firestoreReady() {
    return !!(window.FirestoreClient && window.FirestoreClient.isAvailable && window.FirestoreClient.isAvailable());
  }

  // init() es idempotente: llamarlo varias veces no crea más listeners.
  function init() {
    if (initPromise) return initPromise;

    initPromise = new Promise(function (resolve) {
      if (!firestoreReady()) {
        // Modo mock: llenar store una vez y resolver.
        store.events = MOCK_EVENTS.slice();
        store.artists = MOCK_ARTISTS.slice();
        store.siteConfig = MOCK_SITE_CONFIG;
        notify('events'); notify('artists'); notify('siteConfig');
        resolve();
        return;
      }

      var pending = 3;
      function markReady() {
        pending--;
        if (pending === 0) resolve();
      }

      unsubs.push(window.FirestoreClient.subscribeEvents(function (res) {
        if (res.status === 'success' && Array.isArray(res.data)) {
          store.events = res.data.length ? res.data : MOCK_EVENTS.slice();
        } else if (store.events === null) {
          store.events = MOCK_EVENTS.slice();
        }
        notify('events');
        if (pending > 0) markReady();
      }));

      unsubs.push(window.FirestoreClient.subscribeArtists(function (res) {
        if (res.status === 'success' && Array.isArray(res.data)) {
          store.artists = res.data.length ? res.data : MOCK_ARTISTS.slice();
        } else if (store.artists === null) {
          store.artists = MOCK_ARTISTS.slice();
        }
        notify('artists');
        if (pending > 0) markReady();
      }));

      unsubs.push(window.FirestoreClient.subscribeSiteConfig(function (res) {
        if (res.status === 'success' && res.data) {
          store.siteConfig = res.data;
        } else if (store.siteConfig === null) {
          store.siteConfig = MOCK_SITE_CONFIG;
        }
        notify('siteConfig');
        if (pending > 0) markReady();
      }));

      // Safety: si en 3s no llegó nada, resolver igual para que la UI renderice con mocks.
      setTimeout(function () {
        if (store.events === null) store.events = MOCK_EVENTS.slice();
        if (store.artists === null) store.artists = MOCK_ARTISTS.slice();
        if (store.siteConfig === null) store.siteConfig = MOCK_SITE_CONFIG;
        if (pending > 0) { pending = 0; resolve(); }
      }, 3000);
    });

    return initPromise;
  }

  function subscribe(name, callback) {
    if (!subscribers[name]) return function () {};
    subscribers[name].push(callback);
    return function () {
      var arr = subscribers[name];
      var i = arr.indexOf(callback);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  var DataSource = {
    init: init,
    subscribe: subscribe,

    getEvents: async function () {
      await init();
      return ok((store.events || MOCK_EVENTS).slice());
    },

    getEvent: async function (id) {
      await init();
      var list = store.events || MOCK_EVENTS;
      var e = list.find(function (x) { return String(x.id) === String(id); });
      return e ? ok(e) : notFound();
    },

    getArtists: async function () {
      await init();
      return ok((store.artists || MOCK_ARTISTS).slice());
    },

    getArtist: async function (id) {
      await init();
      var list = store.artists || MOCK_ARTISTS;
      var a = list.find(function (x) { return String(x.id) === String(id); });
      return a ? ok(a) : notFound();
    },

    getSiteConfig: async function () {
      await init();
      return ok(store.siteConfig || MOCK_SITE_CONFIG);
    }
  };

  if (typeof window !== 'undefined') {
    window.DataSource = DataSource;
  }
})();
