import axios from 'axios'

// ============================================
// API Client Configuration
// ============================================
// VITE_ variables are PUBLIC and exposed to the browser.
// No secrets belong in frontend env vars — the backend is the security authority.
//
// In Docker mode (Nginx reverse proxy), all requests go through the same origin,
// so VITE_API_BASE_URL should be empty. In native development, each service
// has its own localhost port.

/**
 * Normalized error object returned by API calls.
 * Provides a consistent shape regardless of the underlying failure type.
 * @typedef {Object} ApiError
 * @property {string} message  - Human-readable message safe to display
 * @property {number} status   - HTTP status code (0 for network errors)
 * @property {string} raw      - Original error string for debugging
 */

// Token storage keys
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

/**
 * JWT storage strategy:
 * - Using localStorage for persistence across sessions.
 * - Tradeoff: localStorage is XSS-vulnerable; httpOnly cookies would be
 *   more secure but require backend cookie-based auth. For this project,
 *   localStorage is acceptable since the backend remains the security
 *   authority and the token is a short-lived JWT.
 * - No secrets other than the JWT are stored here.
 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota)
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearAuth() {
  setToken(null)
  setStoredUser(null)
}

// ============================================
// Normalized API Error
// ============================================

/**
 * Create a normalized ApiError from any error type.
 * @param {Error|Object} error - The caught error
 * @returns {ApiError}
 */
export function normalizeError(error) {
  // Axios network / timeout errors (no response received)
  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      status: 0,
      raw: error.message,
    }
  }
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return {
      message: 'Unable to connect to the server. Please check your connection and try again.',
      status: 0,
      raw: error.message,
    }
  }

  // HTTP response errors
  const { status, data } = error.response
  const serverMessage = data?.message || data?.error || ''

  // Handle validation error objects (field → message map)
  if (typeof serverMessage === 'object' && serverMessage !== null) {
    const messages = Object.values(serverMessage)
    return {
      message: messages[0] || 'Validation failed',
      status,
      raw: JSON.stringify(serverMessage),
      fieldErrors: serverMessage,
    }
  }

  const friendlyMessages = {
    400: serverMessage || 'Invalid request',
    401: 'Invalid email or password',
    403: 'You do not have permission for this action',
    404: 'Resource not found',
    409: serverMessage || 'This resource already exists',
    429: 'Too many requests. Please try again later.',
    500: 'Something went wrong on our end. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
  }

  return {
    message: friendlyMessages[status] || serverMessage || 'An unexpected error occurred',
    status,
    raw: serverMessage || error.message,
  }
}

// ============================================
// 401 Handler
// ============================================

// Global callback invoked when a 401 is received from an authenticated request.
// Set by the AuthProvider to clear auth state without circular imports.
let onUnauthorized = null

export function setOnUnauthorized(callback) {
  onUnauthorized = callback
}

export function notifyUnauthorized() {
  clearAuth()
  if (onUnauthorized) onUnauthorized()
}

// ============================================
// Client Factory
// ============================================

/**
 * Create an Axios client with standard interceptors.
 *
 * @param {string} defaultBaseURL - Fallback base URL when no VITE_API_BASE_URL is set.
 * @param {string} [pathPrefix]   - Path prefix used when using same-origin proxy.
 *                                  E.g. '/api/products' for product service.
 * @returns {import('axios').AxiosInstance}
 */
function createApiClient(defaultBaseURL, pathPrefix) {
  // In Docker/Nginx mode: VITE_API_BASE_URL is empty string → relative URLs → Nginx proxy.
  // In native dev mode: VITE_API_BASE_URL is undefined → fallback to defaultBaseURL.
  const baseURL = import.meta.env.VITE_API_BASE_URL === undefined
    ? defaultBaseURL
    : import.meta.env.VITE_API_BASE_URL + (pathPrefix || '')

  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })

  // Request interceptor: attach JWT if available
  client.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Response interceptor: handle 401
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && getToken()) {
        notifyUnauthorized()
      }
      return Promise.reject(error)
    },
  )

  return client
}

// ============================================
// Service Clients
// ============================================
// In Docker mode (VITE_API_BASE_URL = ''), all clients use the same origin
// with path prefixes so Nginx can route to the correct backend service.
// In native dev mode, each client points to its own localhost port.

const productClient = createApiClient(
  'http://localhost:8081',
  '/api/products',
)

const userClient = createApiClient(
  'http://localhost:8006',
  '/api/users',
)

const orderClient = createApiClient(
  'http://localhost:8082',
  '/api/v1/orders',
)

// ============================================
// Exports
// ============================================

export { productClient, userClient, orderClient }
