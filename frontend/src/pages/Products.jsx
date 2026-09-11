import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, getProductsByCategory } from '../services/productService'
import { normalizeError } from '../services/api/apiClient'
import ProductCard from '../components/ProductCard'
import { SkeletonGrid } from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'

function Products() {
  const [searchParams] = useSearchParams()
  const category = searchParams.get('category')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = category
        ? await getProductsByCategory(category)
        : await getProducts()
      setProducts(data || [])
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 lg:mb-14">
          <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight">
            {category
              ? category.charAt(0).toUpperCase() + category.slice(1)
              : 'All Products'}
          </h1>
          {!loading && !error && (
            <p className="mt-3 text-secondary">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && <SkeletonGrid count={8} columns={4} />}

        {/* Error State */}
        {error && !loading && (
          <ErrorState message={error} onRetry={fetchProducts} />
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <EmptyState
            title="No products found"
            description="We couldn't find any products in this category."
          />
        )}

        {/* Product Grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default Products
