// ===== API CLIENT.JS - BACKEND API CLIENT =====

// Configuration from config.js
const API_BASE_URL = window.CONFIG.API_BASE_URL;
const LOADING_TIMEOUT = window.CONFIG.LOADING_TIMEOUT;
const ERROR_DISPLAY_DURATION = window.CONFIG.ERROR_DISPLAY_DURATION;

// Request cache for simple optimization
const requestCache = new Map();

// Global error handler
let globalErrorHandler = null;

/**
 * Set global error handler
 * @param {Function} handler - Error handler function
 */
function setErrorHandler(handler) {
  globalErrorHandler = handler;
}

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {string} type - Error type ('error', 'warning', 'info')
 */
function showError(message, type = 'error') {
  if (globalErrorHandler) {
    globalErrorHandler(message, type);
  } else {
    // Fallback to toast
    const toastFn = window.toast || ((msg) => console.log(msg));
    toastFn(`❌ ${message}`);
  }
}

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Make HTTP request to backend API
 * @param {string} path - API endpoint path (e.g., '/api/events')
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Request body for POST/PUT
 * @param {boolean} options.skipAuth - Skip authentication header
 * @param {boolean} options.cache - Cache GET requests (default: false)
 * @returns {Promise<Object>} Response data
 */
async function request(path, options = {}) {
  const {
    method = 'GET',
    body = null,
    skipAuth = false,
    cache = false
  } = options;

  // Cache key for GET requests
  const cacheKey = `${method}:${path}`;
  
  // Return cached result if available
  if (cache && method === 'GET' && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  try {
    // Get Firebase ID token
    let token = null;
    if (!skipAuth) {
      token = await window.Auth.getIdToken();
      if (!token) {
        // Redirect to login if no token available
        window.location.hash = '#login';
        throw new Error('Authentication required');
      }
    }

    // Build request
    const url = `${API_BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOADING_TIMEOUT);
    config.signal = controller.signal;

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const data = await response.json();

    // Handle 401 Unauthorized
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Authentication required');
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      showError('Acceso denegado: No tienes los permisos necesarios', 'error');
      throw new Error('Access denied');
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorMessage = data.error || `HTTP ${response.status}`;
      showError(errorMessage, 'error');
      throw new Error(errorMessage);
    }

    // Cache successful GET requests
    if (cache && method === 'GET') {
      requestCache.set(cacheKey, data);
      // Clear cache after 5 minutes
      setTimeout(() => requestCache.delete(cacheKey), 5 * 60 * 1000);
    }

    return data;

  } catch (error) {
    // Handle AbortError (timeout)
    if (error.name === 'AbortError') {
      showError('La solicitud tardó demasiado tiempo', 'error');
      throw new Error('Request timeout');
    }
    
    // Re-throw authentication errors
    if (error.message === 'Authentication required') {
      throw error;
    }
    
    // Handle network errors
    if (error.message === 'Failed to fetch') {
      showError('Error de conexión. Verifica tu internet', 'error');
      throw new Error('Network error');
    }
    
    // Generic error handling
    showError(error.message || 'Error desconocido', 'error');
    throw error;
  }
}

/**
 * Handle unauthorized access
 */
function handleUnauthorized() {
  // Clear auth state
  window.Auth.logout();
  
  // Show error message
  showError('Sesión expirada. Por favor inicia sesión nuevamente', 'warning');
  
  // Redirect to login
  window.location.hash = '#login';
}

// ===== CONVENIENCE METHODS =====

/**
 * GET request
 * @param {string} path 
 * @param {Object} options 
 */
async function get(path, options = {}) {
  return request(path, { ...options, method: 'GET' });
}

/**
 * POST request
 * @param {string} path 
 * @param {Object} body 
 * @param {Object} options 
 */
async function post(path, body, options = {}) {
  return request(path, { ...options, method: 'POST', body });
}

/**
 * PUT request
 * @param {string} path 
 * @param {Object} body 
 * @param {Object} options 
 */
async function put(path, body, options = {}) {
  return request(path, { ...options, method: 'PUT', body });
}

/**
 * DELETE request
 * @param {string} path 
 * @param {Object} options 
 */
async function del(path, options = {}) {
  return request(path, { ...options, method: 'DELETE' });
}

// ===== CACHE MANAGEMENT =====

/**
 * Clear request cache
 */
function clearCache() {
  requestCache.clear();
}

/**
 * Clear specific cache entry
 * @param {string} path 
 */
function clearCacheEntry(path) {
  const keys = Array.from(requestCache.keys()).filter(key => key.includes(path));
  keys.forEach(key => requestCache.delete(key));
}

// Export functions globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    request,
    get,
    post,
    put,
    del,
    clearCache,
    clearCacheEntry,
    setErrorHandler,
    sanitizeHTML,
    API_BASE_URL
  };
} else {
  window.ApiClient = {
    request,
    get,
    post,
    put,
    del,
    clearCache,
    clearCacheEntry,
    setErrorHandler,
    sanitizeHTML,
    API_BASE_URL
  };
}
