import { api } from './client'

/* ==========================================================================
   Order Service — /api/v1/orders
   --------------------------------------------------------------------------
   POST   /api/v1/orders               → OrderResponse (201)
   GET    /api/v1/orders/{id}          → OrderResponse
   GET    /api/v1/orders/user/{userId} → OrderResponse[]
   PUT    /api/v1/orders/{id}/status   → OrderResponse   (ADMIN only)
   DELETE /api/v1/orders/{id}          → 204

   CreateOrderRequest: { userId, idempotencyKey?, items: [{ productId, quantity }] }
   OrderResponse: { id, orderNumber, status, totalAmount, items[], createdAt }
   OrderItemResponse: { productId, quantity, price, totalPrice }

   Ownership is enforced server-side from the JWT userId claim, so the frontend
   never needs to (and cannot) widen access — it only reflects it.
   ========================================================================== */

/**
 * Create an order.
 *
 * The order lands as PENDING and is then driven to PAID or CANCELLED
 * asynchronously by the saga (inventory → payment → order), so the caller must
 * poll for the terminal state. Pass a stable `idempotencyKey` so a retry of the
 * *same* attempt replays the original order instead of creating a second one.
 */
export function createOrder({ userId, items, idempotencyKey }, options = {}) {
  const body = { userId, items: items.map(({ productId, quantity }) => ({ productId, quantity })) }
  if (idempotencyKey) body.idempotencyKey = idempotencyKey

  return api.post('/api/v1/orders', {
    data: body,
    messageOverrides: {
      404: 'One of the products in your bag no longer exists.',
      503: 'The catalog is briefly unavailable, so we could not price your order. Please try again.',
    },
    ...options,
  })
}

export function getOrder(id, options = {}) {
  return api.get(`/api/v1/orders/${encodeURIComponent(id)}`, {
    messageOverrides: { 404: 'We could not find that order.' },
    ...options,
  })
}

export function getOrdersForUser(userId, options = {}) {
  return api.get(`/api/v1/orders/user/${encodeURIComponent(userId)}`, options)
}

/** Administrative transition. The backend validates the state machine. */
export function updateOrderStatus(id, status, options = {}) {
  return api.put(`/api/v1/orders/${encodeURIComponent(id)}/status`, {
    data: { status },
    messageOverrides: { 409: 'That status change is not allowed from the current state.' },
    ...options,
  })
}

export function deleteOrder(id, options = {}) {
  return api.delete(`/api/v1/orders/${encodeURIComponent(id)}`, options)
}
