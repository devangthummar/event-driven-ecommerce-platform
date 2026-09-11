import Button from './Button'

/**
 * ErrorState — clean, user-friendly error display with optional retry.
 * Does not expose raw backend/technical details to the user.
 */
function ErrorState({ message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <p className="text-secondary mb-6 max-w-md">
        {message || 'Something went wrong. Please try again.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export default ErrorState
