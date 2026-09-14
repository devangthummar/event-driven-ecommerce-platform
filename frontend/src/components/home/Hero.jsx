import { Link } from 'react-router-dom'
import Container from '../layout/Container'
import { buttonClasses } from '../ui/buttonStyles'
import { ArrowRightIcon, CheckIcon } from '../ui/Icons'
import ProductImage from '../product/ProductImage'
import { formatCurrency } from '../../lib/format'

const CAPABILITIES = [
  'Catalog and pricing served to your account',
  'Stock reserved the moment you order',
  'Wallet payments settled by a dedicated service',
]

/**
 * Hero
 * --------------------------------------------------------------------------
 * A typographic hero with one supporting visual. When the catalog is readable
 * the visual is a real product; otherwise it is the honest state of the
 * storefront (the catalog requires a session) rather than a stock photo or an
 * invented promise.
 */
function Hero({ featuredProduct, isAuthenticated }) {
  return (
    <section className="border-b border-line-soft">
      <Container>
        <div className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="text-eyebrow mb-4">Curated commerce</p>

            <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[3.5rem]">
              Fewer, better things.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              A tightly edited catalog of electronics, home and lifestyle pieces — chosen for
              materials, utility, and how they hold up over time.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/products"
                className={buttonClasses({ variant: 'primary', size: 'lg' })}
              >
                Browse the catalog
                <ArrowRightIcon className="size-4" />
              </Link>

              {!isAuthenticated && (
                <Link
                  to="/register"
                  className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                >
                  Create an account
                </Link>
              )}
            </div>

            <ul className="mt-9 space-y-2.5">
              {CAPABILITIES.map((capability) => (
                <li key={capability} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            {featuredProduct ? (
              <div className="relative mx-auto max-w-md lg:ml-auto lg:mr-0">
                <ProductImage
                  product={featuredProduct}
                  priority
                  className="rounded-2xl border border-line-soft"
                  sizes="(min-width: 1024px) 32vw, 80vw"
                />

                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-line-soft bg-surface/95 p-4 shadow-lg backdrop-blur-sm sm:inset-x-6 sm:bottom-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                    Featured
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{featuredProduct.name}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                        {formatCurrency(featuredProduct.price)}
                      </p>
                    </div>
                    <Link
                      to={`/products/${featuredProduct.id}`}
                      className="press shrink-0 text-xs font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
                    >
                      View product
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hairline-grid relative mx-auto flex aspect-4/5 max-w-md flex-col justify-end overflow-hidden rounded-2xl bg-ink p-7 text-white lg:ml-auto lg:mr-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Aureum catalog
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
                  Live products, live pricing
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  The product service only serves the catalog to authenticated accounts, so sign in
                  to see what is actually in stock right now.
                </p>
                <Link
                  to={isAuthenticated ? '/products' : '/login'}
                  className="press mt-6 inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-white/90"
                >
                  {isAuthenticated ? 'Open the catalog' : 'Sign in to browse'}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
