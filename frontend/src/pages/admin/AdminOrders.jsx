import { useCallback, useState } from 'react'
import { getOrder, updateOrderStatus } from '../../api/orders'
import OrderItemsList from '../../components/order/OrderItemsList'
import OrderTimeline from '../../components/order/OrderTimeline'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { GridIcon } from '../../components/ui/Icons'
import { useToast } from '../../contexts/useToast'
import { useProductIndex } from '../../hooks/useProductIndex'
import { availableTransitions, orderStatusMeta } from '../../lib/orderStatus'
import { formatCurrency, formatDateTime } from '../../lib/format'

/**
 * AdminOrders
 * --------------------------------------------------------------------------
 * The order service has no "list all orders" endpoint — only by-id, by-user
 * (ownership enforced) and a status transition. So this screen is an order
 * lookup keyed by the id a customer would quote, and it offers exactly the
 * transitions the backend state machine allows.
 */
function AdminOrders() {
  const toast = useToast()
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [nextStatus, setNextStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { byId } = useProductIndex({ enabled: Boolean(order) })

  const lookup = useCallback(
    async (event) => {
      event?.preventDefault()
      const id = orderId.trim()
      if (!id) return

      setStatus('loading')
      setError(null)
      setOrder(null)

      try {
        const found = await getOrder(id)
        setOrder(found)
        setStatus('success')
        setNextStatus(availableTransitions(found.status)[0] || '')
      } catch (caught) {
        setError(caught)
        setStatus('error')
      }
    },
    [orderId],
  )

  const applyTransition = async () => {
    if (!order || !nextStatus || isSaving) return
    setIsSaving(true)
    try {
      const updated = await updateOrderStatus(order.id, nextStatus)
      setOrder(updated)
      setNextStatus(availableTransitions(updated.status)[0] || '')
      toast.success(
        'Order status updated',
        `${updated.orderNumber} is now ${orderStatusMeta(updated.status).label.toLowerCase()}.`,
      )
    } catch (caught) {
      toast.error('The status change was rejected', caught.message)
    } finally {
      setIsSaving(false)
    }
  }

  const transitions = order ? availableTransitions(order.status) : []

  return (
    <div>
      <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Order ID"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="e.g. 12"
          value={orderId}
          containerClassName="sm:max-w-xs"
          onChange={(event) => setOrderId(event.target.value)}
          hint="Orders are addressed by their numeric id."
        />
        <Button type="submit" isLoading={status === 'loading'} loadingLabel="Looking up…">
          Look up order
        </Button>
      </form>

      <Alert tone="info" className="mt-5" title="Why there is no order list here">
        The order service exposes orders by id and by user, and enforces ownership on both. It does
        not publish a list-all endpoint, so this console intentionally provides lookup rather than
        inventing a feed the backend cannot serve.
      </Alert>

      {status === 'loading' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-64 w-full" rounded="rounded-xl" />
          <Skeleton className="h-72 w-full" rounded="rounded-xl" />
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6">
          {error?.isNotFound ? (
            <EmptyState
              icon={GridIcon}
              title="No order with that id"
              description="Check the id — order ids are the numeric primary keys, not the ORD- reference."
              actions={
                <Button variant="secondary" onClick={lookup}>
                  Try again
                </Button>
              }
            />
          ) : (
            <ErrorState error={error} onRetry={lookup} />
          )}
        </div>
      )}

      {status === 'success' && order && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-semibold text-ink">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Order id {order.id} · placed {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} showRaw />
              </div>

              <OrderItemsList className="mt-5" items={order.items || []} productsById={byId} />

              <div className="mt-5 flex items-baseline justify-between border-t border-line-soft pt-4">
                <span className="text-sm font-medium text-ink">Order total</span>
                <span className="text-base font-semibold text-ink tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-ink">Advance the order</h2>

              {transitions.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">
                  {orderStatusMeta(order.status).label} is a terminal state — the order service
                  rejects any further transition.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ink-muted">
                    Only transitions the backend state machine allows are listed.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Select
                      label="New status"
                      value={nextStatus}
                      containerClassName="sm:max-w-xs"
                      onChange={(event) => setNextStatus(event.target.value)}
                    >
                      {transitions.map((option) => (
                        <option key={option} value={option}>
                          {orderStatusMeta(option).label} ({option})
                        </option>
                      ))}
                    </Select>

                    <Button onClick={applyTransition} isLoading={isSaving} loadingLabel="Updating…">
                      Apply status
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>

          <OrderTimeline status={order.status} placedAt={order.createdAt} />
        </div>
      )}
    </div>
  )
}

export default AdminOrders
