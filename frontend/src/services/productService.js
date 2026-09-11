import { productClient } from './api/apiClient'

/**
 * Product Service API
 *
 * Backend contract (Product Service):
 *   GET    /api/products           → ProductResponseDTO[]
 *   GET    /api/products/{id}      → ProductResponseDTO
 *   GET    /api/products/search?keyword=... → ProductResponseDTO[]
 *   GET    /api/products/category/{category} → ProductResponseDTO[]
 *
 * ProductResponseDTO:
 *   { id, name, description, price, category, stockQuantity, imageUrl, averageRating, createdAt }
 */

/**
 * Fetch all products.
 * @returns {Promise<{data: Array}>} Array of ProductResponseDTO
 */
export async function getProducts() {
  const response = await productClient.get('/api/products')
  return response.data
}

/**
 * Fetch a single product by ID.
 * @param {number|string} id
 * @returns {Promise<Object>} ProductResponseDTO
 */
export async function getProductById(id) {
  const response = await productClient.get(`/api/products/${id}`)
  return response.data
}

/**
 * Search products by keyword.
 * @param {string} keyword
 * @returns {Promise<{data: Array}>} Array of ProductResponseDTO
 */
export async function searchProducts(keyword) {
  const response = await productClient.get('/api/products/search', {
    params: { keyword },
  })
  return response.data
}

/**
 * Fetch products by category.
 * @param {string} category
 * @returns {Promise<{data: Array}>} Array of ProductResponseDTO
 */
export async function getProductsByCategory(category) {
  const response = await productClient.get(`/api/products/category/${category}`)
  return response.data
}

// ============================================
// Admin CRUD (POST/PUT/DELETE require ADMIN role)
// ============================================

/**
 * Create a new product (ADMIN only).
 * @param {{ name: string, description?: string, price: number, category?: string, stockQuantity?: number, imageUrl?: string }} data
 * @returns {Promise<Object>} ProductResponseDTO
 */
export async function createProduct(data) {
  const response = await productClient.post('/api/products', data)
  return response.data
}

/**
 * Update an existing product (ADMIN only).
 * @param {number|string} id
 * @param {{ name: string, description?: string, price: number, category?: string, stockQuantity?: number, imageUrl?: string }} data
 * @returns {Promise<Object>} ProductResponseDTO
 */
export async function updateProduct(id, data) {
  const response = await productClient.put(`/api/products/${id}`, data)
  return response.data
}

/**
 * Delete a product (ADMIN only).
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteProduct(id) {
  await productClient.delete(`/api/products/${id}`)
}
