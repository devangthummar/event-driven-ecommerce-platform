import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { LoadingState } from '../components/ui/LoadingState'

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Behavior:
 *   - Shows a loading state while auth is being validated on mount.
 *   - Redirects to /login with a return URL if not authenticated.
 *   - Optionally checks for specific roles.
 *
 * Usage:
 *   <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
 *   <Route path="/admin/products" element={<ProtectedRoute roles={['ADMIN']}><AdminProducts /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState message="Verifying access…" />
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Role-based protection (for admin pages)
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
