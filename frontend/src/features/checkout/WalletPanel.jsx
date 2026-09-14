import { useState } from 'react'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Skeleton from '../../components/ui/Skeleton'
import { CheckCircleIcon, WalletIcon } from '../../components/ui/Icons'
import { formatCurrency, toNumber } from '../../lib/format'

const TOP_UP_PRESETS = [50, 100, 250, 500]

/**
 * WalletPanel
 * --------------------------------------------------------------------------
 * Wallet is the only payment method the platform implements (the
 * `PaymentMethod` enum has a single value and payments are created by the
 * saga, not the client), so this is not a fake "choose a payment method"
 * control — it shows the one real funding source and what it takes to use it.
 *
 * The balance is spent when the saga reaches the payment step, which is why
 * the panel states the requirement plainly rather than pretending to charge.
 */
function WalletPanel({ orderTotal, wallet, status, error, isMutating, onCreate, onAddFunds }) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [localError, setLocalError] = useState(null)

  const balance = toNumber(wallet?.balance)
  const total = toNumber(orderTotal)
  const isSufficient = balance >= total
  const shortfall = Math.max(0, total - balance)

  const handleTopUp = async (event) => {
    event.preventDefault()
    const parsed = toNumber(amount)
    if (parsed <= 0) {
      setLocalError('Enter an amount greater than zero.')
      return
    }

    setLocalError(null)
    try {
      await onAddFunds(parsed)
      setAmount('')
      setIsTopUpOpen(false)
    } catch {
      // The hook keeps the normalized error; nothing else to do here.
    }
  }

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <Skeleton className="h-4 w-28" rounded="rounded-full" />
        <Skeleton className="mt-3 h-7 w-40" rounded="rounded-md" />
        <Skeleton className="mt-4 h-11 w-full" rounded="rounded-md" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Alert tone="danger" title="We could not load your wallet">
        {error?.message || 'The payment service is unavailable right now. Please try again.'}
      </Alert>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <WalletIcon className="size-4 text-ink-muted" />
            Wallet
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {status === 'missing'
              ? 'A wallet is required before an order can be paid for.'
              : 'Your wallet is debited by the payment service when the order is processed.'}
          </p>
        </div>

        {status === 'ready' && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Balance</p>
            <p className="text-lg font-semibold text-ink tabular-nums">
              {formatCurrency(balance)}
            </p>
          </div>
        )}
      </div>

      {status === 'missing' && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onCreate} isLoading={isMutating} fullWidth>
            {isMutating ? 'Setting up…' : 'Set up wallet'}
          </Button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div
            className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
              isSufficient ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
            }`}
          >
            {isSufficient ? (
              <>
                <CheckCircleIcon className="size-4 shrink-0" />
                Covers this order of {formatCurrency(total)}.
              </>
            ) : (
              <>
                <span className="font-medium">
                  {formatCurrency(shortfall)} short for this order.
                </span>
              </>
            )}
          </div>

          {isTopUpOpen ? (
            <form onSubmit={handleTopUp} className="mt-4">
              <Input
                label="Amount to add"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="100.00"
                value={amount}
                error={localError}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setLocalError(null)
                }}
                autoFocus
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOP_UP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(String(preset))
                      setLocalError(null)
                    }}
                    className="press rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-ink/30 hover:text-ink"
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
                {shortfall > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(shortfall.toFixed(2))}
                    className="press rounded-full border border-ink/20 bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/40"
                  >
                    Exactly {formatCurrency(shortfall)}
                  </button>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button type="submit" size="sm" isLoading={isMutating} loadingLabel="Adding…">
                  Add funds
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsTopUpOpen(false)
                    setLocalError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setIsTopUpOpen(true)}
            >
              Add funds
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export default WalletPanel
