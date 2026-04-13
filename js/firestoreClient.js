// ===== FIRESTORE CLIENT - PARAÍSO ASTRAL =====
// Wrappers alrededor del SDK compat de Firestore para las 3 colecciones del sitio:
//   - events:    documentos de eventos publicados/borrador
//   - artists:   bios/fotos/redes de artistas
//   - siteConfig/main: configuración del sitio (un solo doc)
//
// Todas las operaciones devuelven { status: 'success'|'error', data }, igual que DataSource.
// Si firebaseDb no está disponible, devuelven { status: 'error', data: null }.

(function () {
  'use strict';

  function ok(data) { return { status: 'success', data: data }; }
  function fail(message) { return { status: 'error', data: null, message: message || 'Error' }; }
  function available() { return !!window.firebaseDb; }

  // Normaliza un snapshot a nuestro shape interno.
  function docToEvent(doc) {
    if (!doc || !doc.exists) return null;
    var d = doc.data() || {};
    return {
      id: doc.id,
      title: d.title || '',
      venue: d.venue || '',
      startAt: d.startAt && d.startAt.toDate ? d.startAt.toDate().toISOString() : (d.startAt || null),
      endAt: d.endAt && d.endAt.toDate ? d.endAt.toDate().toISOString() : (d.endAt || null),
      status: d.status || 'DRAFT',
      coverImage: d.coverImage || '',
      description: d.description || '',
      lineup: Array.isArray(d.lineup) ? d.lineup : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
      createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : null,
      updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : null
    };
  }

  function docToArtist(doc) {
    if (!doc || !doc.exists) return null;
    var d = doc.data() || {};
    return {
      id: doc.id,
      name: d.name || '',
      role: d.role || '',
      genre: d.genre || '',
      emoji: d.emoji || '🎧',
      photo: d.photo || '',
      bio: d.bio || '',
      trackUrl: d.trackUrl || '',
      events: Array.isArray(d.events) ? d.events : [],
      socials: d.socials || {}
    };
  }

  function docToConfig(doc) {
    if (!doc || !doc.exists) {
      return {
        name: 'Paraíso Astral',
        tagline: 'Electronic Universe',
        bio: '',
        logo: '',
        heroImage: '',
        contact: { email: '', whatsapp: '', phone: '' },
        socials: { instagram: '', facebook: '', soundcloud: '', spotify: '', youtube: '' }
      };
    }
    var d = doc.data() || {};
    return {
      name: d.name || 'Paraíso Astral',
      tagline: d.tagline || 'Electronic Universe',
      bio: d.bio || '',
      logo: d.logo || '',
      heroImage: d.heroImage || '',
      contact: d.contact || { email: '', whatsapp: '', phone: '' },
      socials: d.socials || { instagram: '', facebook: '', soundcloud: '', spotify: '', youtube: '' }
    };
  }

  var FirestoreClient = {
    isAvailable: available,

    // ── Events ─────────────────────────────────────────────────────
    getEvents: async function () {
      if (!available()) return fail('Firestore no disponible');
      try {
        var snap = await window.firebaseDb.collection('events').orderBy('startAt', 'asc').get();
        var events = [];
        snap.forEach(function (doc) {
          var e = docToEvent(doc);
          if (e) events.push(e);
        });
        return ok(events);
      } catch (err) {
        console.warn('[FirestoreClient.getEvents]', err && err.message);
        return fail(err && err.message);
      }
    },

    getEvent: async function (id) {
      if (!available()) return fail('Firestore no disponible');
      try {
        var doc = await window.firebaseDb.collection('events').doc(String(id)).get();
        var e = docToEvent(doc);
        return e ? ok(e) : fail('Evento no encontrado');
      } catch (err) {
        return fail(err && err.message);
      }
    },

    saveEvent: async function (id, data) {
      if (!available()) return fail('Firestore no disponible');
      try {
        var fsTs = firebase.firestore.FieldValue.serverTimestamp();
        var payload = {
          title: data.title || '',
          venue: data.venue || '',
          startAt: data.startAt ? firebase.firestore.Timestamp.fromDate(new Date(data.startAt)) : null,
          endAt: data.endAt ? firebase.firestore.Timestamp.fromDate(new Date(data.endAt)) : null,
          status: data.status || 'DRAFT',
          coverImage: data.coverImage || '',
          description: data.description || '',
          lineup: Array.isArray(data.lineup) ? data.lineup : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          updatedAt: fsTs
        };
        var ref;
        if (id) {
          ref = window.firebaseDb.collection('events').doc(String(id));
          await ref.set(payload, { merge: true });
        } else {
          payload.createdAt = fsTs;
          ref = await window.firebaseDb.collection('events').add(payload);
        }
        return ok({ id: ref.id });
      } catch (err) {
        return fail(err && err.message);
      }
    },

    deleteEvent: async function (id) {
      if (!available()) return fail('Firestore no disponible');
      try {
        await window.firebaseDb.collection('events').doc(String(id)).delete();
        return ok(true);
      } catch (err) {
        return fail(err && err.message);
      }
    },

    // ── Artists ────────────────────────────────────────────────────
    getArtists: async function () {
      if (!available()) return fail('Firestore no disponible');
      try {
        var snap = await window.firebaseDb.collection('artists').orderBy('name', 'asc').get();
        var artists = [];
        snap.forEach(function (doc) {
          var a = docToArtist(doc);
          if (a) artists.push(a);
        });
        return ok(artists);
      } catch (err) {
        console.warn('[FirestoreClient.getArtists]', err && err.message);
        return fail(err && err.message);
      }
    },

    getArtist: async function (id) {
      if (!available()) return fail('Firestore no disponible');
      try {
        var doc = await window.firebaseDb.collection('artists').doc(String(id)).get();
        var a = docToArtist(doc);
        return a ? ok(a) : fail('Artista no encontrado');
      } catch (err) {
        return fail(err && err.message);
      }
    },

    saveArtist: async function (id, data) {
      if (!available()) return fail('Firestore no disponible');
      try {
        var fsTs = firebase.firestore.FieldValue.serverTimestamp();
        var payload = {
          name: data.name || '',
          role: data.role || '',
          genre: data.genre || '',
          emoji: data.emoji || '🎧',
          photo: data.photo || '',
          bio: data.bio || '',
          trackUrl: data.trackUrl || '',
          events: Array.isArray(data.events) ? data.events : [],
          socials: data.socials || {},
          updatedAt: fsTs
        };
        var ref;
        if (id) {
          ref = window.firebaseDb.collection('artists').doc(String(id));
          await ref.set(payload, { merge: true });
        } else {
          payload.createdAt = fsTs;
          ref = await window.firebaseDb.collection('artists').add(payload);
        }
        return ok({ id: ref.id });
      } catch (err) {
        return fail(err && err.message);
      }
    },

    deleteArtist: async function (id) {
      if (!available()) return fail('Firestore no disponible');
      try {
        await window.firebaseDb.collection('artists').doc(String(id)).delete();
        return ok(true);
      } catch (err) {
        return fail(err && err.message);
      }
    },

    // ── Site Config ────────────────────────────────────────────────
    getSiteConfig: async function () {
      if (!available()) return fail('Firestore no disponible');
      try {
        var doc = await window.firebaseDb.collection('siteConfig').doc('main').get();
        return ok(docToConfig(doc));
      } catch (err) {
        console.warn('[FirestoreClient.getSiteConfig]', err && err.message);
        return fail(err && err.message);
      }
    },

    saveSiteConfig: async function (data) {
      if (!available()) return fail('Firestore no disponible');
      try {
        var fsTs = firebase.firestore.FieldValue.serverTimestamp();
        var payload = {
          name: data.name || 'Paraíso Astral',
          tagline: data.tagline || '',
          bio: data.bio || '',
          logo: data.logo || '',
          heroImage: data.heroImage || '',
          contact: data.contact || {},
          socials: data.socials || {},
          updatedAt: fsTs
        };
        await window.firebaseDb.collection('siteConfig').doc('main').set(payload, { merge: true });
        return ok(true);
      } catch (err) {
        return fail(err && err.message);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.FirestoreClient = FirestoreClient;
  }
})();
