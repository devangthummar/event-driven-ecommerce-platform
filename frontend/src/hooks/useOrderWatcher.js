import { useCallback, useEffect, useState } from 'react'
import { getOrdersForUser } from '../api/orders'
import { isTerminalStatus } from '../lib/orderStatus'

/* ==========================================================================
   useOrderWatcher
   --------------------------------------------------------------------------
   Creating an order is only the first half of the story: the Order Service
   returns PENDING immediately and the status is driven to PAID or CANCELLED by
   the saga (inventory → payment → order).

   There is no SSE/WebSocket channel in the contract and no per-order status
   endpoint, so the honest way to reflect the outcome is to poll the user's own
   order list (ownership-checked by the backend) and match on orderNumber.
   Polling stops on a terminal status, on timeout, or on unmount.
   ========================================================================== */

export function useOrderWatcher({
  userId,
  orderNumber,
  enabled = true,
  intervalMs = 2500,
  timeoutMs = 30000,
}) {
  const [order, setOrder] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!enabled || !orderNumber || !userId) return undefined

    let cancelled = false
    let timer = null
    const startedAt = Date.now()
    let attempt = 0

    setIsPolling(true)
    setIsTimedOut(false)
    setError(null)

    const tick = async () => {
      attempt += 1
      try {
        const orders = await getOrdersForUser(userId)
        if (cancelled) return

        const match = (Array.isArray(orders) ? orders : []).find(
          (candidate) => candidate.orderNumber === orderNumber,
        )

        if (match) {
          setOrder(match)
          if (isTerminalStatus(match.status)) {
            setAttempts(attempt)
            setIsPolling(false)
            return
          }
        }
        setAttempts(attempt)
      } catch (caught) {
        if (cancelled) return
        setError(caught)
      }

      if (cancelled) return

      if (Date.now() - startedAt >= timeoutMs) {
        setIsPolling(false)
        setIsTimedOut(true)
        return
      }

      timer = setTimeout(tick, intervalMs)
    }

    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, orderNumber, userId, intervalMs, timeoutMs, retryToken])

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1)
  }, [])

  return { order, isPolling, isTimedOut, attempts, error, retry }
}
