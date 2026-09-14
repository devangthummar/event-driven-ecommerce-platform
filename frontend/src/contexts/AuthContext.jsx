import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearAuthStorage,
  getStoredUser,
  getToken,
  setOnUnauthorized,
  setStoredUser,
  setToken,
} from '../api/client'
import { getCurrentUser } from '../api/auth'
import { isAdmin as checkIsAdmin } from '../lib/roles'
import AuthContext from './AuthContextObject'

/* ==========================================================================
   AuthProvider
   --------------------------------------------------------------------------
   Session model (matches the backend exactly):
     • the User Service issues a short-lived RS256 JWT on POST /api/users/login
     • every other service verifies it against the public key
     • the token carries `role` and `userId` claims; ownership checks read them
     • there is no refresh endpoint in the contract, so an expired token simply
       ends the session and the UI returns the person to sign-in

   The token is kept in localStorage (the backend stays the authority) and is
   never rendered, logged, or placed in a URL.
   ========================================================================== */

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(() => getStoredUser())
  // `isBootstrapping` guards protected routes until the stored token has been
  // verified against /me at least once.
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getToken()))

  const clearSession = useCallback(() => {
    clearAuthStorage()
    setTokenState(null)
    setUser(null)
  }, [])

  // Verify a restored session once on mount.
  useEffect(() => {
    const existingToken = getToken()
    if (!existingToken) {
      setIsBootstrapping(false)
      return undefined
    }

    let isActive = true
    const controller = new AbortController()

    getCurrentUser({ signal: controller.signal })
      .then((profile) => {
        if (!isActive) return
        setUser(profile)
        setTokenState(existingToken)
        setStoredUser(profile)
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.isUnauthorized || error?.isForbidden) {
          clearSession()
        } else {
          // Transient failure (offline, service restart): keep the session if a
          // cached identity exists rather than signing the person out.
          const cached = getStoredUser()
          if (cached) {
            setUser(cached)
            setTokenState(existingToken)
          } else {
            clearSession()
          }
        }
      })
      .finally(() => {
        if (isActive) setIsBootstrapping(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [clearSession])

  // Any 401 on an authenticated request means the token is no longer accepted.
  useEffect(() => {
    setOnUnauthorized(() => {
      setTokenState(null)
      setUser(null)
    })
    return () => setOnUnauthorized(null)
  }, [])

  /**
   * Complete a sign-in.
   * @param {string} accessToken raw JWT from POST /api/users/login
   * @param {object} [profile] skip the /me round-trip when the profile is known
   */
  const login = useCallback(async (accessToken, profile) => {
    setToken(accessToken)
    setTokenState(accessToken)

    if (profile) {
      setStoredUser(profile)
      setUser(profile)
      return profile
    }

    try {
      const fetched = await getCurrentUser()
      setStoredUser(fetched)
      setUser(fetched)
      return fetched
    } catch (error) {
      // The token was rejected outright — do not leave a half-signed-in state.
      clearAuthStorage()
      setTokenState(null)
      setUser(null)
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  /** Refresh the cached profile (after a profile update, for example). */
  const refreshUser = useCallback(async () => {
    const fetched = await getCurrentUser()
    setStoredUser(fetched)
    setUser(fetched)
    return fetched
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isBootstrapping,
      loading: isBootstrapping,
      isAuthenticated: Boolean(token && user),
      isAdmin: checkIsAdmin(user),
      login,
      logout,
      refreshUser,
    }),
    [user, token, isBootstrapping, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
