import { ORDER_PROGRESS_STEPS, orderStatusMeta, progressIndex } from '../../lib/orderStatus'

/**
 * OrderProgress — compact "where is my order" strip for cards and headers.
 * Cancelled orders leave the happy path entirely, so they get their own
 * treatment instead of a misleading progress bar.
 */
function OrderProgress({ status, className = '' }) {
  if (status === 'CANCELLED') {
    return (
      <div className={`rounded-md border border-danger/20 bg-danger-soft px-3 py-2 ${className}`}>
        <p className="text-xs font-medium text-danger">{orderStatusMeta(status).summary}</p>
      </div>
    )
  }

  const current = progressIndex(status)
  const progress =
    ORDER_PROGRESS_STEPS.length > 1 ? (current / (ORDER_PROGRESS_STEPS.length - 1)) * 100 : 0

  return (
    <div className={className}>
      <div className="relative h-1 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        {ORDER_PROGRESS_STEPS.map((step, index) => (
          <span
            key={step}
            className={`text-[11px] ${
              index <= current ? 'font-medium text-ink' : 'text-ink-faint'
            }`}
          >
            {orderStatusMeta(step).label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default OrderProgress
