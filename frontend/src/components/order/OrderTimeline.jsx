import { formatDateTime, formatRelativeTime } from '../../lib/format'
import { ORDER_PROGRESS_STEPS, orderStatusMeta, progressIndex } from '../../lib/orderStatus'
import { AlertIcon, CheckIcon } from '../ui/Icons'

/**
 * OrderTimeline — the vertical status story of one order.
 *
 * Only the placement timestamp exists in the order contract (OrderResponse
 * carries `createdAt` and nothing else), so no other step invents a date.
 * Steps after the current one are explicitly marked as not yet reached.
 */
function OrderTimeline({ status, placedAt, className = '' }) {
  if (status === 'CANCELLED') {
    return (
      <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Order cancelled</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Stock could not be reserved, or the wallet payment did not go through. Any stock that
              had been reserved for this order is released by the saga.
            </p>
            <p className="mt-3 text-xs text-ink-muted">
              Placed {formatDateTime(placedAt)} · status code{' '}
              <span className="font-mono text-[11px] text-ink-soft">CANCELLED</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const current = progressIndex(status)

  return (
    <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      <p className="text-eyebrow mb-4">Order status</p>

      <ol className="relative">
        {ORDER_PROGRESS_STEPS.map((step, index) => {
          const stepMeta = orderStatusMeta(step)
          const isDone = index < current
          const isCurrent = index === current
          const isLast = index === ORDER_PROGRESS_STEPS.length - 1

          return (
            <li key={step} className="relative flex gap-3.5 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-px ${
                    index < current ? 'bg-ink' : 'bg-line'
                  }`}
                />
              )}

              <span
                className={[
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full border',
                  isDone
                    ? 'border-ink bg-ink text-white'
                    : isCurrent
                      ? 'border-ink bg-surface text-ink'
                      : 'border-line bg-surface text-ink-faint',
                ].join(' ')}
              >
                {isDone ? <CheckIcon className="size-3.5" /> : <span className="size-2 rounded-full bg-current" />}
              </span>

              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-medium ${isCurrent || isDone ? 'text-ink' : 'text-ink-faint'}`}
                >
                  {stepMeta.label}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-canvas-deep px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                      Now
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  {isCurrent ? stepMeta.summary : isDone ? 'Completed.' : 'Not reached yet.'}
                </p>
                {index === 0 && placedAt && (
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {formatDateTime(placedAt)} · {formatRelativeTime(placedAt)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 border-t border-line-soft pt-3 text-[11px] text-ink-faint">
        Status code <span className="font-mono text-ink-soft">{status}</span>
      </p>
    </div>
  )
}

export default OrderTimeline
