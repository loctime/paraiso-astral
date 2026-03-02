// ===== FIREBASE CONFIG - PARAÍSO ASTRAL =====
// initializeApp, getAuth, export auth. No mocks. Requires CONFIG loaded first.

(function () {
  'use strict';

  if (typeof window.CONFIG === 'undefined' || !window.CONFIG.FIREBASE_CONFIG) {
    throw new Error('CONFIG.FIREBASE_CONFIG must be defined before loading firebase.js');
  }

  var firebaseConfig = window.CONFIG.FIREBASE_CONFIG;
  var app = firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth(app);

  window.firebaseAuth = auth;
})();
