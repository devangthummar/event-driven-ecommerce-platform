import { Link } from 'react-router-dom'
import Container from '../components/layout/Container'
import { buttonClasses } from '../components/ui/buttonStyles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop all products' },
  { to: '/orders', label: 'Your orders' },
  { to: '/account', label: 'Account settings' },
]

function NotFound() {
  useDocumentTitle('Page not found')

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-mono text-sm text-ink-faint">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">
          This page does not exist
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The link may be outdated, or the page may have moved. Here is everything that is actually
          here.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className={buttonClasses({ variant: 'primary' })}>
            Back to home
          </Link>
          <Link to="/products" className={buttonClasses({ variant: 'secondary' })}>
            Browse the catalog
          </Link>
        </div>

        <ul className="mt-10 grid gap-2 text-sm sm:grid-cols-2">
          {LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="press block rounded-md border border-line px-4 py-3 text-left text-ink-soft hover:border-ink/30 hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  )
}

export default NotFound
