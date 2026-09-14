import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CatalogGate from '../components/common/CatalogGate'
import Container from '../components/layout/Container'
import PageHeader from '../components/layout/PageHeader'
import { ActiveFilterChips, CatalogFilters } from '../components/product/CatalogFilters'
import ProductGrid, { ProductGridSkeleton } from '../components/product/ProductGrid'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import IconButton from '../components/ui/IconButton'
import Pagination from '../components/ui/Pagination'
import Select from '../components/ui/Select'
import { CloseIcon, SearchIcon, SlidersIcon, StoreIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProductIndex } from '../hooks/useProductIndex'
import { PAGE_SIZE, SORT_OPTIONS, buildFacets, paginate, refineProducts } from '../lib/catalog'
import { pluralize } from '../lib/format'

function Products() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const resultsRef = useRef(null)

  /* Filter state lives in the URL: it is shareable, survives refresh, and makes
     browser back/forward work the way people expect on a listing page. */
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'featured'
  const min = searchParams.get('min') || ''
  const max = searchParams.get('max') || ''
  const rating = searchParams.get('rating') || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

  const [searchDraft, setSearchDraft] = useState(query)

  useEffect(() => {
    setSearchDraft(query)
  }, [query])

  const updateParams = useCallback(
    (patch, { replace = false } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, rawValue] of Object.entries(patch)) {
            const value = rawValue === null || rawValue === undefined ? '' : String(rawValue)
            if (value === '') next.delete(key)
            else next.set(key, value)
          }
          // Any change other than an explicit page jump restarts paging.
          if (!('page' in patch)) next.delete('page')
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  const handleSearchChange = (event) => {
    const value = event.target.value
    setSearchDraft(value)
    updateParams({ q: value }, { replace: true })
  }

  const handleFilterChange = useCallback(
    (patch) => updateParams(patch),
    [updateParams],
  )

  const handleReset = useCallback(() => {
    updateParams({ q: '', category: '', min: '', max: '', rating: '', sort: 'featured' })
    setSearchDraft('')
  }, [updateParams])

  const handlePageChange = useCallback(
    (nextPage) => {
      updateParams({ page: nextPage })
      // Bring the first row back into view instead of jumping to the document top.
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [updateParams],
  )

  const { products, isLoading, isError, error, refetch, activeQuery } = useCatalog({
    query,
    category,
    enabled: isAuthenticated,
  })

  // The category rail must list every category, not just the ones in the
  // current result set, so it comes from the whole catalog.
  const { products: catalogIndex } = useProductIndex({ enabled: isAuthenticated })

  const facets = useMemo(
    () => buildFacets(catalogIndex.length > 0 ? catalogIndex : products),
    [catalogIndex, products],
  )

  const refined = useMemo(
    () => refineProducts(products, { category, minPrice: min, maxPrice: max, minRating: rating, sort }),
    [products, category, min, max, rating, sort],
  )

  const { items, pageCount } = useMemo(() => paginate(refined, page, PAGE_SIZE), [refined, page])

  const hasRefinements = Boolean(min || max || rating)
  const hasAnyFilter = Boolean(query || category || hasRefinements)

  useDocumentTitle(
    category ? `${category} — Shop` : query ? `Search: ${query}` : 'Shop all products',
  )

  if (!isAuthenticated) {
    return (
      <Container className="py-10 sm:py-14">
        <PageHeader eyebrow="Catalog" title="Shop all products" className="mb-8" />
        <CatalogGate />
      </Container>
    )
  }

  const filterPanel = (
    <CatalogFilters
      facets={facets}
      value={{ category, min, max, rating }}
      onChange={handleFilterChange}
      onReset={handleReset}
    />
  )

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Catalog"
        title={category || 'All products'}
        description={
          isLoading
            ? 'Loading the current catalog…'
            : `${pluralize(refined.length, 'product')}${activeQuery ? ` matching “${activeQuery}”` : ''}`
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <label htmlFor="catalog-search" className="sr-only">
            Search products
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchDraft}
            onChange={handleSearchChange}
            placeholder="Search by name or description"
            className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
          />
          {searchDraft && (
            <IconButton
              label="Clear search"
              size="sm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
              onClick={() => {
                setSearchDraft('')
                updateParams({ q: '' }, { replace: true })
              }}
            >
              <CloseIcon className="size-3.5" />
            </IconButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            className="lg:hidden"
            onClick={() => setIsFilterDialogOpen(true)}
          >
            <SlidersIcon className="size-4" />
            Filters
            {hasAnyFilter && (
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                {[category, min || max, rating].filter(Boolean).length}
              </span>
            )}
          </Button>

          <Select
            aria-label="Sort products"
            value={sort}
            containerClassName="w-full sm:w-56"
            onChange={(event) => updateParams({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <ActiveFilterChips
          value={{ category, min, max, rating }}
          onChange={handleFilterChange}
          onReset={handleReset}
          resultLabel={
            isLoading
              ? 'Loading…'
              : `${pluralize(refined.length, 'product')} · showing ${items.length}`
          }
        />
      </div>

      <div ref={resultsRef} className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block" aria-label="Product filters">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div>
          {isLoading && <ProductGridSkeleton count={PAGE_SIZE} />}

          {isError && !isLoading && <ErrorState error={error} onRetry={refetch} />}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              icon={StoreIcon}
              title={hasAnyFilter ? 'No products match these filters' : 'No products published yet'}
              description={
                hasAnyFilter
                  ? 'Try a broader search, a different category, or clear the filters to see the whole catalog.'
                  : 'The catalog is empty. Administrators can publish the first product from the admin console.'
              }
              actions={
                hasAnyFilter ? (
                  <Button variant="secondary" onClick={handleReset}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          )}

          {!isLoading && !isError && items.length > 0 && (
            <>
              <ProductGrid products={items} />
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={handlePageChange}
                className="mt-10"
                label="Product pagination"
              />
            </>
          )}
        </div>
      </div>

      <Dialog
        open={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        title="Filters"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={handleReset} disabled={!hasAnyFilter}>
              Clear all
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>
              Show {pluralize(refined.length, 'product')}
            </Button>
          </>
        }
      >
        {filterPanel}
      </Dialog>
    </Container>
  )
}

export default Products
