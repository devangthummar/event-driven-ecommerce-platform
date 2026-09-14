import IconButton from './IconButton'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

/** Build a compact page list: 1 … 4 5 6 … 12 */
function pageItems(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const items = new Set([1, pageCount, page, page - 1, page + 1])
  const sorted = [...items].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b)

  const withGaps = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) withGaps.push('gap')
    withGaps.push(value)
    previous = value
  }
  return withGaps
}

/**
 * Pagination — number buttons on wide screens, a plain "Page x of y" summary
 * with prev/next on phones (no horizontal overflow, no clipped targets).
 */
function Pagination({ page, pageCount, onPageChange, className = '', label = 'pagination' }) {
  if (!pageCount || pageCount <= 1) return null

  const items = pageItems(page, pageCount)

  return (
    <nav
      aria-label={label}
      className={`flex items-center justify-between gap-4 border-t border-line-soft pt-5 ${className}`}
    >
      <p className="text-xs text-ink-muted tabular-nums">
        Page <span className="font-medium text-ink">{page}</span> of {pageCount}
      </p>

      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon className="size-4" />
        </IconButton>

        <ul className="hidden items-center gap-1 sm:flex">
          {items.map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} className="px-1 text-xs text-ink-faint" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={[
                    'press h-8 min-w-8 rounded-md px-2 text-[13px] font-medium tabular-nums',
                    item === page
                      ? 'bg-ink text-white'
                      : 'text-ink-soft hover:bg-canvas hover:text-ink',
                  ].join(' ')}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>

        <IconButton
          label="Next page"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon className="size-4" />
        </IconButton>
      </div>
    </nav>
  )
}

export default Pagination
