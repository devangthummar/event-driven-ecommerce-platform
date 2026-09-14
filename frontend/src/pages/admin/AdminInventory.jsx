import { useCallback, useEffect, useRef, useState } from 'react'
import { getInventory, createInventory, addStock } from '../../api/inventory'
import { listProducts } from '../../api/products'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../features/admin/SearchInput'
import Skeleton from '../../components/ui/Skeleton'
import { PackageIcon, PlusIcon, RefreshIcon } from '../../components/ui/Icons'
import { useApiResource } from '../../hooks/useApiResource'
import { useToast } from '../../contexts/useToast'
import { PAGE_SIZE, refineProducts } from '../../lib/catalog'
import { pluralize, toNumber } from '../../lib/format'

/**
 * AdminInventory
 * --------------------------------------------------------------------------
 * The inventory service exposes a per-product read (GET /api/inventory/{id})
 * and no list endpoint, so levels are loaded for the products on screen with a
 * bounded fan-out. A 404 is reported as "not tracked", which is a real state —
 * inventory is created explicitly, and the saga relies on it existing.
 */
function AdminInventory() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [levels, setLevels] = useState({})
  const [isLoadingLevels, setIsLoadingLevels] = useState(false)
  const [target, setTarget] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const requestIdRef = useRef(0)

  const { data, status, error, refetch } = useApiResource(
    ({ signal }) => listProducts({ signal }),
    [],
    { initialData: [] },
  )

  const products = Array.isArray(data) ? data : []

  const visible = refineProducts(
    search.trim()
      ? products.filter((product) =>
          [product.name, product.category]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(search.trim().toLowerCase()),
            ),
        )
      : products,
    { sort: 'name-asc' },
  )

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search])

  const loadLevels = useCallback(async (list) => {
    if (list.length === 0) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setIsLoadingLevels(true)
    setLevels((previous) => {
      const next = { ...previous }
      for (const product of list) next[product.id] = { status: 'loading' }
      return next
    })

    const results = await Promise.allSettled(list.map((product) => getInventory(product.id)))
    if (requestIdRef.current !== requestId) return

    setLevels((previous) => {
      const next = { ...previous }
      list.forEach((product, index) => {
        const result = results[index]
        if (result.status === 'fulfilled') {
          next[product.id] = { status: 'ready', data: result.value }
        } else if (result.reason?.isNotFound) {
          next[product.id] = { status: 'missing' }
        } else {
          next[product.id] = { status: 'error', error: result.reason }
        }
      })
      return next
    })
    setIsLoadingLevels(false)
  }, [])

  const pagedIds = paged.map((product) => product.id).join(',')
  useEffect(() => {
    loadLevels(paged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagedIds, status])

  const openDialog = (product, mode) => {
    setTarget({ product, mode })
    setQuantity('')
    setFieldError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const parsed = Math.trunc(toNumber(quantity))
    if (parsed < 1) {
      setFieldError('Enter a quantity of at least 1.')
      return
    }

    setIsSaving(true)
    try {
      const saved =
        target.mode === 'create'
          ? await createInventory({ productId: target.product.id, quantity: parsed })
          : await addStock({ productId: target.product.id, quantity: parsed })

      setLevels((previous) => ({ ...previous, [target.product.id]: { status: 'ready', data: saved } }))
      toast.success(
        target.mode === 'create' ? 'Inventory created' : 'Stock added',
        `${target.product.name} now has ${saved.availableQuantity} available.`,
      )
      setTarget(null)
    } catch (caught) {
      setFieldError(caught.message)
    } finally {
      setIsSaving(false)
    }
  }

  const renderLevel = (product) => {
    const level = levels[product.id]

    if (!level || level.status === 'loading') {
      return <Skeleton className="h-4 w-24" rounded="rounded-full" />
    }
    if (level.status === 'missing') {
      return (
        <Badge tone="warning" size="sm">
          Not tracked
        </Badge>
      )
    }
    if (level.status === 'error') {
      return (
        <Badge tone="danger" size="sm">
          Unavailable
        </Badge>
      )
    }

    return (
      <span className="text-sm text-ink tabular-nums">
        {level.data.availableQuantity} available
        <span className="ml-2 text-xs text-ink-muted">
          ({level.data.reservedQuantity} reserved / {level.data.totalQuantity} total)
        </span>
      </span>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          id="admin-inventory-search"
          value={search}
          onChange={setSearch}
          placeholder="Filter by product or category"
          label="Filter products"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => loadLevels(paged)}
            isLoading={isLoadingLevels}
            loadingLabel="Refreshing…"
          >
            <RefreshIcon className="size-4" />
            Refresh levels
          </Button>
        </div>
      </div>

      <Alert tone="info" className="mt-5" title="How stock is tracked">
        The inventory service holds availability, reserved and total quantities per product. Stock is
        reserved automatically by the order saga; these controls exist for restocking and for
        creating the initial record a product needs before it can be ordered.
      </Alert>

      {status === 'error' && (
        <div className="mt-6">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      )}

      {status === 'success' && products.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={PackageIcon}
            title="No products to track"
            description="Inventory rows belong to products. Create a product first, then add its stock here."
          />
        </div>
      )}

      {status === 'success' && products.length > 0 && (
        <>
          <p className="mt-5 text-sm text-ink-muted">{pluralize(visible.length, 'product')}</p>

          {visible.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title="No products matched"
                description="Try a different search term."
                actions={
                  <Button variant="secondary" onClick={() => setSearch('')}>
                    Clear filter
                  </Button>
                }
              />
            </div>
          )}

          {visible.length > 0 && (
            <>
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line md:block">
                <table className="w-full min-w-[44rem] border-collapse text-left">
                  <caption className="sr-only">Inventory levels per product</caption>
                  <thead>
                    <tr className="border-b border-line bg-canvas">
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Inventory level
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Stock actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((product) => {
                      const level = levels[product.id]
                      return (
                        <tr key={product.id} className="border-b border-line-soft last:border-b-0">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-ink">{product.name}</p>
                            <p className="text-xs text-ink-muted">
                              {product.category || 'Uncategorised'}
                              <span className="ml-2 font-mono text-[11px] text-ink-faint">
                                AUR-{String(product.id).padStart(4, '0')}
                              </span>
                            </p>
                          </td>
                          <td className="px-4 py-3">{renderLevel(product)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {level?.status === 'missing' ? (
                                <Button size="sm" onClick={() => openDialog(product, 'create')}>
                                  <PlusIcon className="size-4" />
                                  Create inventory
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openDialog(product, 'add')}
                                  disabled={!level || level.status !== 'ready'}
                                >
                                  <PlusIcon className="size-4" />
                                  Add stock
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="mt-4 space-y-3 md:hidden">
                {paged.map((product) => {
                  const level = levels[product.id]
                  return (
                    <li key={product.id} className="rounded-xl border border-line p-4">
                      <p className="text-sm font-medium text-ink">{product.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {product.category || 'Uncategorised'}
                      </p>
                      <div className="mt-3">{renderLevel(product)}</div>
                      <div className="mt-4">
                        {level?.status === 'missing' ? (
                          <Button size="sm" onClick={() => openDialog(product, 'create')}>
                            Create inventory
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openDialog(product, 'add')}
                            disabled={!level || level.status !== 'ready'}
                          >
                            Add stock
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-6" />
            </>
          )}
        </>
      )}

      <Dialog
        open={target !== null}
        onClose={() => setTarget(null)}
        size="sm"
        title={target?.mode === 'create' ? 'Create inventory' : 'Add stock'}
        description={target?.product?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="inventory-form" isLoading={isSaving} loadingLabel="Saving…">
              {target?.mode === 'create' ? 'Create' : 'Add stock'}
            </Button>
          </>
        }
      >
        <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Quantity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
            value={quantity}
            error={fieldError}
            onChange={(event) => {
              setQuantity(event.target.value)
              setFieldError(null)
            }}
            hint="Units added to available stock."
            data-autofocus
          />

          <Alert tone="neutral">
            Mutations require the ADMIN role and are rejected for other accounts by the inventory
            service.
          </Alert>
        </form>
      </Dialog>
    </div>
  )
}

export default AdminInventory
