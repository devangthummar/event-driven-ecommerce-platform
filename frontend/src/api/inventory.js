import { api } from './client'

/* ==========================================================================
   Inventory Service — /api/inventory
   --------------------------------------------------------------------------
   GET  /api/inventory/{productId}  → InventoryResponse   (any authenticated user)
   POST /api/inventory              → InventoryResponse   (201, ADMIN)
   PUT  /api/inventory/add-stock    → InventoryResponse   (ADMIN)

   StockRequest:        { productId, quantity }
   InventoryResponse:   { productId, availableQuantity, reservedQuantity, totalQuantity }

   Reserve/release/confirm are ADMIN/internal endpoints driven by the saga's
   Kafka consumers, so the UI never calls them: the storefront only *reads*
   availability, and the reservation happens as a consequence of ordering.
   ========================================================================== */

export function getInventory(productId, options = {}) {
  return api.get(`/api/inventory/${encodeURIComponent(productId)}`, {
    ...options,
  })
}

export function createInventory({ productId, quantity }, options = {}) {
  return api.post('/api/inventory', {
    data: { productId, quantity },
    messageOverrides: {
      409: 'Inventory already exists for that product — add stock instead.',
    },
    ...options,
  })
}

export function addStock({ productId, quantity }, options = {}) {
  return api.put('/api/inventory/add-stock', {
    data: { productId, quantity },
    messageOverrides: {
      404: 'No inventory record exists for that product yet.',
    },
    ...options,
  })
}
