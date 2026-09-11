import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useCart } from '../contexts/useCart'
import { createOrder } from '../services/orderService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'

function Checkout() {
  const { user } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return num && !isNaN(num) ? num.toFixed(2) : '0.00'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      if (!user?.id) {
        setError('Please sign in to place an order.')
        setLoading(false)
        return
      }

      const orderItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))

      // Generate a client idempotency key to prevent duplicate orders on retries
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      const result = await createOrder({
        userId: user.id,
        items: orderItems,
        idempotencyKey,
      })

      clearCart()
      setSuccess(result.orderNumber || 'Order placed')
      setTimeout(() => navigate('/orders'), 2000)
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  // Empty cart guard
  if (items.length === 0 && !success) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-md mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-4">
            Nothing to check out
          </h1>
          <p className="text-secondary mb-8">
            Your cart is empty.
          </p>
          <Link to="/products">
            <Button>Browse products</Button>
          </Link>
        </div>
      </main>
    )
  }

  // Success state
  if (success) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-md mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-4">
            Order placed
          </h1>
          <p className="text-secondary mb-2">
            Your order has been confirmed.
          </p>
          <p className="text-sm text-muted mb-8">
            Order #{success}
          </p>
          <p className="text-sm text-muted">
            Redirecting to your orders…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-10">
          Checkout
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-bg-secondary border border-border-light text-sm text-secondary text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-semibold text-primary">Order items</h2>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 pb-6 border-b border-border-light"
              >
                <div className="w-20 h-28 bg-bg-tertiary flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                      Image
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-primary">
                    {item.name}
                  </h3>
                  <p className="text-sm text-secondary mt-1">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium text-primary">
                  ${formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal</span>
                  <span className="text-primary">${formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Shipping</span>
                  <span className="text-primary">Calculated at confirmation</span>
                </div>
                <div className="pt-3 border-t border-border-light flex justify-between">
                  <span className="font-medium text-primary">Total</span>
                  <span className="font-medium text-primary">${formatPrice(subtotal)}</span>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading ? 'Placing order…' : 'Place order'}
                </Button>
              </form>
              <p className="mt-4 text-xs text-muted text-center">
                Final amounts are calculated by the server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Checkout
