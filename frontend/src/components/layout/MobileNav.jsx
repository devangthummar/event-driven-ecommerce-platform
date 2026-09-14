import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useCart } from '../../contexts/useCart'
import { fullName } from '../../lib/format'
import { buttonClasses } from '../ui/buttonStyles'
import IconButton from '../ui/IconButton'
import { BagIcon, CloseIcon, SearchIcon, ShieldIcon } from '../ui/Icons'

const PRIMARY_LINKS = [
  { to: '/products', label: 'All products' },
  { to: '/products?sort=newest', label: 'New arrivals' },
]

/**
 * MobileNav — a purpose-built phone navigation sheet.
 *
 * The desktop header is not squeezed onto small screens: this surface carries
 * search, primary navigation and account actions in a thumb-reachable column,
 * closes on selection, and traps focus while open.
 */
function MobileNav({ open, onClose }) {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const panelRef = useRef(null)
  const titleId = useId()
  const [query, setQuery] = useState('')

  // Close when the route changes (tapping a link should feel immediate).
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    panelRef.current?.querySelector('input, a, button')?.focus?.()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const handleSearch = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    onClose()
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products')
  }

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-overlay-in bg-ink/45" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[100dvh] animate-panel-in flex-col overflow-y-auto bg-surface pb-8"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span id={titleId} className="text-eyebrow">
            Menu
          </span>
          <IconButton label="Close menu" onClick={onClose}>
            <CloseIcon className="size-5" />
          </IconButton>
        </div>

        <form onSubmit={handleSearch} className="px-4 pb-4" role="search">
          <label htmlFor="mobile-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="mobile-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="h-11 w-full rounded-md border border-line bg-canvas pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ink/8"
            />
          </div>
        </form>

        <nav aria-label="Primary" className="border-t border-line-soft px-2 py-2">
          {PRIMARY_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="press block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line-soft px-2 py-2">
          <Link
            to="/cart"
            className="press flex items-center justify-between rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
          >
            <span className="flex items-center gap-2.5">
              <BagIcon className="size-5 text-ink-muted" />
              Your bag
            </span>
            {itemCount > 0 && <span className="text-sm text-ink-muted tabular-nums">{itemCount}</span>}
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/orders"
                className="press block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
              >
                Your orders
              </Link>
              <Link
                to="/account"
                className="press block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
              >
                Account settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="press flex items-center gap-2.5 rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
                >
                  <ShieldIcon className="size-5 text-ink-muted" />
                  Admin console
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="press block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="press block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-canvas"
              >
                Create an account
              </Link>
            </>
          )}
        </div>

        <div className="mt-auto border-t border-line-soft px-4 pt-5">
          {isAuthenticated ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{fullName(user) || user?.email}</p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  onClose()
                  navigate('/')
                }}
                className="press shrink-0 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={onClose} className={`${buttonClasses({ variant: 'primary' })} w-full`}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default MobileNav
