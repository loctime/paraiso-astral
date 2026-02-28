// ===== CONFIG.JS - APPLICATION CONFIGURATION =====

// Environment detection
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

// API Configuration
const CONFIG = {
  // API URLs
  API_BASE_URL: isDevelopment ? 'http://localhost:4000' : 'https://api.paraiso-astral.com',
  
  // Firebase Configuration (should match your Firebase project)
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyYourApiKeyHere", // Replace with actual Firebase API key
    authDomain: "paraiso-astral.firebaseapp.com",
    projectId: "paraiso-astral",
    storageBucket: "paraiso-astral.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  },
  
  // Application Settings
  APP_NAME: 'Paraíso Astral',
  APP_VERSION: '1.0.0',
  
  // Security Settings
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  
  // UI Settings
  LOADING_TIMEOUT: 10000, // 10 seconds
  ERROR_DISPLAY_DURATION: 5000, // 5 seconds
  
  // Route Protection
  PROTECTED_ROUTES: ['admin', 'profile', 'rrpp'],
  PUBLIC_ROUTES: ['login', 'register', 'home', 'events', 'artists', 'news', 'notifications']
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
