import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { getOrdersByUserId } from '../services/orderService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'
import { LoadingState } from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'

const STATUS_STYLES = {
  PENDING: 'text-secondary',
  PAID: 'text-primary',
  SHIPPED: 'text-primary',
  DELIVERED: 'text-primary',
  CANCELLED: 'text-secondary line-through',
}

function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getOrdersByUserId(user.id)
      setOrders(data || [])
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return num && !isNaN(num) ? num.toFixed(2) : '0.00'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <LoadingState message="Loading orders…" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-10">
            Your orders
          </h1>
          <ErrorState message={error} onRetry={fetchOrders} />
        </div>
      </main>
    )
  }

  if (orders.length === 0) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-md mx-auto px-6 lg:px-8 text-center">
          <div className="mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-4">
            No orders yet
          </h1>
          <p className="text-secondary mb-8">
            When you place an order, it will appear here.
          </p>
          <Link to="/products">
            <Button>Start shopping</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-10">
          Your orders
        </h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.orderNumber}
              className="p-6 bg-bg-secondary border border-border-light"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-secondary">Order #{order.orderNumber}</p>
                  <p className="text-sm text-secondary mt-1">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className={`text-sm font-medium ${STATUS_STYLES[order.status] || 'text-primary'}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border-light">
                <p className="text-sm text-secondary">
                  {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                  {order.totalAmount != null && (
                    <> · ${formatPrice(order.totalAmount)}</>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default Orders
