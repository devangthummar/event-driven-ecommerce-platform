import { formatCurrency, pluralize } from '../../lib/format'

/**
 * CartSummary — totals panel shared by the bag and checkout screens.
 *
 * Only subtotal and total are shown because those are the only amounts the
 * platform models: the Order Service computes the total from live product
 * prices, and there is no shipping or tax service, so displaying invented
 * shipping or tax lines would be dishonest.
 */
function CartSummary({ itemCount, subtotal, children, footnote = null, title = 'Order summary' }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Subtotal ({pluralize(itemCount, 'item')})</dt>
          <dd className="font-medium text-ink tabular-nums">{formatCurrency(subtotal)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-medium text-ink">Order total</dt>
          <dd className="text-base font-semibold text-ink tabular-nums">
            {formatCurrency(subtotal)}
          </dd>
        </div>
      </dl>

      {children && <div className="mt-5">{children}</div>}

      {footnote && <p className="mt-3 text-xs leading-relaxed text-ink-muted">{footnote}</p>}
    </div>
  )
}

export default CartSummary
