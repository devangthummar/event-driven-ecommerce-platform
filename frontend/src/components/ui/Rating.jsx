import { toNumber } from '../../lib/format'
import { StarIcon } from './Icons'

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
}

/**
 * Rating — read-only view of the catalog's `averageRating`.
 *
 * The Product Service exposes an average only (no review list), so this is a
 * genuine display of one number and never implies reviews that do not exist.
 */
function Rating({ value, size = 'sm', showValue = true, className = '', fallback = null }) {
  const rating = toNumber(value)

  if (rating <= 0) return fallback

  const rounded = Math.round(rating)
  const starSize = SIZES[size] || SIZES.sm

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <span className="flex items-center gap-0.5 text-accent" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} filled={index < rounded} className={starSize} />
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-medium text-ink-soft tabular-nums" aria-hidden="true">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  )
}

export default Rating
