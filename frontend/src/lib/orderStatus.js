/* ==========================================================================
   Order status — mirrors OrderStatus and OrderServiceImpl.validateTransition
   --------------------------------------------------------------------------
   The backend enum is exactly: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED,
   and this file reproduces its allowed transitions so the UI can only ever
   offer a move the server will accept. The server remains authoritative — a
   rejected transition surfaces as a 409 with the server's message.
   ========================================================================== */

/** Shopper-facing copy for each real backend state. */
export const ORDER_STATUS_META = {
  PENDING: {
    label: 'Processing',
    tone: 'warning',
    summary: 'Stock is being reserved and your wallet payment is being processed.',
  },
  PAID: {
    label: 'Paid',
    tone: 'success',
    summary: 'Payment received. Your order is confirmed.',
  },
  SHIPPED: {
    label: 'Shipped',
    tone: 'info',
    summary: 'Your order has left the warehouse.',
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'neutral',
    summary: 'Your order has been delivered.',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'danger',
    summary: 'The order was cancelled and any reserved stock was released.',
  },
}

/** The happy path, in order — used by the progress timeline. */
export const ORDER_PROGRESS_STEPS = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED']

/** Exactly the transitions OrderServiceImpl allows. */
export const ORDER_TRANSITIONS = {
  PENDING: ['PAID', 'CANCELLED', 'SHIPPED', 'DELIVERED'],
  PAID: ['SHIPPED', 'DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED']

export function orderStatusMeta(status) {
  return (
    ORDER_STATUS_META[status] || {
      label: status || 'Unknown',
      tone: 'neutral',
      summary: 'Status unavailable.',
    }
  )
}

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status)
}

export function canTransition(from, to) {
  if (!from || !to) return false
  if (from === to) return true
  return (ORDER_TRANSITIONS[from] || []).includes(to)
}

/** 0-based position on the happy path, or -1 for a cancelled order. */
export function progressIndex(status) {
  if (status === 'CANCELLED') return -1
  const index = ORDER_PROGRESS_STEPS.indexOf(status)
  return index === -1 ? 0 : index
}

/** Statuses an admin may choose from, given the current state. */
export function availableTransitions(status) {
  return ORDER_TRANSITIONS[status] || []
}
