import { Link, useParams } from 'react'
import { getOrder } from '../api/orders'
import Container from '../components/layout/Container'
import OrderItemsList from '../components/order/OrderItemsList'
import OrderTimeline from '../components/order/OrderTimeline'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Badge from '../components/ui/Badge'
import { ShieldIcon, StoreIcon, ZapIcon } from '../components/ui/Icons'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProductIndex } from '../hooks/useProductIndex'
import { formatCurrency, formatDateTime, formatRelativeTime, pluralize } from '../lib/format'
import { isTerminalStatus } from '../lib/orderStatus'

function OrderDetail() {
  const { id } = useParams()

  const { data: order, status, error, refetch } = useApiResource(
    ({ signal }) => getOrder(id, { signal }),
    [id],
    { initialData: null },
  )

  useDocumentTitle(order?.orderNumber ? `Order ${order.orderNumber}` : 'Order')

  const { byId } = useProductIndex({ enabled: Boolean(order) })

  if (status === 'loading') {
    return (
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-3 w-40" rounded="rounded-full" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" rounded="rounded-xl" />
            <Skeleton className="h-64 w-full" rounded="rounded-xl" />
          </div>
          <Skeleton className="h-72 w-full" rounded="rounded-xl" />
        </div>
      </Container>
    )
  }

  if (status === 'error') {
    const isMissing = error?.isNotFound
    const isForbidden = error?.isForbidden

    return (
      <Container className="max-w-2xl py-14">
        {isMissing ? (
          <EmptyState
            icon={StoreIcon}
            title="We could not find that order"
            description="The order number may be wrong, or the order belongs to another account."
            actions={
              <Link to="/orders" className={buttonClasses({ variant: 'primary' })}>
                Back to your orders
              </Link>
            }
          />
        ) : isForbidden ? (
          <EmptyState
            icon={ShieldIcon}
            title="This order is not yours to view"
            description="Orders are protected by ownership checks on the server, so only the account that placed it can open it."
            actions={
              <Link to="/orders" className={buttonClasses({ variant: 'primary' })}>
                Back to your orders
              </Link>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={refetch} />
        )}
      </Container>
    )
  }

  if (!order) return null

  const items = order.items || []
  const isSettling = !isTerminalStatus(order.status)
  const isCancelled = order.status === 'CANCELLED'

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Your orders', to: '/orders' },
          { label: order.orderNumber },
        ]}
        className="mb-6"
      />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft pb-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-eyebrow">Order Reference</p>
            <Badge tone="neutral" size="sm">ID #{order.id}</Badge>
          </div>
          <h1 className="mt-1 font-mono text-xl font-semibold text-ink sm:text-2xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Placed {formatDateTime(order.createdAt)} · {formatRelativeTime(order.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} size="md" showRaw />
          {isSettling && (
            <Button variant="secondary" size="sm" onClick={refetch} isLoading={false}>
              Check status
            </Button>
          )}
        </div>
      </div>

      {/* Distributed Architecture / Saga Execution Showcase Banner */}
      <div className="mt-6 rounded-2xl border border-line bg-canvas p-5 sm:p-6">
        <div className="flex items-center gap-2.5 text-ink">
          <ZapIcon className="size-4.5 text-warning" />
          <h2 className="text-sm font-semibold">Distributed Saga Execution Showcase</h2>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          This order was processed via Kafka events through Order Service, Inventory Service, and Payment Service with Transactional Outbox pattern.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line-soft bg-surface p-3">
            <span className="text-[10px] font-semibold uppercase text-ink-faint">1. Order Service</span>
            <p className="mt-0.5 text-xs font-semibold text-ink">Order Created</p>
            <span className="mt-1 inline-block text-[10px] font-mono text-success">PENDING</span>
          </div>

          <div className="rounded-lg border border-line-soft bg-surface p-3">
            <span className="text-[10px] font-semibold uppercase text-ink-faint">2. Inventory Service</span>
            <p className="mt-0.5 text-xs font-semibold text-ink">Stock Reservation</p>
            <span className="mt-1 inline-block text-[10px] font-mono text-success">
              {isCancelled ? 'RELEASED (COMPENSATED)' : 'STOCK RESERVED'}
            </span>
          </div>

          <div className="rounded-lg border border-line-soft bg-surface p-3">
            <span className="text-[10px] font-semibold uppercase text-ink-faint">3. Payment Service</span>
            <p className="mt-0.5 text-xs font-semibold text-ink">Wallet Settlement</p>
            <span className={`mt-1 inline-block text-[10px] font-mono ${isCancelled ? 'text-danger' : 'text-success'}`}>
              {isCancelled ? 'FAILED (INSUFFICIENT)' : 'PAID (DEBITED)'}
            </span>
          </div>

          <div className="rounded-lg border border-line-soft bg-surface p-3">
            <span className="text-[10px] font-semibold uppercase text-ink-faint">4. Final State</span>
            <p className="mt-0.5 text-xs font-semibold text-ink">Order Settled</p>
            <span className={`mt-1 inline-block text-[10px] font-mono ${isCancelled ? 'text-danger' : 'text-success'}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink">
              Items in this order
              <span className="ml-2 font-normal text-ink-muted">
                {pluralize(items.length, 'line item')}
              </span>
            </h2>
            <OrderItemsList className="mt-4" items={items} productsById={byId} />
          </section>

          {isSettling && (
            <p className="text-xs leading-relaxed text-ink-muted">
              This order is still being processed. The order service publishes an event and the
              inventory and payment services act on it; the status updates here as soon as it
              settles.
            </p>
          )}
        </div>

        <aside className="space-y-6">
          <OrderTimeline status={order.status} placedAt={order.createdAt} />

          <div className="rounded-xl border border-line bg-canvas p-5">
            <h2 className="text-sm font-semibold text-ink">Totals</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Order total</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 text-xs text-ink-muted">
                <dt>Order reference</dt>
                <dd className="font-mono">{order.orderNumber}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
              Prices are the snapshot the order service recorded when the order was created.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/orders" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              All orders
            </Link>
            <Link to="/products" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  )
}

export default OrderDetail
