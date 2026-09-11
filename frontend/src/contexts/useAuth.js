import { useContext } from 'react'
import AuthContext from './AuthContextObject'

/**
 * useAuth — hook for accessing authentication state and methods.
 * @returns {{ user, token, loading, isAuthenticated, login, logout }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
