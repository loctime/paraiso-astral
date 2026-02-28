// ===== AUTH.JS - FIREBASE AUTHENTICATION =====

// Use configuration from config.js
const firebaseConfig = window.CONFIG.FIREBASE_CONFIG;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Auth state management
let currentUser = null;
let tokenRefreshTimer = null;

// Listen to auth state changes
auth.onAuthStateChanged((user) => {
  currentUser = user;
  console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
  
  // Clear token refresh timer when user logs out
  if (!user && tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
});

// ===== AUTH FUNCTIONS =====

/**
 * Login user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} { success: boolean, user?: object, error?: string }
 */
async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    return {
      success: false,
      error: getAuthErrorMessage(error)
    };
  }
}

/**
 * Register new user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} { success: boolean, user?: object, error?: string }
 */
async function register(email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    return {
      success: false,
      error: getAuthErrorMessage(error)
    };
  }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    // Clear token refresh timer
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
    
    await auth.signOut();
  } catch (error) {
    // Silently handle logout errors
    console.error('Logout error:', error);
  }
}

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Get Firebase ID token for API requests
 * @returns {Promise<string|null>} ID token or null
 */
async function getIdToken() {
  try {
    if (!currentUser) {
      return null;
    }
    
    // Get token without forcing refresh
    const token = await currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is logged in
 */
function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Send password reset email
 * @param {string} email 
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    return {
      success: true,
      message: 'Email de recuperación enviado'
    };
  } catch (error) {
    return {
      success: false,
      error: getAuthErrorMessage(error)
    };
  }
}

/**
 * Get user-friendly error message from Firebase error
 * @param {Object} error 
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(error) {
  if (!error || !error.code) {
    return 'Error de autenticación. Intenta nuevamente.';
  }
  
  const errorMessages = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuario deshabilitado',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/email-already-in-use': 'El email ya está en uso',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'Contraseña muy débil',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/requires-recent-login': 'Se requiere inicio de sesión reciente'
  };
  
  return errorMessages[error.code] || error.message || 'Error de autenticación';
}

// Export functions globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    login,
    register,
    logout,
    getCurrentUser,
    getIdToken,
    isAuthenticated,
    resetPassword
  };
} else {
  window.Auth = {
    login,
    register,
    logout,
    getCurrentUser,
    getIdToken,
    isAuthenticated,
    resetPassword
  };
}
