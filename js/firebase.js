// ===== FIREBASE CONFIG - PARAÍSO ASTRAL =====
// Solo Firebase Auth. NO Firestore en frontend.
// initializeApp + getAuth (compat: firebase.auth()). Requiere CONFIG cargado antes.

(function () {
  'use strict';

  if (typeof window.CONFIG === 'undefined' || !window.CONFIG.FIREBASE_CONFIG) {
    throw new Error('CONFIG.FIREBASE_CONFIG must be defined before loading firebase.js');
  }

  var firebaseConfig = window.CONFIG.FIREBASE_CONFIG;
  if (!firebaseConfig.apiKey) {
    throw new Error('CONFIG.FIREBASE_CONFIG.apiKey is required. Run: node scripts/generate-env.js and load js/env.public.js before config.js.');
  }

  var app = firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth(app);

  window.firebaseAuth = auth;
})();
