import { Link } from 'react-router-dom'
import Button from './Button'

/**
 * EmptyState — intentional empty state when no data is available.
 * Maintains the quiet-luxury design language.
 */
function EmptyState({
  title,
  description,
  actionLabel = 'Browse products',
  actionTo = '/products',
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <h2 className="text-2xl font-semibold text-primary tracking-tight mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-secondary mb-8 max-w-md">
          {description}
        </p>
      )}
      {onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : (
        <Link to={actionTo}>
          <Button variant="secondary">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  )
}

export default EmptyState
