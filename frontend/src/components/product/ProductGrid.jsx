import ProductCard from './ProductCard'
import Skeleton from '../ui/Skeleton'

/* The grid adapts by content density, never by shrinking a desktop layout:
   2 columns on phones, 3 from md, 4 from xl. */
const COLUMNS = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4'

export function ProductGrid({ products = [], priorityCount = 4 }) {
  return (
    <div className={COLUMNS}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="aspect-4/5 w-full" rounded="rounded-lg" />
      <Skeleton className="mt-3 h-3 w-16" rounded="rounded-full" />
      <Skeleton className="mt-2 h-4 w-4/5" rounded="rounded-full" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-4 w-16" rounded="rounded-full" />
        <Skeleton className="h-3 w-12" rounded="rounded-full" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className={COLUMNS} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default ProductGrid
