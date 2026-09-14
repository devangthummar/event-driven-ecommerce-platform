import Button from './Button'
import { AlertIcon, RefreshIcon } from './Icons'
import { ApiError } from '../../api/client'

/**
 * ErrorState — failures are shown, never swallowed.
 *
 * The language changes with the failure kind (offline vs. server vs. rejected)
 * because "Something went wrong" is not actionable. Backend messages are
 * surfaced as-is when they exist; raw stack traces never are.
 */
function describe(error) {
  if (!error) {
    return { title: 'Something went wrong', message: 'Please try again in a moment.' }
  }

  if (error.isOffline) {
    return {
      title: 'You appear to be offline',
      message: 'Check your connection and try again — nothing you did was lost.',
    }
  }

  if (error.isTimeout) {
    return {
      title: 'That took too long',
      message: 'The service did not respond in time. It may still be starting up.',
    }
  }

  if (error.isServerError) {
    return {
      title: 'A service is having trouble',
      message: 'Our backend could not complete that request. Please try again shortly.',
    }
  }

  if (error.isForbidden) {
    return { title: 'Access denied', message: 'Your account does not have access to this.' }
  }

  return {
    title: error instanceof ApiError ? 'We could not load this' : 'Something went wrong',
    message: error.message || 'Please try again in a moment.',
  }
}

function ErrorState({ error, title, message, onRetry, retryLabel = 'Try again', className = '' }) {
  const described = describe(error)

  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center rounded-xl border border-line bg-canvas px-6 py-16 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertIcon className="size-5" />
      </span>

      <h2 className="text-lg font-semibold text-ink">{title || described.title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-ink-muted">{message || described.message}</p>

      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
          <RefreshIcon className="size-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
