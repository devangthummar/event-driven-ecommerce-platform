import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../contexts/useCart'
import { formatCurrency, toNumber } from '../../lib/format'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Rating from '../ui/Rating'
import { CheckIcon } from '../ui/Icons'
import ProductImage from './ProductImage'

const NEW_WINDOW_MS = 21 * 24 * 60 * 60 * 1000

function isRecentlyAdded(createdAt) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created < NEW_WINDOW_MS
}

/**
 * ProductCard
 * --------------------------------------------------------------------------
 * One stretched link covers the card (a single, well-labelled tab stop) while
 * the quick-add button floats above it — so there is never a button nested in
 * an anchor.
 *
 * Stock comes from the catalog's own `stockQuantity`; the detail view adds the
 * live Inventory Service figure on top.
 */
function ProductCard({ product, priority = false }) {
  const { addItem, quantityOf } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const { id, name, price, category, stockQuantity } = product
  const soldOut = Number.isInteger(stockQuantity) && stockQuantity <= 0
  const lowStock = Number.isInteger(stockQuantity) && stockQuantity > 0 && stockQuantity <= 5
  const priceValue = toNumber(price)

  useEffect(() => {
    if (!justAdded) return undefined
    const timer = setTimeout(() => setJustAdded(false), 1600)
    return () => clearTimeout(timer)
  }, [justAdded])

  const handleAdd = () => {
    addItem(product)
    setJustAdded(true)
  }

  const inBag = quantityOf(id)

  return (
    <article className="group relative flex flex-col">
      {/* Whole-card navigation target, keyboard reachable, labelled. */}
      <Link
        to={`/products/${id}`}
        aria-label={`${name}${priceValue > 0 ? `, ${formatCurrency(priceValue)}` : ''} — view details`}
        className="absolute inset-0 z-10 rounded-lg"
      />

      <div className="relative">
        <ProductImage
          product={product}
          priority={priority}
          className={`rounded-lg border border-line-soft transition-colors duration-300 group-hover:border-line ${
            soldOut ? 'opacity-60' : ''
          }`}
        />

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {isRecentlyAdded(product.createdAt) && !soldOut && (
            <Badge tone="accent" size="sm">
              New
            </Badge>
          )}
          {soldOut && (
            <Badge tone="outline" size="sm" className="bg-surface">
              Sold out
            </Badge>
          )}
          {lowStock && !soldOut && (
            <Badge tone="warning" size="sm">
              {stockQuantity} left
            </Badge>
          )}
        </div>

        <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex translate-y-1.5 items-center opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <Button
            size="sm"
            variant={justAdded ? 'success' : 'primary'}
            className="w-full shadow-sm"
            disabled={soldOut}
            onClick={handleAdd}
            aria-label={soldOut ? `${name} is sold out` : `Add ${name} to bag`}
          >
            {justAdded ? (
              <>
                <CheckIcon className="size-3.5" />
                Added
              </>
            ) : soldOut ? (
              'Sold out'
            ) : (
              'Add to bag'
            )}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {category && <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">{category}</p>}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink">{name}</h3>

        <div className="mt-auto flex items-baseline justify-between gap-3 pt-2">
          <span className="text-[15px] font-semibold text-ink tabular-nums">
            {formatCurrency(priceValue, { placeholder: 'Price on request' })}
          </span>
          <Rating value={product.averageRating} fallback={null} />
        </div>

        {inBag > 0 && !soldOut && (
          <p className="mt-1.5 text-[11px] font-medium text-ink-muted">{inBag} in your bag</p>
        )}
      </div>
    </article>
  )
}

export default ProductCard
