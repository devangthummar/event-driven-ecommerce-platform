import { useMemo } from 'react'
import { listProducts, listProductsByCategory, searchProducts } from '../api/products'
import { useApiResource } from './useApiResource'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * useCatalog — the result set behind the catalog screen.
 *
 * The Product Service exposes three real read endpoints and no query grammar,
 * so this picks the right one:
 *   keyword present → GET /api/products/search?keyword=
 *   category        → GET /api/products/category/{category}
 *   otherwise       → GET /api/products
 *
 * The keyword is debounced so typing does not fire a request per keystroke,
 * and the request itself is aborted when a newer one starts.
 */
export function useCatalog({ query = '', category = '', enabled = true } = {}) {
  const debouncedQuery = useDebouncedValue(String(query).trim(), 350)
  const isSearching = debouncedQuery.length > 0

  const resource = useApiResource(
    ({ signal }) => {
      if (isSearching) return searchProducts(debouncedQuery, { signal })
      if (category) return listProductsByCategory(category, { signal })
      return listProducts({ signal })
    },
    [debouncedQuery, category],
    { enabled, initialData: [] },
  )

  const products = useMemo(
    () => (Array.isArray(resource.data) ? resource.data : []),
    [resource.data],
  )

  return {
    products,
    /** True while the debounced term differs from what the user typed. */
    isSearching,
    activeQuery: debouncedQuery,
    status: resource.status,
    error: resource.error,
    isLoading: resource.isLoading,
    isError: resource.isError,
    refetch: resource.refetch,
  }
}
