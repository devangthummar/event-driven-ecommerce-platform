import axios from 'axios'

/* ==========================================================================
   API client
   --------------------------------------------------------------------------
   Single place that owns:
     • the API origin (one env var, empty = same-origin reverse proxy)
     • JWT attachment and session-expiry handling
     • error normalization into one `ApiError` shape
     • request cancellation

   Services never call axios directly and never build URLs by hand, so the
   "base URL + path prefix" double-prefix class of bug cannot come back.
   ========================================================================== */

const TOKEN_KEY = 'aureum.token'
const USER_KEY = 'aureum.user'

const REQUEST_TIMEOUT_MS = 15000

/* -------------------------------------------------------------------------
   Normalized API error
   ------------------------------------------------------------------------- */

/**
 * Error thrown by every API call.
 *
 * The backend is the security authority, so its status code is preserved
 * verbatim on `status`; screens branch on that rather than on message text.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null, raw = '', code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.raw = raw
    this.code = code
  }

  get isOffline() {
    return this.code === 'network'
  }

  get isTimeout() {
    return this.code === 'timeout'
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isConflict() {
    return this.status === 409
  }

  get isRateLimited() {
    return this.status === 429
  }

  get isServerError() {
    return this.status >= 500
  }

  /** True when the request never produced a response (network/timeout). */
  get isUnreachable() {
    return this.status === 0
  }
}

const DEFAULT_MESSAGES = {
  400: 'That request could not be processed. Please check the details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  405: 'That action is not supported.',
  409: 'That conflicts with something that already exists.',
  413: 'That file is too large.',
  422: 'Some of the details need correcting.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'A required service is unavailable right now. Please try again shortly.',
  503: 'A required service is unavailable right now. Please try again shortly.',
  504: 'A required service took too long to respond. Please try again shortly.',
}

/**
 * Detect the user-service validation shape: a bare `{ field: "message" }` map
 * (Spring's MethodArgumentNotValidException handler returns exactly that,
 * with no envelope).
 */
function extractFieldErrors(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  if ('message' in data || 'error' in data || 'status' in data) return null

  const entries = Object.entries(data).filter(([, value]) => typeof value === 'string')
  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

/** Pull the human-readable server message out of any documented error body. */
function extractServerMessage(data) {
  if (typeof data === 'string') {
    const trimmed = data.trim()
    // Plain-text bodies are only useful when they read like a sentence.
    return trimmed && trimmed.length < 300 && !trimmed.startsWith('<') ? trimmed : ''
  }
  if (!data || typeof data !== 'object') return ''

  const candidate = data.message ?? data.error ?? data.detail
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  return ''
}

/**
 * Turn anything thrown by axios into an ApiError with a message that is safe
 * and useful to show a person.
 *
 * @param {unknown} error
 * @param {Record<number|string, string>} [overrides] status → message, for
 *        endpoints where the generic copy is misleading (e.g. login 401).
 */
export function normalizeError(error, overrides) {
  if (error instanceof ApiError) return error
  if (isCanceled(error)) return error

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new ApiError('The request took too long. Please try again.', {
      status: 0,
      code: 'timeout',
      raw: error.message,
    })
  }

  if (!error?.response) {
    return new ApiError(
      'We could not reach the server. Check your connection and try again.',
      { status: 0, code: 'network', raw: error?.message || '' },
    )
  }

  const { status, data } = error.response
  const fieldErrors = extractFieldErrors(data)
  const serverMessage = extractServerMessage(data)

  const override = overrides?.[status]
  const fallback = DEFAULT_MESSAGES[status] || 'Something went wrong. Please try again.'

  // A validation map has no single message, so lead with the first field error
  // and keep the whole map available for inline form display.
  const message =
    override ||
    (fieldErrors ? Object.values(fieldErrors)[0] : '') ||
    serverMessage ||
    fallback

  return new ApiError(message, {
    status,
    fieldErrors,
    raw: typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data ?? '').slice(0, 500),
  })
}

export function isCanceled(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED'
}

/* -------------------------------------------------------------------------
   Token + cached identity
   ------------------------------------------------------------------------- */

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload || typeof payload.exp !== 'number') return false
    return payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode / quota) — the session degrades to memory */
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
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

export function clearAuthStorage() {
  setToken(null)
  setStoredUser(null)
}

/* -------------------------------------------------------------------------
   Session expiry hook
   ------------------------------------------------------------------------- */

let onUnauthorized = null

/**
 * Registered by the auth provider so a token that the backend rejects clears
 * local state without this module importing the provider (no cycles).
 */
export function setOnUnauthorized(callback) {
  onUnauthorized = callback
}

function handleUnauthorized() {
  clearAuthStorage()
  onUnauthorized?.()
}

/* -------------------------------------------------------------------------
   Transport
   ------------------------------------------------------------------------- */

/**
 * Same-origin by default: in Docker the Nginx reverse proxy routes `/api/*`
 * to the right service, and in native development the Vite dev server proxy
 * does the same. VITE_API_BASE_URL only needs a value when the API genuinely
 * lives on another origin.
 */
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export function apiUrl(path) {
  return `${API_ORIGIN}${path}`
}

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only a genuinely expired/invalid token on an authenticated request clears the session.
    // An endpoint 401 or 403 on a valid unexpired token MUST NOT log the user out.
    const token = getToken()
    if (error?.response?.status === 401 && token && isTokenExpired(token)) {
      handleUnauthorized()
    }
    return Promise.reject(error)
  },
)

/**
 * Perform a request and return the parsed body.
 *
 * @param {'get'|'post'|'put'|'patch'|'delete'} method
 * @param {string} path absolute API path, e.g. '/api/products'
 * @param {object} [options]
 * @param {object} [options.data] JSON body
 * @param {object} [options.params] query params
 * @param {AbortSignal} [options.signal]
 * @param {Record<number|string, string>} [options.messageOverrides]
 */
export async function request(method, path, options = {}) {
  const { data, params, signal, messageOverrides, responseType } = options
  try {
    const response = await http.request({
      method,
      url: apiUrl(path),
      data,
      params,
      signal,
      responseType,
    })
    return response.data
  } catch (error) {
    throw normalizeError(error, messageOverrides)
  }
}

export const api = {
  get: (path, options) => request('get', path, options),
  post: (path, options) => request('post', path, options),
  put: (path, options) => request('put', path, options),
  patch: (path, options) => request('patch', path, options),
  delete: (path, options) => request('delete', path, options),
}

export default api
