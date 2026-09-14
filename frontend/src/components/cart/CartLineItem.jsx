import { Link } from 'react-router-dom'
import { formatCurrency, toNumber } from '../../lib/format'
import QuantityStepper from '../ui/QuantityStepper'
import ProductImage from '../product/ProductImage'
import Badge from '../ui/Badge'
import { TrashIcon } from '../ui/Icons'

/**
 * CartLineItem
 * --------------------------------------------------------------------------
 * Shows the price the catalog returned when the item was added. `priceNotice`
 * is how the checkout screen surfaces a line whose price moved between adding
 * and ordering — the order service will always use the live price, so the UI
 * says so rather than silently disagreeing with the receipt.
 */
function CartLineItem({ item, onQuantityChange, onRemove, priceNotice = null, max = 20 }) {
  const unitPrice = toNumber(item.price)
  const lineTotal = unitPrice * item.quantity

  return (
    <li className="flex gap-4 py-5 sm:gap-5">
      <div className="w-20 shrink-0 sm:w-24">
        <ProductImage
          product={item}
          className="rounded-lg border border-line-soft"
          sizes="96px"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.category && (
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                {item.category}
              </p>
            )}
            <Link
              to={`/products/${item.id}`}
              className="press mt-0.5 line-clamp-2 text-sm font-medium text-ink hover:text-ink-soft"
            >
              {item.name}
            </Link>
            <p className="mt-1 text-xs text-ink-muted tabular-nums">
              {formatCurrency(unitPrice)} each
            </p>
          </div>

          <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">
            {formatCurrency(lineTotal)}
          </p>
        </div>

        {priceNotice && (
          <Badge tone="warning" size="sm" className="mt-2 self-start">
            {priceNotice}
          </Badge>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={max}
            size="sm"
            label={`${item.name} quantity`}
            onChange={(next) => onQuantityChange(item.id, next)}
          />

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="press inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-danger"
          >
            <TrashIcon className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export default CartLineItem
