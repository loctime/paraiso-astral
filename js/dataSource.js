// ===== DATA SOURCE - PARAÍSO ASTRAL =====
// Fuente única de datos para el frontend.
// Estrategia: intenta Firestore primero; si falla (SDK no inicializado, rules, red)
// cae a datos mock en memoria. Los renders no tienen que saber de dónde vienen los datos.
//
// Contrato:
//   DataSource.getEvents()             -> { status, data: Event[] }
//   DataSource.getEvent(id)            -> { status, data: Event | null }
//   DataSource.getArtists()            -> { status, data: Artist[] }
//   DataSource.getArtist(id)           -> { status, data: Artist | null }
//   DataSource.getSiteConfig()         -> { status, data: SiteConfig }

(function () {
  'use strict';

  // ── Mock Events ──────────────────────────────────────────────────────────────
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
    name: 'Paraíso Astral',
    tagline: 'Electronic Universe',
    bio: 'Productora de música electrónica.',
    logo: '',
    heroImage: 'public/banner.jpg',
    contact: { email: '', whatsapp: '', phone: '' },
    socials: { instagram: '', facebook: '', soundcloud: '', spotify: '', youtube: '' }
  };

  function ok(data) { return { status: 'success', data: data }; }
  function notFound() { return { status: 'error', data: null, message: 'Not found' }; }

  // ¿Debemos intentar Firestore?
  function firestoreReady() {
    return !!(window.FirestoreClient && window.FirestoreClient.isAvailable && window.FirestoreClient.isAvailable());
  }

  // Helper: intenta Firestore; si falla o devuelve vacío, cae a mock.
  // emptyIsValid = true → considerar lista vacía de Firestore como válida (no caer a mock).
  async function withFirestoreFallback(firestoreFn, mockData, emptyIsValid) {
    if (firestoreReady()) {
      try {
        var res = await firestoreFn();
        if (res && res.status === 'success') {
          // Lista vacía: si emptyIsValid, devolver vacío; si no, mostrar mock
          if (Array.isArray(res.data) && res.data.length === 0 && !emptyIsValid) {
            return ok(mockData);
          }
          return res;
        }
      } catch (err) {
        console.warn('[DataSource] Firestore fallback → mock:', err && err.message);
      }
    }
    return ok(mockData);
  }

  var DataSource = {
    // Events
    getEvents: async function () {
      return withFirestoreFallback(
        function () { return window.FirestoreClient.getEvents(); },
        MOCK_EVENTS.slice(),
        false // lista vacía → mostrar mock ("próximamente")
      );
    },

    getEvent: async function (id) {
      if (firestoreReady()) {
        try {
          var res = await window.FirestoreClient.getEvent(id);
          if (res && res.status === 'success') return res;
        } catch (_) {}
      }
      var e = MOCK_EVENTS.find(function (x) { return String(x.id) === String(id); });
      return e ? ok(e) : notFound();
    },

    // Artists
    getArtists: async function () {
      return withFirestoreFallback(
        function () { return window.FirestoreClient.getArtists(); },
        MOCK_ARTISTS.slice(),
        false
      );
    },

    getArtist: async function (id) {
      if (firestoreReady()) {
        try {
          var res = await window.FirestoreClient.getArtist(id);
          if (res && res.status === 'success') return res;
        } catch (_) {}
      }
      var a = MOCK_ARTISTS.find(function (x) { return String(x.id) === String(id); });
      return a ? ok(a) : notFound();
    },

    // Site config
    getSiteConfig: async function () {
      if (firestoreReady()) {
        try {
          var res = await window.FirestoreClient.getSiteConfig();
          if (res && res.status === 'success' && res.data) return res;
        } catch (_) {}
      }
      return ok(MOCK_SITE_CONFIG);
    }
  };

  if (typeof window !== 'undefined') {
    window.DataSource = DataSource;
  }
})();
