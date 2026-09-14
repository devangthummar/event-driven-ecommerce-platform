import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrdersForUser } from '../api/orders'
import Container from '../components/layout/Container'
import PageHeader from '../components/layout/PageHeader'
import OrderCard from '../components/order/OrderCard'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Pagination from '../components/ui/Pagination'
import Skeleton from '../components/ui/Skeleton'
import { RefreshIcon, SearchIcon, StoreIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProductIndex } from '../hooks/useProductIndex'
import { paginate } from '../lib/catalog'
import { isTerminalStatus } from '../lib/orderStatus'
import { pluralize } from '../lib/format'

const PAGE_SIZE = 8

const GROUPS = [
  { id: 'all', label: 'All orders' },
  { id: 'active', label: 'In progress', match: ['PENDING'] },
  { id: 'complete', label: 'Completed', match: ['PAID', 'SHIPPED', 'DELIVERED'] },
  { id: 'cancelled', label: 'Cancelled', match: ['CANCELLED'] },
]

function OrderSkeleton() {
  return (
    <div className="rounded-xl border border-line p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" rounded="rounded-full" />
          <Skeleton className="h-3 w-48" rounded="rounded-full" />
        </div>
        <Skeleton className="h-6 w-24" rounded="rounded-full" />
      </div>
      <Skeleton className="mt-5 h-12 w-40" rounded="rounded-md" />
      <Skeleton className="mt-5 h-8 w-32" rounded="rounded-md" />
    </div>
  )
}

function Orders() {
  const { user } = useAuth()
  useDocumentTitle('Your orders')

  const [group, setGroup] = useState('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, status, error, refetch } = useApiResource(
    ({ signal }) => getOrdersForUser(user.id, { signal }),
    [user?.id],
    { enabled: Boolean(user?.id), initialData: [] },
  )

  const { byId } = useProductIndex({ enabled: Boolean(user?.id) })

  const orders = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [data])

  const hasPending = orders.some((order) => !isTerminalStatus(order.status))

  // Orders settle asynchronously; while any are still in flight, keep the list
  // fresh for a bounded window instead of polling forever.
  useEffect(() => {
    if (!hasPending) return undefined

    let ticks = 0
    const timer = setInterval(() => {
      ticks += 1
      refetch()
      if (ticks >= 10) clearInterval(timer)
    }, 6000)

    return () => clearInterval(timer)
  }, [hasPending, refetch])

  const filtered = useMemo(() => {
    const activeGroup = GROUPS.find((item) => item.id === group)
    const term = search.trim().toLowerCase()

    return orders.filter((order) => {
      if (activeGroup?.match && !activeGroup.match.includes(order.status)) return false
      if (term && !String(order.orderNumber || '').toLowerCase().includes(term)) return false
      return true
    })
  }, [orders, group, search])

  const { items, pageCount } = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [group, search])

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Account"
        title="Your orders"
        description="Every order you have placed, with the status the order service currently reports."
        actions={
          <Button variant="secondary" size="sm" onClick={refetch} isLoading={status === 'loading'}>
            <RefreshIcon className="size-4" />
            Refresh
          </Button>
        }
      />

      {status === 'loading' && (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <OrderSkeleton key={index} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      )}

      {status === 'success' && orders.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={StoreIcon}
            title="No orders yet"
            description="When you place an order it will appear here with its live status, so you can follow it through to delivery."
            actions={
              <Link to="/products" className={buttonClasses({ variant: 'primary' })}>
                Start shopping
              </Link>
            }
          />
        </div>
      )}

      {status === 'success' && orders.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter orders">
              {GROUPS.map((item) => {
                const count =
                  item.match === undefined
                    ? orders.length
                    : orders.filter((order) => item.match.includes(order.status)).length

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={group === item.id}
                    onClick={() => setGroup(item.id)}
                    className={`press rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${
                      group === item.id
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink'
                    }`}
                  >
                    {item.label}
                    <span className="ml-1.5 opacity-70 tabular-nums">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="relative w-full lg:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <label htmlFor="order-search" className="sr-only">
                Search your orders by order number
              </label>
              <input
                id="order-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by order number"
                className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
              />
            </div>
          </div>

          {items.length === 0 && (
            <div className="mt-8">
              <EmptyState
                title="No orders match this filter"
                description={
                  search
                    ? `Nothing matched “${search}”. Try a different order number.`
                    : 'There are no orders in this group yet.'
                }
                actions={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setGroup('all')
                      setSearch('')
                    }}
                  >
                    Show all orders
                  </Button>
                }
              />
            </div>
          )}

          {items.length > 0 && (
            <>
              <p className="mt-6 text-sm text-ink-muted" aria-live="polite">
                {pluralize(filtered.length, 'order')}
                {hasPending ? ' · live status updates while orders settle' : ''}
              </p>

              <div className="mt-4 space-y-4">
                {items.map((order) => (
                  <OrderCard
                    key={order.orderNumber}
                    order={order}
                    productsById={byId}
                    onRefresh={async () => {
                      await refetch()
                    }}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                className="mt-10"
                label="Order history pagination"
              />
            </>
          )}
        </>
      )}
    </Container>
  )
}

export default Orders
