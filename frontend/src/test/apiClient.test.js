import { describe, test, expect, beforeEach, vi } from 'vitest'
import { ApiError, normalizeError, getToken, setToken, clearAuthStorage } from '../api/client'

/** Shape of an axios rejection. */
function httpError(status, data) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
    isAxiosError: true,
  })
}

describe('normalizeError', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('surfaces the backend message and status from a Spring error envelope', () => {
    const error = normalizeError(
      httpError(409, {
        timestamp: '2026-01-01T00:00:00',
        status: 409,
        error: 'Conflict',
        message: 'An account with this email already exists.',
        path: '/api/users/register',
      }),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('An account with this email already exists.')
    expect(error.isConflict).toBe(true)
  })

  test('extracts field errors from the user-service validation map', () => {
    const error = normalizeError(
      httpError(400, {
        email: 'Enter a valid email address',
        phoneNumber: 'Enter a valid 10-digit Indian mobile number',
      }),
    )

    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({
      email: 'Enter a valid email address',
      phoneNumber: 'Enter a valid 10-digit Indian mobile number',
    })
    // The first field error leads the generic message.
    expect(error.message).toBe('Enter a valid email address')
  })

  test('uses endpoint overrides so login 401 is not reported as an expired session', () => {
    const error = normalizeError(
      httpError(401, { status: 401, error: 'Unauthorized', message: 'Invalid email or password' }),
      { 401: 'Incorrect email or password. Please try again.' },
    )

    expect(error.isUnauthorized).toBe(true)
    expect(error.message).toBe('Incorrect email or password. Please try again.')
  })

  test('reports an unreachable service distinctly from a server fault', () => {
    const network = normalizeError(
      Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }),
    )
    expect(network.status).toBe(0)
    expect(network.isOffline).toBe(true)
    expect(network.message).toMatch(/could not reach the server/i)

    // A 5xx with a body surfaces what the service said; without one it falls
    // back to copy that does not blame the person using the app.
    const server = normalizeError(httpError(500, { message: 'boom' }))
    expect(server.isServerError).toBe(true)
    expect(server.message).toBe('boom')
    expect(normalizeError(httpError(500, {})).message).toMatch(/went wrong on our side/i)

    const unavailable = normalizeError(httpError(503, {}))
    expect(unavailable.message).toMatch(/unavailable right now/i)
  })

  test('reports a timeout', () => {
    const error = normalizeError(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }))
    expect(error.isTimeout).toBe(true)
    expect(error.status).toBe(0)
  })

  test('is idempotent for an already normalized error', () => {
    const original = new ApiError('nope', { status: 403 })
    expect(normalizeError(original)).toBe(original)
  })
})

describe('token storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('stores and clears the session token', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    clearAuthStorage()
    expect(getToken()).toBeNull()
  })

  test('degrades gracefully when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getToken()).toBeNull()
  })
})
