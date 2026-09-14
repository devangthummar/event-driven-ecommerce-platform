import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useCart } from '../../contexts/useCart'
import { fullName, initials } from '../../lib/format'
import { buttonClasses } from '../ui/buttonStyles'
import Dropdown, { dropdownItemClasses } from '../ui/Dropdown'
import IconButton from '../ui/IconButton'
import { BagIcon, MenuIcon, SearchIcon, ShieldIcon, UserIcon } from '../ui/Icons'
import Container from './Container'
import MobileNav from './MobileNav'

const NAV_LINKS = [
  { to: '/products', label: 'Shop' },
  { to: '/products?sort=newest', label: 'New arrivals', matchSort: 'newest' },
]

/**
 * SiteHeader
 * --------------------------------------------------------------------------
 * Sticky, one line tall, and identical in structure at every breakpoint —
 * but the phone experience is delegated entirely to MobileNav instead of
 * collapsing the desktop bar into an unusable strip.
 */
function SiteHeader() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') || '')

  // Keep the header search in sync with the URL (deep links, back/forward).
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 4)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products')
  }

  const isProductsRoute = location.pathname.startsWith('/products')

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={[
          'sticky top-0 z-40 border-b bg-surface/90 backdrop-blur-md transition-shadow duration-200',
          isScrolled ? 'border-line shadow-xs' : 'border-transparent',
        ].join(' ')}
      >
        <Container>
          <div className="flex h-16 items-center gap-3 lg:h-[72px] lg:gap-6">
            <IconButton
              label="Open menu"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(true)}
            >
              <MenuIcon className="size-5" />
            </IconButton>

            <Link
              to="/"
              className="press flex shrink-0 items-center gap-2 text-[19px] font-semibold tracking-[-0.03em] text-ink lg:text-xl"
            >
              <span className="flex size-6 items-center justify-center rounded-[7px] bg-ink text-[11px] font-bold text-white">
                A
              </span>
              AUREUM
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => {
                const isNewArrivals = Boolean(link.matchSort)
                const active = isProductsRoute
                  ? isNewArrivals
                    ? searchParams.get('sort') === link.matchSort
                    : searchParams.get('sort') !== 'newest'
                  : false

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={`press rounded-md px-3 py-2 text-sm font-medium ${
                      active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {link.label}
                  </NavLink>
                )
              })}
            </nav>

            <form onSubmit={handleSearch} role="search" className="relative ml-auto hidden max-w-xs flex-1 md:block">
              <label htmlFor="header-search" className="sr-only">
                Search products
              </label>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="header-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="h-10 w-full rounded-full border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ink/8"
              />
            </form>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <IconButton
                label="Search products"
                className="md:hidden"
                onClick={() => navigate('/products')}
              >
                <SearchIcon className="size-5" />
              </IconButton>

              {isAuthenticated ? (
                <Dropdown
                  align="right"
                  trigger={
                    <button
                      type="button"
                      className="press hidden items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-ink/30 hover:bg-canvas md:flex"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                        {initials(user?.firstName, user?.lastName)}
                      </span>
                      <span className="max-w-24 truncate text-sm font-medium text-ink">
                        {user?.firstName || 'Account'}
                      </span>
                    </button>
                  }
                >
                  <div className="border-b border-line-soft px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-ink">{fullName(user)}</p>
                    <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                  </div>

                  <Link to="/orders" role="menuitem" className={dropdownItemClasses}>
                    Your orders
                  </Link>
                  <Link to="/account" role="menuitem" className={dropdownItemClasses}>
                    Account settings
                  </Link>
                  <Link to="/account/wallet" role="menuitem" className={dropdownItemClasses}>
                    Wallet
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" role="menuitem" className={dropdownItemClasses}>
                      <ShieldIcon className="size-4" />
                      Admin console
                    </Link>
                  )}

                  <div className="my-1 border-t border-line-soft" />

                  <button
                    type="button"
                    role="menuitem"
                    className={dropdownItemClasses}
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  >
                    Sign out
                  </button>
                </Dropdown>
              ) : (
                <Link
                  to="/login"
                  className={`${buttonClasses({ variant: 'ghost', size: 'sm' })} hidden md:inline-flex`}
                >
                  <UserIcon className="size-4" />
                  Sign in
                </Link>
              )}

              <Link
                to="/cart"
                aria-label={`Your bag${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ', empty'}`}
                className="press relative flex size-10 items-center justify-center rounded-md text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <BagIcon className="size-5" />
                {itemCount > 0 && (
                  <span className="absolute right-1 top-1 flex min-w-[17px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold leading-[17px] text-white tabular-nums">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </Container>
      </header>

      <MobileNav open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  )
}

export default SiteHeader
