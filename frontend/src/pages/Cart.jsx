import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CartLineItem from '../components/cart/CartLineItem'
import CartSummary from '../components/cart/CartSummary'
import Container from '../components/layout/Container'
import PageHeader from '../components/layout/PageHeader'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import { BagIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useCart } from '../contexts/useCart'
import { useToast } from '../contexts/useToast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProductIndex } from '../hooks/useProductIndex'
import { pluralize, toNumber } from '../lib/format'

function Cart() {
  const { isAuthenticated } = useAuth()
  const { items, itemCount, subtotal, removeItem, setQuantity, replaceItems } = useCart()
  const toast = useToast()
  const location = useLocation()
  useDocumentTitle('Your bag')

  // Reconcile the stored bag against the live catalog so a price move or a
  // removed product is visible before checkout, not during it.
  const { byId, status: catalogStatus } = useProductIndex({
    enabled: isAuthenticated && items.length > 0,
  })

  const { unavailable, priceChanged } = useMemo(() => {
    if (catalogStatus !== 'success') return { unavailable: [], priceChanged: [] }

    const missing = []
    const changed = []

    for (const item of items) {
      const product = byId.get(String(item.id))
      if (!product) {
        missing.push(item)
        continue
      }
      if (toNumber(product.price) !== toNumber(item.price)) changed.push(item)
    }

    return { unavailable: missing, priceChanged: changed }
  }, [byId, catalogStatus, items])

  const handleSyncPrices = () => {
    const next = items
      .filter((item) => byId.has(String(item.id)))
      .map((item) => {
        const product = byId.get(String(item.id))
        return {
          ...item,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl ?? null,
          category: product.category ?? null,
          stockQuantity: Number.isInteger(product.stockQuantity) ? product.stockQuantity : null,
        }
      })

    replaceItems(next)
    toast.success('Bag updated', 'Prices and availability now match the live catalog.')
  }

  const handleRemoveUnavailable = () => {
    replaceItems(items.filter((item) => byId.has(String(item.id))))
    toast.info('Removed unavailable items', `${pluralize(unavailable.length, 'item')} removed from your bag.`)
  }

  if (items.length === 0) {
    return (
      <Container className="py-14 sm:py-20">
        <EmptyState
          icon={BagIcon}
          title="Your bag is empty"
          description="Once you add something, it will stay here — even if you close the tab and come back later."
          actions={
            <Link to="/products" className={buttonClasses({ variant: 'primary' })}>
              Browse the catalog
            </Link>
          }
        />
      </Container>
    )
  }

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Checkout"
        title="Your bag"
        description={`${pluralize(itemCount, 'item')} ready to order.`}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div>
          {unavailable.length > 0 && (
            <Alert
              tone="warning"
              className="mb-6"
              title={`${pluralize(unavailable.length, 'item')} no longer in the catalog`}
              actions={
                <Button variant="secondary" size="sm" onClick={handleRemoveUnavailable}>
                  Remove unavailable items
                </Button>
              }
            >
              {unavailable.map((item) => item.name).join(', ')} — the order service would reject the
              order while these are in the bag.
            </Alert>
          )}

          {unavailable.length === 0 && priceChanged.length > 0 && (
            <Alert
              tone="info"
              className="mb-6"
              title="Prices have changed since you added these"
              actions={
                <Button variant="secondary" size="sm" onClick={handleSyncPrices}>
                  Update bag prices
                </Button>
              }
            >
              The order service always prices an order from the live catalog, so the total you see
              would be recalculated at checkout.
            </Alert>
          )}

          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {items.map((item) => {
              const isUnavailable = unavailable.some((entry) => String(entry.id) === String(item.id))
              const product = byId.get(String(item.id))
              const notice = isUnavailable
                ? 'No longer available'
                : catalogStatus === 'success' && product && toNumber(product.price) !== toNumber(item.price)
                  ? `Now ${toNumber(product.price).toFixed(2)}`
                  : null

              return (
                <CartLineItem
                  key={item.id}
                  item={item}
                  onQuantityChange={setQuantity}
                  onRemove={(id) => {
                    removeItem(id)
                    toast.info('Removed from bag', item.name)
                  }}
                  priceNotice={notice}
                />
              )
            })}
          </ul>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary
            itemCount={itemCount}
            subtotal={subtotal}
            footnote="The order service recalculates every line from live product prices when your order is placed."
          >
            {isAuthenticated ? (
              <Link to="/checkout" className={`${buttonClasses({ size: 'lg' })} w-full`}>
                Checkout
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  state={{ from: `${location.pathname}${location.search}` }}
                  className={`${buttonClasses({ size: 'lg' })} w-full`}
                >
                  Sign in to check out
                </Link>
                <p className="mt-2 text-center text-xs text-ink-muted">
                  Checkout needs an account so your order can be tied to a wallet.
                </p>
              </>
            )}
          </CartSummary>

          <Link
            to="/products"
            className="press mt-4 block text-center text-sm font-medium text-ink-soft hover:text-ink"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </Container>
  )
}

export default Cart
