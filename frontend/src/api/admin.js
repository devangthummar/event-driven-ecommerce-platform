import { api } from './client'

/* ==========================================================================
   Administrative operations
   --------------------------------------------------------------------------
   Every backend service ships the same outbox recovery endpoint:

     POST /api/admin/outbox/retry-failed   (ADMIN, returns { message, retriedCount, status })

   Three different services expose that exact path, so the gateway (Nginx /
   Vite proxy) maps a service-scoped alias onto each one:

     POST /api/admin/order/outbox/retry-failed     → order-service
     POST /api/admin/payment/outbox/retry-failed   → payment-service
     POST /api/admin/inventory/outbox/retry-failed → inventory-service

   This is the only place the UI reaches into saga/outbox plumbing, and it is
   deliberately admin-only both here and — authoritatively — on the server.
   ========================================================================== */

export const OUTBOX_SERVICES = [
  {
    id: 'order',
    name: 'Order Service',
    description: 'OrderCreated and OrderCancelled events queued by the order saga.',
  },
  {
    id: 'payment',
    name: 'Payment Service',
    description: 'PaymentRequest, PaymentSuccess and PaymentFailed events.',
  },
  {
    id: 'inventory',
    name: 'Inventory Service',
    description: 'StockReserved and StockReservationFailed events.',
  },
]

export function retryFailedOutbox(serviceId, options = {}) {
  return api.post(`/api/admin/${encodeURIComponent(serviceId)}/outbox/retry-failed`, {
    messageOverrides: {
      404: 'Outbox recovery is not reachable through the gateway for that service.',
    },
    ...options,
  })
}

export function getOutboxMessages(serviceId, options = {}) {
  return api.get(`/api/admin/${encodeURIComponent(serviceId)}/outbox`, {
    messageOverrides: {
      404: 'Outbox endpoint is not reachable for that service.',
    },
    ...options,
  })
}

export function getServiceHealth(serviceId, options = {}) {
  return api.get(`/api/health/${encodeURIComponent(serviceId)}`, {
    skipAuth: true,
    ...options,
  })
}
