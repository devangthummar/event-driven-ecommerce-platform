import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { hasAnyRole } from '../lib/roles'
import RouteLoading from './common/RouteLoading'
import { buttonClasses } from './ui/buttonStyles'
import { ShieldIcon } from './ui/Icons'

/**
 * ProtectedRoute — client-side gate for authenticated (and role-scoped) routes.
 *
 * This is UX only: every request the guarded screens make is still authorized
 * by the backend from the signed token, which is the actual authority. The
 * role check here just avoids showing an interface that would only 403.
 */
function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()
  const location = useLocation()

  // Wait for the stored token to be verified before deciding.
  if (isBootstrapping) {
    return <RouteLoading label="Verifying your session…" />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!hasAnyRole(user, roles)) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-canvas text-ink-muted">
          <ShieldIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold text-ink">You do not have access to this area</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This section requires a different account role. Your session is signed in as{' '}
          <span className="font-medium text-ink">{user?.email}</span>.
        </p>
        <div className="mt-7 flex gap-3">
          <Link to="/" className={buttonClasses({ variant: 'primary' })}>
            Back to home
          </Link>
          <Link to="/products" className={buttonClasses({ variant: 'secondary' })}>
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
