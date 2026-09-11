import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'
import ProductCard from '../components/ProductCard'
import { SkeletonGrid } from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'

const categories = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Home', slug: 'home' },
  { id: 3, name: 'Lifestyle', slug: 'lifestyle' },
]

const socialImages = [
  { id: 1, alt: 'Product lifestyle shot' },
  { id: 2, alt: 'Interior styling' },
  { id: 3, alt: 'Product detail' },
  { id: 4, alt: 'Everyday use' },
  { id: 5, alt: 'Quality materials' },
  { id: 6, alt: 'Minimal setup' },
]

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts()
      // Take up to 4 products as featured
      setFeaturedProducts((data || []).slice(0, 4))
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center bg-bg-primary">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-primary tracking-tight leading-[1.1] mb-6">
              Thoughtfully
              <br />
              selected.
            </h1>
            <p className="text-lg lg:text-xl text-secondary mb-8 max-w-md leading-relaxed">
              Products made for everyday life. Quality materials, considered design, honest pricing.
            </p>
            <Link to="/products">
              <Button size="lg">
                Shop now
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="hidden lg:block absolute right-0 top-0 w-1/2 h-full bg-bg-tertiary">
          <div className="w-full h-full flex items-center justify-center text-muted">
            <span className="text-sm">Hero image placeholder</span>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="py-16 lg:py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="group block"
              >
                <div className="aspect-[4/5] bg-bg-tertiary overflow-hidden mb-4">
                  <div className="w-full h-full flex items-center justify-center text-muted group-hover:scale-105 transition-transform duration-500 ease-out">
                    <span className="text-sm">{category.name}</span>
                  </div>
                </div>
                <h3 className="text-base font-medium text-primary group-hover:text-secondary transition-colors duration-200">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 lg:mb-14">
            <div>
              <h2 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight">
                Featured
              </h2>
            </div>
            <Link
              to="/products"
              className="text-sm font-medium text-secondary hover:text-primary transition-colors duration-200 underline underline-offset-4"
            >
              View all
            </Link>
          </div>

          {loading && (
            <SkeletonGrid count={4} columns={4} />
          )}

          {error && !loading && (
            <ErrorState message={error} onRetry={fetchProducts} />
          )}

          {!loading && !error && featuredProducts.length === 0 && (
            <p className="text-center text-secondary py-12">
              No products available yet.
            </p>
          )}

          {!loading && !error && featuredProducts.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial / Brand Story Section */}
      <section className="py-16 lg:py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image */}
            <div className="aspect-[4/5] bg-bg-tertiary">
              <div className="w-full h-full flex items-center justify-center text-muted">
                <span className="text-sm">Editorial image</span>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-lg">
              <h2 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-6">
                Quality you can feel
              </h2>
              <p className="text-secondary leading-relaxed mb-8">
                We believe in products that last. Every item in our collection is chosen for its
                craftsmanship, materials, and timeless design. No shortcuts, no compromises.
              </p>
              <Link to="/about">
                <Button variant="secondary">
                  Our story
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social / Community Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-14">
            <h2 className="text-2xl lg:text-3xl font-semibold text-primary tracking-tight">
              @aureum
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {socialImages.map((image) => (
              <div
                key={image.id}
                className="aspect-square bg-bg-tertiary overflow-hidden"
              >
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <span className="text-xs">{image.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 lg:py-24 bg-bg-secondary">
        <div className="max-w-xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-4">
            Join the list
          </h2>
          <p className="text-secondary mb-8">
            Get early access to new arrivals and exclusive offers.
          </p>
          <form
            className="flex gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-4 py-3 bg-white border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors duration-200"
              aria-label="Email address"
              required
            />
            <Button type="submit">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Home
