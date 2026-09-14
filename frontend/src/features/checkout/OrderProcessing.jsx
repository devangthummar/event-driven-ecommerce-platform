import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import Spinner from '../../components/ui/Spinner'
import { CheckIcon, CloseIcon, PackageIcon, RefreshIcon, WalletIcon } from '../../components/ui/Icons'

/**
 * OrderProcessing
 * --------------------------------------------------------------------------
 * Explains the distributed transaction in the user's own terms without
 * exposing internals, and is explicit that "processing" is not "done".
 *
 * The order contract only exposes PENDING → PAID/CANCELLED, so the middle
 * phase is described as one step that covers stock reservation and payment
 * rather than pretending to know which one is in flight.
 */
function OrderProcessing({ orderNumber, order, isPolling, isTimedOut, onRetry, error }) {
  const status = order?.status
  const isPaid = status === 'PAID'
  const isCancelled = status === 'CANCELLED'
  const isPending = !status || status === 'PENDING'

  const steps = [
    {
      key: 'accepted',
      title: 'Order accepted',
      description: `The order service recorded ${orderNumber} and published an order event.`,
      state: 'done',
    },
    {
      key: 'processing',
      title: 'Reserving stock and taking payment',
      description:
        'Inventory reserves the items, then the payment service debits your wallet.',
      state: isPaid ? 'done' : isCancelled ? 'failed' : 'active',
    },
    {
      key: 'confirmed',
      title: isCancelled ? 'Order cancelled' : 'Order confirmed',
      description: isCancelled
        ? 'Reserved stock was released and the order is closed.'
        : 'The order is paid and will be fulfilled.',
      state: isPaid ? 'done' : isCancelled ? 'failed' : 'pending',
    },
  ]

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow mb-1">
            {isPaid ? 'Order confirmed' : isCancelled ? 'Order cancelled' : 'Processing order'}
          </p>
          <p className="font-mono text-base font-semibold text-ink">{orderNumber}</p>
        </div>

        {isPolling && (
          <span className="flex items-center gap-2 text-xs text-ink-muted" role="status">
            <Spinner className="size-3.5" />
            Checking status…
          </span>
        )}
      </div>

      <ol className="mt-5 space-y-4">
        {steps.map((step) => (
          <li key={step.key} className="flex gap-3.5">
            <span
              className={[
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
                step.state === 'done'
                  ? 'border-success bg-success-soft text-success'
                  : step.state === 'failed'
                    ? 'border-danger bg-danger-soft text-danger'
                    : step.state === 'active'
                      ? 'border-ink bg-surface text-ink'
                      : 'border-line bg-surface text-ink-faint',
              ].join(' ')}
            >
              {step.state === 'done' ? (
                <CheckIcon className="size-3.5" />
              ) : step.state === 'failed' ? (
                <CloseIcon className="size-3.5" />
              ) : step.state === 'active' ? (
                <Spinner className="size-3.5" />
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>

            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.state === 'pending' ? 'text-ink-faint' : 'text-ink'
                }`}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      {error && !isCancelled && (
        <Alert tone="warning" className="mt-5" title="We could not read the latest status">
          {error.message}
        </Alert>
      )}

      {isPending && isTimedOut && (
        <Alert tone="info" className="mt-5" title="This is taking longer than usual">
          The saga has not reported a terminal state yet. It usually settles within a few seconds —
          you can check again, or find the order in your history at any time.
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {isPaid && order?.id !== undefined && (
          <Link
            to={`/orders/${order.id}`}
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
          >
            <PackageIcon className="size-4" />
            View order
          </Link>
        )}

        {isPending && (
          <Button
            variant={isTimedOut ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onRetry}
            isLoading={isPolling}
            loadingLabel="Checking…"
          >
            <RefreshIcon className="size-4" />
            Check again
          </Button>
        )}

        <Link to="/orders" className={buttonClasses({ variant: isPaid ? 'secondary' : 'ghost', size: 'sm' })}>
          <WalletIcon className="size-4" />
          Your orders
        </Link>
      </div>
    </div>
  )
}

export default OrderProcessing
