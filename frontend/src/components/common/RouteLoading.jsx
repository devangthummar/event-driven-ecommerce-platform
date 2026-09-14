import Spinner from '../ui/Spinner'

/**
 * RouteLoading — used while a lazily loaded route chunk downloads and while a
 * stored session is being verified. Keeps a full-height surface so the footer
 * never jumps up into view during the wait.
 */
function RouteLoading({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <Spinner className="size-5" />
      <p role="status" className="text-sm">
        {label}
      </p>
    </div>
  )
}

export default RouteLoading
