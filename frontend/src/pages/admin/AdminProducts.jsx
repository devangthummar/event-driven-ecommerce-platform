import { useEffect, useMemo, useState } from 'react'
import { deleteProduct, listProducts } from '../../api/products'
import ProductFormDialog from '../../features/admin/ProductFormDialog'
import ProductImage from '../../components/product/ProductImage'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Pagination from '../../components/ui/Pagination'
import Rating from '../../components/ui/Rating'
import Select from '../../components/ui/Select'
import Skeleton from '../../components/ui/Skeleton'
import { EditIcon, PlusIcon, SearchIcon, StoreIcon, TrashIcon } from '../../components/ui/Icons'
import { useToast } from '../../contexts/useToast'
import { useApiResource } from '../../hooks/useApiResource'
import { PAGE_SIZE, refineProducts } from '../../lib/catalog'
import { formatCurrency, pluralize } from '../../lib/format'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name-asc', label: 'Name: A–Z' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
]

function AdminProducts() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, status, error, refetch } = useApiResource(
    ({ signal }) => listProducts({ signal }),
    [],
    { initialData: [] },
  )

  const products = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matched = term
      ? products.filter((product) =>
          [product.name, product.category, product.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      : products

    return refineProducts(matched, { sort })
  }, [products, search, sort])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, sort])

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await deleteProduct(deleting.id)
      toast.success('Product deleted', `${deleting.name} was removed from the catalog.`)
      setDeleting(null)
      refetch()
    } catch (deleteError) {
      toast.error('Could not delete the product', deleteError.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <label htmlFor="admin-product-search" className="sr-only">
            Search products
          </label>
          <input
            id="admin-product-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or category"
            className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Sort products"
            value={sort}
            containerClassName="w-full sm:w-52"
            onChange={(event) => setSort(event.target.value)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button onClick={() => setEditing('new')} className="shrink-0">
            <PlusIcon className="size-4" />
            New product
          </Button>
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-6">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      )}

      {status === 'success' && products.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={StoreIcon}
            title="No products yet"
            description="Create the first product and it will appear in the storefront catalog immediately."
            actions={<Button onClick={() => setEditing('new')}>Create a product</Button>}
          />
        </div>
      )}

      {status === 'success' && products.length > 0 && (
        <>
          <p className="mt-5 text-sm text-ink-muted">
            {pluralize(visible.length, 'product')}
            {search ? ` matching “${search}”` : ''}
          </p>

          {visible.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title="Nothing matched that search"
                description="Try a different name or clear the search box."
                actions={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>}
              />
            </div>
          )}

          {visible.length > 0 && (
            <>
              {/* Table from md up */}
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line md:block">
                <table className="w-full min-w-[46rem] border-collapse text-left">
                  <caption className="sr-only">Products in the catalog</caption>
                  <thead>
                    <tr className="border-b border-line bg-canvas">
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Price
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Stock
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Rating
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((product) => (
                          <tr key={product.id} className="border-b border-line-soft last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 shrink-0">
                                  <ProductImage
                                    product={product}
                                    className="rounded-md border border-line-soft"
                                    sizes="40px"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                                  <p className="truncate text-xs text-ink-muted">
                                    {product.category || 'Uncategorised'}
                                    <span className="ml-2 font-mono text-[11px] text-ink-faint">
                                      AUR-{String(product.id).padStart(4, '0')}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-ink tabular-nums">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-4 py-3 text-sm text-ink tabular-nums">
                              {product.stockQuantity ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Rating
                                value={product.averageRating}
                                fallback={<span className="text-xs text-ink-faint">—</span>}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditing(product)}
                                  aria-label={`Edit ${product.name}`}
                                >
                                  <EditIcon className="size-4" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-danger hover:bg-danger-soft"
                                  onClick={() => setDeleting(product)}
                                  aria-label={`Delete ${product.name}`}
                                >
                                  <TrashIcon className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on small screens — a table would need horizontal scroll */}
              <ul className="mt-4 space-y-3 md:hidden">
                {paged.map((product) => (
                  <li key={product.id} className="rounded-xl border border-line p-4">
                    <div className="flex gap-3">
                      <div className="w-14 shrink-0">
                        <ProductImage
                          product={product}
                          className="rounded-md border border-line-soft"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {product.category || 'Uncategorised'}
                        </p>
                        <p className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                          <span className="font-semibold text-ink tabular-nums">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="tabular-nums">
                            {product.stockQuantity ?? '—'} in catalog
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => setDeleting(product)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-6" />
            </>
          )}
        </>
      )}

      {status === 'loading' && products.length === 0 && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" rounded="rounded-xl" />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={editing !== null}
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={refetch}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Delete this product?"
        description="The product service removes it permanently and it disappears from the storefront."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Keep it
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} loadingLabel="Deleting…">
              Delete product
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0">
              <ProductImage product={deleting} className="rounded-md border border-line-soft" sizes="56px" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{deleting.name}</p>
              <p className="text-xs text-ink-muted tabular-nums">{formatCurrency(deleting.price)}</p>
            </div>
          </div>
        )}

        <Alert tone="warning" className="mt-4" title="Orders are not affected">
          Existing orders keep the price snapshot they were created with; only the catalog entry is
          removed.
        </Alert>
      </Dialog>
    </div>
  )
}

export default AdminProducts
