import { Link } from 'react-router-dom'
import { formatCurrency, formatRelativeTime, pluralize } from '../../lib/format'
import { isTerminalStatus } from '../../lib/orderStatus'
import Button from '../ui/Button'
import { buttonClasses } from '../ui/buttonStyles'
import StatusBadge from '../ui/StatusBadge'
import ProductImage from '../product/ProductImage'
import OrderProgress from './OrderProgress'
import { RefreshIcon } from '../ui/Icons'

const MAX_THUMBS = 4

/**
 * OrderCard — one order in the history list.
 * Shows the state machine honestly (including "Processing" while the saga is
 * mid-flight) and offers a refresh for orders that have not settled yet.
 */
function OrderCard({ order, productsById, onRefresh, isRefreshing = false }) {
  const items = order.items || []
  const thumbnails = items.slice(0, MAX_THUMBS)
  const remaining = Math.max(0, items.length - thumbnails.length)
  const isSettling = !isTerminalStatus(order.status)

  return (
    <article className="rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-ink/20 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-ink">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Placed {formatRelativeTime(order.createdAt)} · {pluralize(items.length, 'line item')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-base font-semibold text-ink tabular-nums">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-4">
        <ul className="flex items-center gap-1.5">
          {thumbnails.map((item) => {
            const product = productsById?.get(String(item.productId))
            return (
              <li key={item.productId} className="w-12">
                <ProductImage
                  product={{
                    name: product?.name || `Product #${item.productId}`,
                    imageUrl: product?.imageUrl,
                  }}
                  className="rounded-md border border-line-soft"
                  sizes="48px"
                />
              </li>
            )
          })}
          {remaining > 0 && (
            <li className="flex size-12 items-center justify-center rounded-md border border-line-soft bg-canvas text-xs font-medium text-ink-muted">
              +{remaining}
            </li>
          )}
        </ul>
      </div>

      <OrderProgress status={order.status} className="mt-5" />

      <footer className="mt-5 flex flex-wrap items-center gap-2">
        {order.id !== undefined && order.id !== null && (
          <Link
            to={`/orders/${order.id}`}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            View details
          </Link>
        )}

        {isSettling && onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRefresh(order.id)}
            isLoading={isRefreshing}
            loadingLabel="Checking…"
          >
            <RefreshIcon className="size-4" />
            Check status
          </Button>
        )}
      </footer>
    </article>
  )
}

export default OrderCard
