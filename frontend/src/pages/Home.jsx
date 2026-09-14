import { Link } from 'react-router-dom'
import { listProducts } from '../api/products'
import AssuranceSection from '../components/home/AssuranceSection'
import Hero from '../components/home/Hero'
import HowOrderingWorks from '../components/home/HowOrderingWorks'
import CatalogGate from '../components/common/CatalogGate'
import Container from '../components/layout/Container'
import Section from '../components/layout/Section'
import ProductImage from '../components/product/ProductImage'
import ProductGrid, { ProductGridSkeleton } from '../components/product/ProductGrid'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { ArrowRightIcon, StoreIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { categorySummary, newestProducts } from '../lib/catalog'
import { pluralize } from '../lib/format'

/** Wide tile for the category discovery band. */
function CategoryTile({ category }) {
  return (
    <Link
      to={`/products?category=${encodeURIComponent(category.name)}`}
      className="group relative overflow-hidden rounded-xl border border-line-soft"
    >
      <ProductImage
        product={{ name: category.name, imageUrl: category.imageUrl }}
        aspect="aspect-16/11"
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-4">
        <div className="text-white">
          <p className="text-sm font-semibold">{category.name}</p>
          <p className="text-xs text-white/75">{pluralize(category.count, 'product')}</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ArrowRightIcon className="size-4" />
        </span>
      </div>
    </Link>
  )
}

function SectionHeading({ eyebrow, title, to, linkLabel }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <p className="text-eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
      </div>
      {to && (
        <Link
          to={to}
          className="press hidden shrink-0 items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink sm:inline-flex"
        >
          {linkLabel}
          <ArrowRightIcon className="size-4" />
        </Link>
      )}
    </div>
  )
}

function Home() {
  const { isAuthenticated } = useAuth()
  useDocumentTitle(null)

  // The product service is authenticated-only: only ask for the catalog when
  // there is a session to send.
  const { data, status, error, refetch } = useApiResource(
    ({ signal }) => listProducts({ signal }),
    [],
    { enabled: isAuthenticated, initialData: [] },
  )

  const products = Array.isArray(data) ? data : []
  const categories = categorySummary(products, 6)
  const featured = products.slice(0, 4)
  const arrivals = newestProducts(products, 4)
  const showArrivals = products.length > 4
  const isLoading = isAuthenticated && status === 'loading'

  return (
    <>
      <Hero
        featuredProduct={isAuthenticated ? products[0] : null}
        isAuthenticated={isAuthenticated}
      />

      {!isAuthenticated && (
        <Section spacing="md">
          <Container>
            <CatalogGate
              title="The catalog is behind your account"
              description="Sign in to browse live products, current prices and real availability — the product service only answers authenticated requests."
            />
          </Container>
        </Section>
      )}

      {isAuthenticated && status === 'error' && (
        <Section spacing="md">
          <Container>
            <ErrorState error={error} onRetry={refetch} />
          </Container>
        </Section>
      )}

      {isAuthenticated && (isLoading || categories.length > 0) && (
        <Section id="categories" spacing="md">
          <Container>
            <SectionHeading
              eyebrow="Discovery"
              title="Shop by category"
              to="/products"
              linkLabel="All products"
            />

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="skeleton aspect-16/11 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <CategoryTile key={category.name} category={category} />
                ))}
              </div>
            )}
          </Container>
        </Section>
      )}

      {isAuthenticated && status !== 'error' && (
        <Section spacing="md" className="border-t border-line-soft">
          <Container>
            <SectionHeading
              eyebrow="Selected"
              title="Featured products"
              to="/products"
              linkLabel="View all"
            />

            {isLoading && <ProductGridSkeleton count={4} />}

            {!isLoading && featured.length === 0 && (
              <EmptyState
                icon={StoreIcon}
                title="The catalog is empty"
                description="No products have been published yet. Administrators can add the first product from the admin console."
                actions={
                  <Link
                    to="/admin/products"
                    className="press text-sm font-medium text-ink underline underline-offset-4"
                  >
                    Go to product management
                  </Link>
                }
              />
            )}

            {!isLoading && featured.length > 0 && <ProductGrid products={featured} />}
          </Container>
        </Section>
      )}

      {isAuthenticated && showArrivals && (
        <Section spacing="md" surface="canvas" bordered>
          <Container>
            <SectionHeading
              eyebrow="Just landed"
              title="New arrivals"
              to="/products?sort=newest"
              linkLabel="See what's new"
            />
            <ProductGrid products={arrivals} />
          </Container>
        </Section>
      )}

      <HowOrderingWorks />
      <AssuranceSection />
    </>
  )
}

export default Home
