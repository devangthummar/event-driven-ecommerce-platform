import { useEffect, useState } from 'react'
import { resolveProductImageUrl } from '../../lib/productImages'

/**
 * ProductImage
 * --------------------------------------------------------------------------
 * Renders high-quality product imagery with skeleton loading states, smooth
 * transitions, aspect ratio preservation (no CLS), and graceful monogram fallback.
 */
function ProductImage({
  product,
  className = '',
  aspect = 'aspect-4/5',
  priority = false,
  sizes = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw',
}) {
  const [hasFailed, setHasFailed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const resolvedUrl = resolveProductImageUrl(product)

  useEffect(() => {
    setHasFailed(false)
    setIsLoaded(false)
  }, [resolvedUrl, product?.id])

  const monogram = (product?.name || 'Aureum')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

  const showImage = !hasFailed

  return (
    <div className={`relative overflow-hidden bg-canvas-deep ${aspect} ${className}`}>
      {/* Loading Skeleton Shimmer */}
      {!isLoaded && !hasFailed && (
        <div className="absolute inset-0 z-10 animate-pulse bg-line-soft/40" />
      )}

      {showImage ? (
        <img
          src={resolvedUrl}
          alt={product?.name ? `${product.name}` : 'Product image'}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasFailed(true)}
          className={`size-full object-cover transition-all duration-[600ms] ease-out group-hover:scale-[1.035] ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-canvas-deep" aria-hidden="true">
          <span className="select-none text-2xl font-semibold tracking-[0.14em] text-ink-faint/70">
            {monogram}
          </span>
        </div>
      )}
    </div>
  )
}

export default ProductImage
