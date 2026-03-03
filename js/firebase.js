// ===== FIREBASE CONFIG - PARAÍSO ASTRAL =====
// Solo Firebase Auth. NO Firestore en frontend.
// Si env.public.js no está (404 en producción), no lanzamos: auth queda null y Auth será stub.

(function () {
  'use strict';

  window.firebaseAuth = null;

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
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Firebase] init failed:', e.message);
    }
  }
})();
