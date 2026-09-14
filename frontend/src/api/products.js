import { api } from './client'

/* ==========================================================================
   Product Service — /api/products
   --------------------------------------------------------------------------
   GET    /api/products                     → ProductResponseDTO[]
   GET    /api/products/{id}                → ProductResponseDTO
   GET    /api/products/search?keyword=     → ProductResponseDTO[]
   GET    /api/products/category/{category} → ProductResponseDTO[]
   POST   /api/products                     → ProductResponseDTO (201, ADMIN)
   PUT    /api/products/{id}                → ProductResponseDTO (ADMIN)
   DELETE /api/products/{id}                → 204 (ADMIN)

   ProductResponseDTO:
     { id, name, description, price, category, stockQuantity, imageUrl,
       averageRating, createdAt }

   Reads require a valid JWT — the service's SecurityConfig authenticates every
   request and only opens actuator + the mutations to roles. There is no
   server-side search-by-price/sort/pagination, so the catalog screen refines
   the fetched collection client-side.
   ========================================================================== */

export function listProducts(options = {}) {
  return api.get('/api/products', options)
}

export function getProduct(id, options = {}) {
  return api.get(`/api/products/${encodeURIComponent(id)}`, {
    messageOverrides: { 404: 'That product is no longer available.' },
    ...options,
  })
}

export function searchProducts(keyword, options = {}) {
  return api.get('/api/products/search', { params: { keyword }, ...options })
}

export function listProductsByCategory(category, options = {}) {
  return api.get(`/api/products/category/${encodeURIComponent(category)}`, options)
}

/* ---- Admin mutations ---------------------------------------------------- */

/** Body must satisfy ProductRequestDTO: name (≤255), price (> 0), plus optionals. */
export function createProduct(payload, options = {}) {
  return api.post('/api/products', { data: payload, ...options })
}

export function updateProduct(id, payload, options = {}) {
  return api.put(`/api/products/${encodeURIComponent(id)}`, { data: payload, ...options })
}

export function deleteProduct(id, options = {}) {
  return api.delete(`/api/products/${encodeURIComponent(id)}`, {
    ...options,
    messageOverrides: { 404: 'That product was already removed.' },
  })
}
