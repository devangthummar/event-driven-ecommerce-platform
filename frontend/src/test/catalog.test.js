import { describe, test, expect } from 'vitest'
import { buildFacets, categorySummary, newestProducts, paginate, refineProducts } from '../lib/catalog'

const PRODUCTS = [
  { id: 1, name: 'Zephyr Lamp', price: 120, category: 'Home', averageRating: 4.5, createdAt: '2026-01-01T10:00:00' },
  { id: 2, name: 'Atlas Headphones', price: 89.5, category: 'Electronics', averageRating: 4.9, createdAt: '2026-03-01T10:00:00' },
  { id: 3, name: 'Kite Mug', price: 24, category: 'Home', averageRating: 0, createdAt: '2026-02-01T10:00:00' },
  { id: 4, name: 'Bolt Cable', price: 19, category: 'Electronics', averageRating: 3.2, createdAt: '2026-04-01T10:00:00' },
]

describe('refineProducts', () => {
  test('filters by category case-insensitively', () => {
    const result = refineProducts(PRODUCTS, { category: 'home' })
    expect(result.map((product) => product.id)).toEqual([1, 3])
  })

  test('filters by price range and rating', () => {
    expect(refineProducts(PRODUCTS, { minPrice: 25, maxPrice: 100 }).map((p) => p.id)).toEqual([2])
    expect(refineProducts(PRODUCTS, { minRating: 4 }).map((p) => p.id)).toEqual([1, 2])
  })

  test('sorts without mutating the source array', () => {
    const source = [...PRODUCTS]
    const byPrice = refineProducts(PRODUCTS, { sort: 'price-asc' })
    expect(byPrice.map((product) => product.id)).toEqual([4, 3, 2, 1])

    const newest = refineProducts(PRODUCTS, { sort: 'newest' })
    expect(newest[0].id).toBe(4)

    expect(PRODUCTS).toEqual(source)
  })

  test('leaves backend ordering untouched for the default sort', () => {
    expect(refineProducts(PRODUCTS, {}).map((product) => product.id)).toEqual([1, 2, 3, 4])
  })
})

describe('buildFacets', () => {
  test('reports category counts, price bounds and rating availability', () => {
    const facets = buildFacets(PRODUCTS)

    expect(facets.categories).toEqual([
      { value: 'Electronics', count: 2 },
      { value: 'Home', count: 2 },
    ])
    expect(facets.priceRange).toEqual({ min: 19, max: 120 })
    expect(facets.hasRatings).toBe(true)
    expect(facets.total).toBe(4)
  })

  test('handles an empty catalog', () => {
    const facets = buildFacets([])
    expect(facets.categories).toEqual([])
    expect(facets.hasRatings).toBe(false)
    expect(facets.total).toBe(0)
  })
})

describe('paginate', () => {
  test('slices pages and clamps an out-of-range page', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1)

    const first = paginate(items, 1, 10)
    expect(first.items).toHaveLength(10)
    expect(first.pageCount).toBe(3)
    expect(first.start).toBe(1)
    expect(first.end).toBe(10)

    const last = paginate(items, 3, 10)
    expect(last.items).toHaveLength(5)
    expect(last.end).toBe(25)

    const clamped = paginate(items, 99, 10)
    expect(clamped.page).toBe(3)
  })

  test('never reports zero pages', () => {
    expect(paginate([], 1, 10).pageCount).toBe(1)
  })
})

describe('home helpers', () => {
  test('orders categories by how well stocked they are', () => {
    const categories = categorySummary([...PRODUCTS, { ...PRODUCTS[0], id: 9 }])
    expect(categories[0]).toMatchObject({ name: 'Home', count: 3 })
  })

  test('returns the newest products first', () => {
    expect(newestProducts(PRODUCTS, 2).map((product) => product.id)).toEqual([4, 2])
  })
})
