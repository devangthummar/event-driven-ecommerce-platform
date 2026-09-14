import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createOrder } from '../api/orders'
import CartSummary from '../components/cart/CartSummary'
import Container from '../components/layout/Container'
import PageHeader from '../components/layout/PageHeader'
import OrderItemsList from '../components/order/OrderItemsList'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import { BagIcon } from '../components/ui/Icons'
import OrderProcessing from '../features/checkout/OrderProcessing'
import WalletPanel from '../features/checkout/WalletPanel'
import { useAuth } from '../contexts/useAuth'
import { useCart } from '../contexts/useCart'
import { useToast } from '../contexts/useToast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useOrderWatcher } from '../hooks/useOrderWatcher'
import { useProductIndex } from '../hooks/useProductIndex'
import { useWallet } from '../hooks/useWallet'
import { formatCurrency, pluralize, toNumber } from '../lib/format'

/* ==========================================================================
   Checkout
   --------------------------------------------------------------------------
   The real sequence, in order:
     1. reconcile the bag against the live catalog (the order service prices
        every line itself, so the UI must not disagree with it)
     2. make sure the wallet exists and covers the total — wallet is the only
        payment method the platform implements
     3. POST /api/v1/orders with an idempotency key, which returns PENDING
     4. watch the saga settle the order (PENDING → PAID / CANCELLED)
   ========================================================================== */

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `aureum-${crypto.randomUUID()}`
  }
  return `aureum-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function Checkout() {
  const { user } = useAuth()
  const { items, itemCount, clearCart, replaceItems } = useCart()
  const toast = useToast()
  const location = useLocation()
  useDocumentTitle('Checkout')

  const [placedOrder, setPlacedOrder] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bagSnapshot = useRef([])

  const { byId, status: catalogStatus } = useProductIndex({
    enabled: Boolean(user?.id) && items.length > 0,
  })

  const wallet = useWallet(user?.id, { enabled: Boolean(user?.id) && !placedOrder })

  /* --- Bag reconciliation ------------------------------------------------ */

  const reconciled = useMemo(() => {
    const lines = []
    const unavailable = []

    for (const item of items) {
      const product = catalogStatus === 'success' ? byId.get(String(item.id)) : undefined

      if (catalogStatus === 'success' && !product) {
        unavailable.push(item)
        continue
      }

      const unitPrice = product ? toNumber(product.price) : toNumber(item.price)
      lines.push({
        productId: item.id,
        quantity: item.quantity,
        price: unitPrice,
        totalPrice: unitPrice * item.quantity,
        name: product?.name || item.name,
        imageUrl: product?.imageUrl ?? item.imageUrl,
        changed: product ? toNumber(product.price) !== toNumber(item.price) : false,
        available: Number.isInteger(product?.stockQuantity) ? product.stockQuantity : null,
      })
    }

    const liveTotal = lines.reduce((sum, line) => sum + line.totalPrice, 0)
    const hasUnavailable = unavailable.length > 0
    const overStock = lines.filter((line) => line.available !== null && line.quantity > line.available)

    return { lines, unavailable, liveTotal, hasUnavailable, overStock }
  }, [byId, catalogStatus, items])

  const showsLiveTotal = catalogStatus === 'success'
  const orderTotal = showsLiveTotal ? reconciled.liveTotal : 0

  const canSubmit =
    !isSubmitting &&
    !placedOrder &&
    !reconciled.hasUnavailable &&
    reconciled.overStock.length === 0 &&
    wallet.status === 'ready' &&
    wallet.balance >= orderTotal &&
    orderTotal > 0

  /* --- Idempotency ------------------------------------------------------- */

  // A key identifies one order *intent*. Retrying after a network failure
  // reuses it (so the backend replays instead of duplicating); changing the
  // bag produces a new intent and a new key.
  const intentRef = useRef({ signature: '', key: '' })

  const keyForCurrentBag = useCallback(() => {
    const signature = JSON.stringify(
      items.map((item) => [item.id, item.quantity]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    )
    if (intentRef.current.signature !== signature) {
      intentRef.current = { signature, key: newIdempotencyKey() }
    }
    return intentRef.current.key
  }, [items])

  /* --- Submit ------------------------------------------------------------ */

  const handlePlaceOrder = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const order = await createOrder({
        userId: user.id,
        items: reconciled.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        idempotencyKey: keyForCurrentBag(),
      })

      // Keep a snapshot so a cancelled order can be put back in the bag.
      bagSnapshot.current = items
      setPlacedOrder(order)
      clearCart()
      toast.info(
        'Order placed',
        `${order.orderNumber} was accepted and is now being processed.`,
      )
    } catch (error) {
      setSubmitError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  /* --- Settlement watching ---------------------------------------------- */

  const watcher = useOrderWatcher({
    userId: user?.id,
    orderNumber: placedOrder?.orderNumber,
    enabled: Boolean(placedOrder?.orderNumber),
  })

  const settledStatus = watcher.order?.status

  const handleRestoreBag = () => {
    replaceItems(bagSnapshot.current)
    setPlacedOrder(null)
    setSubmitError(null)
    toast.info('Bag restored', 'Your items are back in the bag — top up your wallet and try again.')
  }

  /* --- Empty state ------------------------------------------------------ */

  if (items.length === 0 && !placedOrder) {
    return (
      <Container className="py-14 sm:py-20">
        <EmptyState
          icon={BagIcon}
          title="Nothing to check out"
          description="Your bag is empty, so there is nothing to order yet."
          actions={
            <Link to="/products" className={buttonClasses({ variant: 'primary' })}>
              Browse the catalog
            </Link>
          }
        />
      </Container>
    )
  }

  /* --- Post-submission view --------------------------------------------- */

  if (placedOrder) {
    return (
      <Container className="max-w-3xl py-10 sm:py-14">
        <OrderProcessing
          orderNumber={placedOrder.orderNumber}
          order={watcher.order || placedOrder}
          isPolling={watcher.isPolling}
          isTimedOut={watcher.isTimedOut}
          error={watcher.error}
          onRetry={watcher.retry}
        />

        {settledStatus === 'CANCELLED' && (
          <div className="mt-6 space-y-3">
            <Alert tone="danger" title="The order could not be completed">
              Stock could not be reserved, or your wallet did not cover the total. Nothing was
              charged and any reserved stock was released.
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRestoreBag}>Restore bag and try again</Button>
              <Link to="/account/wallet" className={buttonClasses({ variant: 'secondary' })}>
                Top up wallet
              </Link>
              <Link to="/orders" className={buttonClasses({ variant: 'ghost' })}>
                Your orders
              </Link>
            </div>
          </div>
        )}

        {settledStatus === 'PAID' && (
          <div className="mt-6 rounded-xl border border-line bg-canvas p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink">What happens next</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>• Your items are reserved and the payment has settled.</li>
              <li>• Track or review this order at any time from your order history.</li>
              <li>• Administrators move orders through dispatched and delivered stages.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/orders" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                View your orders
              </Link>
              <Link to="/products" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </Container>
    )
  }

  /* --- Checkout form ---------------------------------------------------- */

  const walletReady = wallet.status === 'ready'
  const shortfall = walletReady ? Math.max(0, orderTotal - wallet.balance) : 0

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Final step"
        title="Checkout"
        description={`${pluralize(itemCount, 'item')} in your bag. Review the lines, then place the order.`}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-6">
          {reconciled.hasUnavailable && (
            <Alert
              tone="danger"
              title="Some items are no longer available"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    replaceItems(items.filter((item) => byId.has(String(item.id))))
                    toast.info('Bag updated', 'Unavailable items were removed.')
                  }}
                >
                  Remove them
                </Button>
              }
            >
              {reconciled.unavailable.map((item) => item.name).join(', ')} — the order service would
              reject this order.
            </Alert>
          )}

          {reconciled.overStock.length > 0 && (
            <Alert tone="warning" title="Some quantities exceed available stock">
              {reconciled.overStock
                .map((line) => `${line.name}: ${line.available} available`)
                .join(' · ')}
              . Reduce the quantity in your bag to continue.
            </Alert>
          )}

          <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-ink">Order review</h2>
              <Link
                to="/cart"
                className="press text-xs font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                Edit bag
              </Link>
            </div>

            <OrderItemsList
              className="mt-4"
              items={reconciled.lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                price: line.price,
                totalPrice: line.totalPrice,
              }))}
              productsById={
                new Map(reconciled.lines.map((line) => [String(line.productId), { name: line.name, imageUrl: line.imageUrl }]))
              }
            />

            {reconciled.lines.some((line) => line.changed) && (
              <p className="mt-4 border-t border-line-soft pt-3 text-xs text-ink-muted">
                Some prices differ from when these were added — the totals here come straight from
                the live catalog and match what the order service will calculate.
              </p>
            )}
          </section>

          <WalletPanel
            orderTotal={orderTotal}
            wallet={wallet.wallet}
            status={wallet.status}
            error={wallet.error}
            isMutating={wallet.isMutating}
            onCreate={async () => {
              try {
                await wallet.createWallet()
                toast.success('Wallet ready', 'Add funds to cover this order.')
              } catch (error) {
                toast.error('Could not set up your wallet', error.message)
              }
            }}
            onAddFunds={async (amount) => {
              try {
                await wallet.addFunds(amount)
                toast.success('Funds added', `${formatCurrency(amount)} was credited to your wallet.`)
              } catch (error) {
                toast.error('Top-up failed', error.message)
              }
            }}
          />
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary
            itemCount={itemCount}
            subtotal={showsLiveTotal ? orderTotal : undefined}
            title="Amount due"
            footnote="No delivery address is collected by this build — no address service exists in the platform. Payments are taken from your wallet by the payment service once stock is reserved."
          >
            <Button
              size="lg"
              fullWidth
              onClick={handlePlaceOrder}
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingLabel="Placing order…"
            >
              Place order
            </Button>

            {!walletReady && wallet.status === 'missing' && (
              <p className="mt-2 text-center text-xs text-ink-muted">
                Set up your wallet to enable ordering.
              </p>
            )}

            {walletReady && shortfall > 0 && (
              <p className="mt-2 text-center text-xs text-ink-muted">
                Add {formatCurrency(shortfall)} to cover this order.
              </p>
            )}

            {catalogStatus === 'loading' && (
              <p className="mt-2 text-center text-xs text-ink-muted">Confirming live prices…</p>
            )}
          </CartSummary>

          {submitError && (
            <Alert tone="danger" className="mt-4" title="The order was not created">
              {submitError.message}
              {submitError.isServerError || submitError.isUnreachable
                ? ' You can safely try again — the same order is reused instead of duplicated.'
                : ''}
            </Alert>
          )}

          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Signed in as <span className="font-medium text-ink">{user?.email}</span>
            {location.state?.from ? ' — returning you here after checkout.' : '.'}
          </p>
        </div>
      </div>
    </Container>
  )
}

export default Checkout
