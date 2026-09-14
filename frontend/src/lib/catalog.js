import { toNumber } from './format'

/* ==========================================================================
   Catalog refinement
   --------------------------------------------------------------------------
   The Product Service exposes no sort, price-range or pagination parameters —
   only `GET /api/products`, `/search?keyword=` and `/category/{category}`.
   Keyword search and the category route are server-side (they are real
   endpoints); price, rating, sorting and paging are pure presentation over the
   returned collection and are labelled as such in the UI.

   Everything here is a pure function so it is cheap to reason about and to
   test.
   ========================================================================== */

export const PAGE_SIZE = 12

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'name-asc', label: 'Name: A–Z' },
]

const priceOf = (product) => toNumber(product?.price)
const ratingOf = (product) => toNumber(product?.averageRating)
const createdOf = (product) => {
  const time = product?.createdAt ? new Date(product.createdAt).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

export function sortProducts(products, sort) {
  const list = [...products]

  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => priceOf(a) - priceOf(b))
    case 'price-desc':
      return list.sort((a, b) => priceOf(b) - priceOf(a))
    case 'rating-desc':
      return list.sort((a, b) => ratingOf(b) - ratingOf(a))
    case 'name-asc':
      return list.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))
    case 'newest':
      return list.sort((a, b) => createdOf(b) - createdOf(a))
    case 'featured':
    default:
      // Preserve the server's ordering — it is the only "curation" signal the
      // API provides.
      return list
  }
}

/** Facets are derived from the current server result set, so they never lie. */
export function buildFacets(products = []) {
  const counts = new Map()
  let minPrice = Number.POSITIVE_INFINITY
  let maxPrice = 0
  let ratedCount = 0

  for (const product of products) {
    const category = product?.category?.trim()
    if (category) counts.set(category, (counts.get(category) || 0) + 1)

    const price = priceOf(product)
    if (price > 0) {
      minPrice = Math.min(minPrice, price)
      maxPrice = Math.max(maxPrice, price)
    }
    if (ratingOf(product) > 0) ratedCount += 1
  }

  return {
    categories: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    priceRange: {
      min: Number.isFinite(minPrice) ? Math.floor(minPrice) : 0,
      max: Math.ceil(maxPrice),
    },
    hasRatings: ratedCount > 0,
    total: products.length,
  }
}

/**
 * Apply the client-side refinements. `minRating` is inclusive and only ever
 * offered when the data actually carries ratings.
 */
export function refineProducts(products = [], { category, minPrice, maxPrice, minRating, sort } = {}) {
  let result = products

  if (category) {
    result = result.filter(
      (product) => String(product?.category ?? '').toLowerCase() === String(category).toLowerCase(),
    )
  }

  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    const floor = toNumber(minPrice)
    result = result.filter((product) => priceOf(product) >= floor)
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    const ceiling = toNumber(maxPrice)
    result = result.filter((product) => priceOf(product) <= ceiling)
  }

  if (minRating !== undefined && minRating !== null && minRating !== '') {
    const floor = toNumber(minRating)
    result = result.filter((product) => ratingOf(product) >= floor)
  }

  return sortProducts(result, sort)
}

export function paginate(items = [], page = 1, pageSize = PAGE_SIZE) {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, total),
  }
}

/** Categories for the home discovery band, ordered by how well stocked they are. */
export function categorySummary(products = [], limit = 6) {
  const summary = new Map()

  for (const product of products) {
    const category = product?.category?.trim()
    if (!category) continue
    const entry = summary.get(category) || { name: category, count: 0, imageUrl: null }
    entry.count += 1
    if (!entry.imageUrl && product?.imageUrl) entry.imageUrl = product.imageUrl
    summary.set(category, entry)
  }

  return [...summary.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

/** The newest N products, used by the home "new arrivals" band. */
export function newestProducts(products = [], limit = 4) {
  return sortProducts(products, 'newest').slice(0, limit)
}
