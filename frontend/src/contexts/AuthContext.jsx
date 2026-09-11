import { useState, useEffect, useCallback } from 'react'
import {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
  setOnUnauthorized,
} from '../services/api/apiClient'
import { getCurrentUser as fetchCurrentUser } from '../services/authService'
import AuthContext from './AuthContextObject'

/**
 * AuthProvider — manages global authentication state.
 *
 * State shape:
 *   - user:     { id, firstName, lastName, email, phoneNumber, role } | null
 *   - token:    string | null
 *   - loading:  boolean (initial auth check in progress)
 *   - isAuthenticated: boolean
 *
 * On mount, checks for an existing JWT in localStorage and validates it
 * by calling GET /api/users/me. If invalid/expired, clears auth state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [token, setTokenState] = useState(() => getToken())
  const [loading, setLoading] = useState(true)

  // Validate existing token on mount
  useEffect(() => {
    const existingToken = getToken()
    if (!existingToken) {
      setLoading(false)
      return
    }

    fetchCurrentUser()
      .then((userData) => {
        setUser(userData)
        setTokenState(existingToken)
        setStoredUser(userData)
      })
      .catch(() => {
        // Token is invalid or expired — clear everything
        clearAuth()
        setUser(null)
        setTokenState(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Register global 401 handler
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null)
      setTokenState(null)
      clearAuth()
    })
  }, [])

  const login = useCallback((newToken, userData) => {
    setToken(newToken)
    setTokenState(newToken)
    if (userData) {
      setStoredUser(userData)
      setUser(userData)
    } else {
      // Fetch user profile if not provided
      fetchCurrentUser()
        .then((fetchedUser) => {
          setStoredUser(fetchedUser)
          setUser(fetchedUser)
        })
        .catch(() => {
          // Token was set but /me failed — clear auth
          clearAuth()
          setUser(null)
          setTokenState(null)
        })
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setTokenState(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
