import { useMemo } from 'react'
import { useApiResource } from './useApiResource'
import { listProducts } from '../api/products'

/**
 * Loads the catalog once and exposes an id → product map.
 *
 * Orders only carry `productId` (the order service stores a price snapshot, not
 * the product), so order screens resolve names and imagery from here instead of
 * firing one request per line item.
 */
export function useProductIndex({ enabled = true } = {}) {
  const { data, status, error, refetch } = useApiResource(
    ({ signal }) => listProducts({ signal }),
    [],
    { enabled, initialData: [] },
  )

  const products = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const byId = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  )

  return { products, byId, status, error, refetch }
}
