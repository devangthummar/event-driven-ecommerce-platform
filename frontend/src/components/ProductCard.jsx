import { Link } from 'react-router-dom'

/**
 * ProductCard — displays a product in a grid layout.
 *
 * Backend ProductResponseDTO shape:
 *   { id, name, description, price, category, stockQuantity, imageUrl, averageRating, createdAt }
 *
 * The component maps:
 *   imageUrl → image display
 *   price    → formatted price (handles both string and number from BigDecimal JSON)
 *   category → optional badge display
 */
function ProductCard({ product }) {
  const { id, name, price, imageUrl, category, badge } = product

  // Normalize price — BigDecimal may be serialized as string
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price

  return (
    <Link
      to={`/products/${id}`}
      className="group block"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] bg-bg-tertiary overflow-hidden mb-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badge — prefer explicit badge, fall back to category */}
        {(badge || category) && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-white text-xs font-medium uppercase tracking-wider">
            {badge || category}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-primary group-hover:text-secondary transition-colors duration-200 line-clamp-2">
          {name}
        </h3>
        <p className="text-sm text-secondary">
          ${numericPrice && !isNaN(numericPrice) ? numericPrice.toFixed(2) : '—'}
        </p>
      </div>
    </Link>
  )
}

export default ProductCard
