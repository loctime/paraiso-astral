// ===== CONFIG.JS - APPLICATION CONFIGURATION =====
// Lee variables desde window.__ENV__ (generado por scripts/generate-env.js desde .env).
// Sin Vite: ejecutar "node scripts/generate-env.js" y cargar env.public.js antes de config.js.
// Con Vite: import.meta.env.VITE_* estaría disponible; aquí usamos __ENV__ para compatibilidad.

(function () {
  'use strict';

  var ENV = typeof window !== 'undefined' ? window.__ENV__ : {};
  var isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  var apiKey = ENV.VITE_FIREBASE_API_KEY;
  var authDomain = ENV.VITE_FIREBASE_AUTH_DOMAIN || 'paraiso-astral.firebaseapp.com';
  var projectId = ENV.VITE_FIREBASE_PROJECT_ID || 'paraiso-astral';
  var storageBucket = ENV.VITE_FIREBASE_STORAGE_BUCKET || 'paraiso-astral.firebasestorage.app';
  var messagingSenderId = ENV.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  var appId = ENV.VITE_FIREBASE_APP_ID || '';

  // Verificación temporal: apiKey debe estar definido para que Firebase Auth funcione (evita 400).
  if (typeof console !== 'undefined' && console.log) {
    if (!apiKey || apiKey === 'AIzaSyYourApiKeyHere') {
      console.warn('[Config] VITE_FIREBASE_API_KEY no definida o placeholder. Ejecuta: node scripts/generate-env.js y recarga. Login fallará con 400.');
    } else {
      console.log('[Config] Firebase apiKey cargada correctamente (primeros 10 chars):', (apiKey || '').slice(0, 10) + '...');
    }
  }

  var API_BASE_URL = ENV.VITE_API_BASE_URL;
  if (!API_BASE_URL && isDevelopment) API_BASE_URL = 'http://localhost:4000';
  if (!API_BASE_URL) API_BASE_URL = 'https://api.paraiso-astral.com';

  var CONFIG = {
    API_BASE_URL: API_BASE_URL,
    FIREBASE_CONFIG: {
      apiKey: apiKey || '',
      authDomain: authDomain,
      projectId: projectId,
      storageBucket: storageBucket,
      messagingSenderId: messagingSenderId,
      appId: appId
    },
    APP_NAME: 'Paraíso Astral',
    APP_VERSION: '1.0.0',
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    LOADING_TIMEOUT: 10000,
    ERROR_DISPLAY_DURATION: 5000,
    PROTECTED_ROUTES: ['admin', 'profile', 'rrpp'],
    PUBLIC_ROUTES: ['login', 'register', 'home', 'events', 'artists', 'news', 'notifications']
  };

  if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
  }
})();
