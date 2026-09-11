import { useState, useEffect, useCallback } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'
import { LoadingState } from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: '',
  stockQuantity: '',
  imageUrl: '',
}

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts()
      setProducts(data || [])
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showForm) closeForm()
        if (deletingId) setDeletingId(null)
      }
    }
    if (showForm || deletingId) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showForm, deletingId, closeForm])

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return num && !isNaN(num) ? num.toFixed(2) : '0.00'
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const openCreateForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setShowForm(true)
  }

  const openEditForm = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      category: product.category || '',
      stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : '',
      imageUrl: product.imageUrl || '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setFormErrors({})
    setSubmitting(true)

    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      category: form.category || undefined,
      stockQuantity: form.stockQuantity !== '' ? parseInt(form.stockQuantity, 10) : undefined,
      imageUrl: form.imageUrl || undefined,
    }

    try {
      if (editingId) {
        await updateProduct(editingId, payload)
      } else {
        await createProduct(payload)
      }
      closeForm()
      fetchProducts()
    } catch (err) {
      const apiError = normalizeError(err)
      if (apiError.fieldErrors) {
        setFormErrors(apiError.fieldErrors)
      } else {
        setFormErrors({ _form: apiError.message })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (productId) => {
    setDeletingId(null)
    try {
      await deleteProduct(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    }
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight">
              Products
            </h1>
            {!loading && !error && (
              <p className="mt-2 text-secondary">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
            )}
          </div>
          <Button size="sm" onClick={openCreateForm}>
            Add product
          </Button>
        </div>

        {/* Loading */}
        {loading && <LoadingState message="Loading products…" />}

        {/* Error */}
        {error && !loading && (
          <ErrorState message={error} onRetry={fetchProducts} />
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <EmptyState
            title="No products yet"
            description="Create your first product to get started."
            actionLabel="Add product"
            onAction={openCreateForm}
          />
        )}

        {/* Product Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
          >
            <div className="bg-white w-full max-w-lg mx-4 p-6 border border-border-light max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 id="form-modal-title" className="text-lg font-semibold text-primary">
                  {editingId ? 'Edit product' : 'New product'}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close modal"
                  className="text-secondary hover:text-primary transition-colors duration-200 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formErrors._form && (
                <div className="mb-4 p-3 bg-bg-secondary border border-border-light text-sm text-secondary text-center">
                  {formErrors._form}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-primary mb-1">
                    Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={255}
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded text-sm text-primary focus:outline-none transition-colors duration-200 ${
                      formErrors.name ? 'border-red-400' : 'border-border focus:border-primary'
                    }`}
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-primary transition-colors duration-200"
                  />
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-primary mb-1">
                    Price *
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.price}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-white border rounded text-sm text-primary focus:outline-none transition-colors duration-200 ${
                      formErrors.price ? 'border-red-400' : 'border-border focus:border-primary'
                    }`}
                  />
                  {formErrors.price && <p className="mt-1 text-xs text-red-500">{formErrors.price}</p>}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-primary mb-1">
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    maxLength={100}
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-primary transition-colors duration-200"
                  />
                </div>

                {/* Stock Quantity */}
                <div>
                  <label htmlFor="stockQuantity" className="block text-sm font-medium text-primary mb-1">
                    Stock quantity
                  </label>
                  <input
                    id="stockQuantity"
                    name="stockQuantity"
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-primary transition-colors duration-200"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-primary mb-1">
                    Image URL
                  </label>
                  <input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={form.imageUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-primary transition-colors duration-200"
                    placeholder="https://…"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="bg-white w-full max-w-sm mx-4 p-6 border border-border-light text-center">
              <h2 id="delete-modal-title" className="text-lg font-semibold text-primary mb-3">
                Delete product?
              </h2>
              <p className="text-sm text-secondary mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  size="sm"
                  onClick={() => handleDelete(deletingId)}
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        {!loading && !error && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left py-4 text-sm font-medium text-secondary">
                    Product
                  </th>
                  <th className="text-left py-4 text-sm font-medium text-secondary">
                    Price
                  </th>
                  <th className="text-left py-4 text-sm font-medium text-secondary">
                    Stock
                  </th>
                  <th className="text-right py-4 text-sm font-medium text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border-light last:border-b-0"
                  >
                    <td className="py-4">
                      <span className="text-sm font-medium text-primary">
                        {product.name}
                      </span>
                      {product.category && (
                        <span className="ml-2 text-xs text-muted">
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-secondary">
                        ${formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-secondary">
                        {product.stockQuantity ?? '—'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditForm(product)}
                          className="text-sm text-secondary hover:text-primary transition-colors duration-200 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(product.id)}
                          className="text-sm text-secondary hover:text-red-500 transition-colors duration-200 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminProducts
