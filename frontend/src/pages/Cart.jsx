import { Link } from 'react-router-dom'
import { useCart } from '../contexts/useCart'
import Button from '../components/ui/Button'

function Cart() {
  const { items, removeItem, updateQuantity, itemCount, subtotal } = useCart()

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return num && !isNaN(num) ? num.toFixed(2) : '0.00'
  }

  if (items.length === 0) {
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-4">
            Your bag is empty
          </h1>
          <p className="text-secondary mb-8">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link to="/products">
            <Button>Continue shopping</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-3xl lg:text-4xl font-semibold text-primary tracking-tight mb-10">
          Shopping bag
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 pb-6 border-b border-border-light"
              >
                <Link to={`/products/${item.id}`} className="flex-shrink-0">
                  <div className="w-24 h-32 bg-bg-tertiary">
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
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.id}`}
                    className="text-sm font-medium text-primary hover:text-secondary transition-colors duration-200 line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-secondary mt-1">
                    ${formatPrice(item.price)} each
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center border border-border rounded text-sm text-secondary hover:border-primary hover:text-primary transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-primary w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center border border-border rounded text-sm text-secondary hover:border-primary hover:text-primary transition-colors duration-200 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="text-sm font-medium text-primary">
                    ${formatPrice(item.price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-secondary hover:text-primary transition-colors duration-200 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Order summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">
                    Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                  <span className="text-primary">${formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Shipping</span>
                  <span className="text-primary">Calculated at checkout</span>
                </div>
                <div className="pt-3 border-t border-border-light flex justify-between">
                  <span className="font-medium text-primary">Total</span>
                  <span className="font-medium text-primary">${formatPrice(subtotal)}</span>
                </div>
              </div>
              <Link to="/checkout">
                <Button className="w-full mt-6">
                  Checkout
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted text-center">
                Final amounts calculated by server
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Cart
