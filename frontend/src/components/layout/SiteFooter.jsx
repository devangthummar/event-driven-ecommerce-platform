import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import Container from './Container'
import { ShieldIcon } from '../ui/Icons'

/**
 * SiteFooter
 * --------------------------------------------------------------------------
 * Every link here resolves to a page or anchor that actually exists. The old
 * footer linked to /about, /privacy, /careers and similar routes that were
 * never built, which meant every footer click landed on the 404 screen.
 */
function SiteFooter() {
  const { isAuthenticated } = useAuth()

  const shopLinks = [
    { to: '/products', label: 'All products' },
    { to: '/products?sort=newest', label: 'New arrivals' },
    { to: '/products?sort=rating-desc', label: 'Highest rated' },
    { to: '/cart', label: 'Your bag' },
  ]

  const accountLinks = isAuthenticated
    ? [
        { to: '/orders', label: 'Your orders' },
        { to: '/account', label: 'Account settings' },
        { to: '/account/wallet', label: 'Wallet' },
        { to: '/account/security', label: 'Security' },
      ]
    : [
        { to: '/login', label: 'Sign in' },
        { to: '/register', label: 'Create an account' },
        { to: '/products', label: 'Browse the catalog' },
      ]

  const platformLinks = [
    { to: '/#how-ordering-works', label: 'How ordering works' },
    { to: '/#assurance', label: 'Why Aureum' },
    { to: '/#categories', label: 'Shop by category' },
  ]

  return (
    <footer className="border-t border-line bg-canvas">
      <Container>
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:py-16">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-ink">
              <span className="flex size-6 items-center justify-center rounded-[7px] bg-ink text-[11px] font-bold text-white">
                A
              </span>
              AUREUM
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Considered goods for everyday life — chosen for materials, utility and how they age.
            </p>
          </div>

          <nav aria-label="Shop">
            <h2 className="text-eyebrow mb-4">Shop</h2>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="press text-sm text-ink-muted hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-eyebrow mb-4">Account</h2>
            <ul className="space-y-3">
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="press text-sm text-ink-muted hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Platform">
            <h2 className="text-eyebrow mb-4">Platform</h2>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="press text-sm text-ink-muted hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Aureum. Prices are confirmed by the order service at checkout.
          </p>
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <ShieldIcon className="size-3.5" />
            Ordering runs on an event-driven microservices platform
          </p>
        </div>
      </Container>
    </footer>
  )
}

export default SiteFooter
