// ===== FIREBASE CONFIG - PARAÍSO ASTRAL =====
// Inicializa Firebase App + Auth + Firestore.
// Si env.public.js no está disponible (404 en producción) queda todo en null y la app
// opera con DataSource en modo mock (fallback).

(function () {
  'use strict';

  window.firebaseAuth = null;
  window.firebaseDb = null;

  if (typeof window.CONFIG === 'undefined' || !window.CONFIG.FIREBASE_CONFIG) {
    return;
  }

  var firebaseConfig = window.CONFIG.FIREBASE_CONFIG;
  if (!firebaseConfig.apiKey) {
    return;
  }

  try {
    var app = firebase.initializeApp(firebaseConfig);
    window.firebaseAuth = firebase.auth(app);
    if (firebase.firestore) {
      window.firebaseDb = firebase.firestore(app);
      // IndexedDB persistence: lecturas instantáneas en visitas recurrentes,
      // y fallback offline. synchronizeTabs evita conflicto con varias pestañas.
      window.firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
        // failed-precondition = ya hay otra pestaña, unimplemented = navegador no soporta.
        // En ambos casos la app sigue funcionando sin cache local.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[Firebase] persistence off:', err && err.code);
        }
      });
    }
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Firebase] init failed:', e.message);
    }
  }
})();
