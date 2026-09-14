import { Link } from 'react-router-dom'
import { ChevronRightIcon } from './Icons'

/**
 * Breadcrumbs — `items` is a list of { label, to? }; the entry without `to`
 * is the current page and is announced as such.
 */
function Breadcrumbs({ items = [], className = '' }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="press rounded-sm hover:text-ink hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="max-w-[16rem] truncate font-medium text-ink" aria-current="page">
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRightIcon className="size-3 text-ink-faint" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
