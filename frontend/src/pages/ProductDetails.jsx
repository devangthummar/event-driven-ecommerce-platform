import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProductById } from '../services/productService'
import { normalizeError } from '../services/api/apiClient'
import { useCart } from '../contexts/useCart'
import Button from '../components/ui/Button'
import { LoadingState } from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'

function ProductDetails() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setError(null)
    setProduct(null)
    try {
      const data = await getProductById(id)
      setProduct(data)
    } catch (err) {
      const apiError = normalizeError(err)
      if (apiError.status === 404) {
        setError('not_found')
      } else {
        setError(apiError.message)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // Loading state
  if (loading) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <LoadingState message="Loading product…" />
        </div>
      </main>
    )
  }

  // Product not found
  if (error === 'not_found') {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-semibold text-primary mb-4">Product not found</h1>
          <Link to="/products" className="text-secondary hover:text-primary underline">
            Back to products
          </Link>
        </div>
      </main>
    )
  }

  // Other errors
  if (error) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ErrorState message={error} onRetry={fetchProduct} />
        </div>
      </main>
    )
  }

  if (!product) return null

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-secondary">
            <li>
              <Link to="/" className="hover:text-primary transition-colors duration-200">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/products" className="hover:text-primary transition-colors duration-200">
                Products
              </Link>
            </li>
            <li>/</li>
            <li className="text-primary">{product.name}</li>
          </ol>
        </nav>

        {/* Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Product Image */}
          <div className="aspect-[3/4] bg-bg-tertiary">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <span className="text-sm">Product image</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:py-4">
            {product.category && (
              <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-medium uppercase tracking-wider mb-4">
                {product.category}
              </span>
            )}

            <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-4">
              {product.name}
            </h1>

            <p className="text-2xl text-primary mb-6">
              ${Number(product.price).toFixed(2)}
            </p>

            {product.description && (
              <p className="text-secondary leading-relaxed mb-8 max-w-md">
                {product.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="sm:w-auto"
                onClick={() => {
                  addItem(product)
                  setAdded(true)
                  setTimeout(() => setAdded(false), 2000)
                }}
              >
                {added ? 'Added' : 'Add to bag'}
              </Button>
              <Button variant="secondary" size="lg" className="sm:w-auto">
                Save
              </Button>
            </div>

            {/* Additional Info */}
            <div className="mt-10 pt-10 border-t border-border-light space-y-4">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>Free shipping on orders over $100</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>30-day returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProductDetails
