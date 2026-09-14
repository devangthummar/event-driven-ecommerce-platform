import { Link, useLocation } from 'react-router-dom'
import { buttonClasses } from '../ui/buttonStyles'
import { BagIcon, ShieldIcon, TruckIcon } from '../ui/Icons'

/**
 * CatalogGate
 * --------------------------------------------------------------------------
 * The Product Service authenticates every request (see its SecurityConfig:
 * only actuator and the ADMIN-only mutations are open, `anyRequest()` requires
 * a JWT), so the catalog genuinely cannot be browsed anonymously.
 *
 * Rather than fire a doomed request and show a misleading error — or fake
 * content — the storefront says so plainly and routes the person to sign in
 * with the page they wanted preserved.
 */
function CatalogGate({ title = 'Sign in to browse the catalog', description }) {
  const location = useLocation()
  const next = `${location.pathname}${location.search}`

  return (
    <div className="rounded-xl border border-line bg-canvas px-6 py-12 sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-surface text-ink shadow-xs">
          <BagIcon className="size-5" />
        </span>

        <h2 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
          {description ||
            'Catalog and pricing are served to signed-in accounts. Sign in or create an account to explore products, build a bag and check out.'}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            state={{ from: next }}
            className={buttonClasses({ variant: 'primary', size: 'lg' })}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            state={{ from: next }}
            className={buttonClasses({ variant: 'secondary', size: 'lg' })}
          >
            Create an account
          </Link>
        </div>

        <ul className="mt-9 grid gap-3 text-left text-xs text-ink-muted sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <ShieldIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
            Session tokens are issued and verified for every request.
          </li>
          <li className="flex items-start gap-2">
            <TruckIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
            Stock is reserved in real time when you place an order.
          </li>
        </ul>
      </div>
    </div>
  )
}

export default CatalogGate
