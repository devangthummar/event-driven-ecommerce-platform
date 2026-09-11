import { orderClient } from './api/apiClient'

/**
 * Order Service API
 *
 * Backend contract (Order Service at port 8082):
 *   POST /api/v1/orders              → OrderResponse (201)
 *   GET  /api/v1/orders/{id}         → OrderResponse
 *   GET  /api/v1/orders/user/{userId} → OrderResponse[]
 *   PUT  /api/v1/orders/{id}/status  → OrderResponse
 *   DELETE /api/v1/orders/{id}       → void (204)
 *
 * CreateOrderRequest:
 *   { userId: Long, idempotencyKey?: String, items: [{ productId: Long, quantity: Integer }] }
 *
 * OrderResponse:
 *   { orderNumber, status, totalAmount, items: [{ productId, quantity, price, totalPrice }], createdAt }
 *
 * All endpoints require JWT authentication.
 */

/**
 * Create a new order.
 * @param {{ userId: number, items: Array<{productId: number, quantity: number}>, idempotencyKey?: string }} data
 * @returns {Promise<Object>} OrderResponse
 */
export async function createOrder({ userId, items, idempotencyKey }) {
  const body = { userId, items }
  if (idempotencyKey) body.idempotencyKey = idempotencyKey
  const response = await orderClient.post('/api/v1/orders', body)
  return response.data
}

/**
 * Get orders for a specific user.
 * @param {number} userId
 * @returns {Promise<Array>} OrderResponse[]
 */
export async function getOrdersByUserId(userId) {
  const response = await orderClient.get(`/api/v1/orders/user/${userId}`)
  return response.data
}

/**
 * Get a single order by ID.
 * @param {number|string} orderId
 * @returns {Promise<Object>} OrderResponse
 */
export async function getOrderById(orderId) {
  const response = await orderClient.get(`/api/v1/orders/${orderId}`)
  return response.data
}
