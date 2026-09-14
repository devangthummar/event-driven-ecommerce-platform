import { Link } from 'react-router-dom'
import { formatCurrency, toNumber } from '../../lib/format'
import ProductImage from '../product/ProductImage'

/**
 * OrderItemsList
 * --------------------------------------------------------------------------
 * The order contract stores `productId`, quantity and the price snapshot taken
 * at order time — not the product name. Names and imagery are resolved from
 * the catalog index when available; when a product has since been removed the
 * row still renders everything the order itself knows.
 */
function OrderItemsList({ items = [], productsById, className = '' }) {
  if (items.length === 0) {
    return <p className={`text-sm text-ink-muted ${className}`}>This order has no line items.</p>
  }

  return (
    <ul className={`divide-y divide-line-soft ${className}`}>
      {items.map((item) => {
        const product = productsById?.get(String(item.productId))
        const lineTotal = item.totalPrice ?? toNumber(item.price) * item.quantity
        const name = product?.name || `Product #${item.productId}`

        return (
          <li key={`${item.productId}-${item.quantity}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <div className="w-14 shrink-0">
              <ProductImage
                product={{ name, imageUrl: product?.imageUrl }}
                className="rounded-md border border-line-soft"
                sizes="56px"
              />
            </div>

            <div className="min-w-0 flex-1">
              {product ? (
                <Link
                  to={`/products/${item.productId}`}
                  className="press line-clamp-2 text-sm font-medium text-ink hover:text-ink-soft"
                >
                  {name}
                </Link>
              ) : (
                <span className="line-clamp-2 text-sm font-medium text-ink">{name}</span>
              )}
              <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                {item.quantity} × {formatCurrency(item.price)}
              </p>
            </div>

            <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
              {formatCurrency(lineTotal)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default OrderItemsList
