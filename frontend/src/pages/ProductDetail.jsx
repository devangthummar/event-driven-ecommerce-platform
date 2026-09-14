import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getInventory } from '../api/inventory'
import { getProduct, listProducts } from '../api/products'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Container from '../components/layout/Container'
import ProductGrid from '../components/product/ProductGrid'
import ProductImage from '../components/product/ProductImage'
import QuantityStepper from '../components/ui/QuantityStepper'
import Rating from '../components/ui/Rating'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Badge from '../components/ui/Badge'
import { BagIcon, CheckIcon, PackageIcon, ShieldIcon, StoreIcon, WalletIcon } from '../components/ui/Icons'
import { useCart } from '../contexts/useCart'
import { useToast } from '../contexts/useToast'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatCurrency, formatDate, productCode, toNumber } from '../lib/format'

function DetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <Skeleton className="aspect-4/5 w-full" rounded="rounded-2xl" />
      <div className="pt-2">
        <Skeleton className="h-3 w-20" rounded="rounded-full" />
        <Skeleton className="mt-4 h-9 w-3/4" rounded="rounded-lg" />
        <Skeleton className="mt-4 h-5 w-28" rounded="rounded-full" />
        <Skeleton className="mt-8 h-20 w-full" rounded="rounded-lg" />
        <Skeleton className="mt-8 h-11 w-full max-w-xs" rounded="rounded-md" />
      </div>
    </div>
  )
}

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const toast = useToast()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const {
    data: product,
    status,
    error,
    refetch,
  } = useApiResource(({ signal }) => getProduct(id, { signal }), [id], { initialData: null })

  useDocumentTitle(product?.name || 'Product')

  // Live availability lives in the Inventory Service. A 404 there simply means
  // no inventory record exists for the product, not that anything broke.
  const { data: inventory, status: inventoryStatus } = useApiResource(
    ({ signal }) => getInventory(id, { signal }),
    [id],
    { enabled: Boolean(product), initialData: null },
  )

  const { data: catalog } = useApiResource(
    ({ signal }) => listProducts({ signal }),
    [],
    { enabled: Boolean(product), initialData: [] },
  )

  const related = useMemo(() => {
    if (!product || !Array.isArray(catalog)) return []
    return catalog
      .filter(
        (candidate) =>
          String(candidate.id) !== String(product.id) &&
          candidate.category &&
          product.category &&
          candidate.category.toLowerCase() === product.category.toLowerCase(),
      )
      .slice(0, 4)
  }, [catalog, product])

  const availability = useMemo(() => {
    // Prefer the inventory service; fall back to the catalog's stock figure.
    const fromInventory =
      inventoryStatus === 'success' && Number.isInteger(inventory?.availableQuantity)
        ? inventory.availableQuantity
        : null
    const fromCatalog = Number.isInteger(product?.stockQuantity) ? product.stockQuantity : null
    const available = fromInventory ?? fromCatalog

    return {
      available,
      isTracked: available !== null,
      source: fromInventory !== null ? 'inventory' : fromCatalog !== null ? 'catalog' : 'unknown',
      soldOut: available !== null && available <= 0,
      low: available !== null && available > 0 && available <= 5,
    }
  }, [inventory, inventoryStatus, product])

  if (status === 'loading') {
    return (
      <Container className="py-10 sm:py-14">
        <DetailSkeleton />
      </Container>
    )
  }

  if (status === 'error') {
    const isMissing = error?.isNotFound
    return (
      <Container className="py-14">
        <Breadcrumbs
          items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/products' }, { label: 'Not found' }]}
          className="mb-8"
        />
        {isMissing ? (
          <EmptyState
            icon={StoreIcon}
            title="That product is not available"
            description="It may have been removed from the catalog. Everything currently published is in the shop."
            actions={
              <Link to="/products" className={buttonClasses({ variant: 'primary' })}>
                Browse the catalog
              </Link>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={refetch} />
        )}
      </Container>
    )
  }

  if (!product) return null

  const price = toNumber(product.price)
  const maxQuantity = availability.available !== null ? Math.max(1, Math.min(availability.available, 20)) : 20

  const handleAddToBag = () => {
    addItem(product, quantity)
    setJustAdded(true)
    toast.success(
      'Added to your bag',
      `${quantity} × ${product.name} — open the bag to check out.`,
    )
    setTimeout(() => setJustAdded(false), 1600)
  }

  const handleBuyNow = () => {
    addItem(product, quantity)
    navigate('/checkout')
  }

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/products' },
          ...(product.category
            ? [{ label: product.category, to: `/products?category=${encodeURIComponent(product.category)}` }]
            : []),
          { label: product.name },
        ]}
        className="mb-6"
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line-soft">
            <ProductImage product={product} priority className="rounded-2xl" sizes="(min-width: 1024px) 45vw, 92vw" />
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Imagery is supplied by the catalog. Additional views are published by administrators.
          </p>
        </div>

        <div className="lg:pt-1">
          {product.category && (
            <Link
              to={`/products?category=${encodeURIComponent(product.category)}`}
              className="press text-eyebrow inline-block hover:text-ink"
            >
              {product.category}
            </Link>
          )}

          <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl lg:text-[2.125rem]">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Rating
              value={product.averageRating}
              size="md"
              fallback={<span className="text-xs text-ink-muted">Not yet rated</span>}
            />
            <span className="text-2xl font-semibold text-ink tabular-nums">
              {formatCurrency(price, { placeholder: 'Price on request' })}
            </span>
          </div>

          <div className="mt-4">
            {availability.soldOut ? (
              <Badge tone="outline" size="md">
                Out of stock
              </Badge>
            ) : availability.available !== null ? (
              <Badge tone={availability.low ? 'warning' : 'success'} size="md" dot>
                {availability.low
                  ? `Only ${availability.available} left`
                  : `${availability.available} available`}
              </Badge>
            ) : (
              <Badge tone="outline" size="md">
                Availability not tracked
              </Badge>
            )}
          </div>

          {product.description && (
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">{product.description}</p>
          )}

          <div className="mt-8 flex flex-col gap-4 border-t border-line-soft pt-8">
            <div className="flex flex-wrap items-center gap-4">
              <QuantityStepper
                value={quantity}
                min={1}
                max={maxQuantity}
                onChange={setQuantity}
                disabled={availability.soldOut}
                label="Quantity"
              />

              <span className="text-sm text-ink-muted tabular-nums">
                Line total{' '}
                <span className="font-semibold text-ink">{formatCurrency(price * quantity)}</span>
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant={justAdded ? 'success' : 'primary'}
                className="sm:min-w-48"
                disabled={availability.soldOut}
                onClick={handleAddToBag}
              >
                {justAdded ? (
                  <>
                    <CheckIcon className="size-4" />
                    Added to bag
                  </>
                ) : (
                  <>
                    <BagIcon className="size-4" />
                    {availability.soldOut ? 'Out of stock' : 'Add to bag'}
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                disabled={availability.soldOut}
                onClick={handleBuyNow}
              >
                Buy now
              </Button>
            </div>

            {availability.soldOut && (
              <Alert tone="warning" title="This product is currently unavailable">
                Stock is reserved from the inventory service. Add it to your bag once it is back —
                availability updates as soon as stock is replenished.
              </Alert>
            )}

            {availability.source === 'catalog' && !availability.soldOut && (
              <p className="text-xs text-ink-faint">
                No inventory record exists for this product yet, so availability comes from the
                catalog figure.
              </p>
            )}
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-line-soft pt-8 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-faint">Product code</dt>
              <dd className="mt-1 font-mono text-sm text-ink">{productCode(product.id)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Category</dt>
              <dd className="mt-1 text-sm text-ink">{product.category || 'Uncategorised'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Added to catalog</dt>
              <dd className="mt-1 text-sm text-ink">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Ratings</dt>
              <dd className="mt-1 text-sm text-ink">
                {toNumber(product.averageRating) > 0
                  ? `${toNumber(product.averageRating).toFixed(1)} out of 5`
                  : 'No ratings yet'}
              </dd>
            </div>
          </dl>

          <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
            <li className="flex items-start gap-2.5">
              <PackageIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Stock is reserved the moment your order is accepted.
            </li>
            <li className="flex items-start gap-2.5">
              <WalletIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Payment is taken from your wallet once stock is secured.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              If either step fails, the order is cancelled and stock is released.
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line-soft pt-12 sm:mt-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-eyebrow mb-2">More in {product.category}</p>
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">You might also like</h2>
            </div>
            <Link
              to={`/products?category=${encodeURIComponent(product.category)}`}
              className="press text-sm font-medium text-ink-soft hover:text-ink"
            >
              View category
            </Link>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
    </Container>
  )
}

export default ProductDetail
