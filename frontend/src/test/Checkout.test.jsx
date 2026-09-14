import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Checkout from '../pages/Checkout'
import { createOrder, getOrdersForUser } from '../api/orders'
import { getWallet } from '../api/payments'
import { listProducts } from '../api/products'

const clearCart = vi.fn()

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, email: 'shopper@example.com', role: 'USER' },
    isAuthenticated: true,
  }),
}))

vi.mock('../contexts/useCart', () => ({
  useCart: () => ({
    items: [
      { id: 5, name: 'Zephyr Lamp', price: 100, quantity: 2, imageUrl: null, category: 'Home' },
    ],
    itemCount: 2,
    subtotal: 200,
    clearCart,
    replaceItems: vi.fn(),
  }),
}))

vi.mock('../contexts/useToast', () => ({
  useToast: () => ({
    push: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

vi.mock('../api/orders', () => ({
  createOrder: vi.fn(),
  getOrdersForUser: vi.fn(),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  deleteOrder: vi.fn(),
}))

vi.mock('../api/payments', () => ({
  getWallet: vi.fn(),
  createWallet: vi.fn(),
  addFunds: vi.fn(),
}))

vi.mock('../api/products', () => ({
  listProducts: vi.fn(),
  getProduct: vi.fn(),
  searchProducts: vi.fn(),
  listProductsByCategory: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))

const CATALOG = [{ id: 5, name: 'Zephyr Lamp', price: 100, category: 'Home', stockQuantity: 20, imageUrl: null }]

function renderCheckout() {
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>,
  )
}

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listProducts).mockResolvedValue(CATALOG)
  })

  test('prices the order from the live catalog rather than the stored bag', async () => {
    vi.mocked(getWallet).mockResolvedValue({ userId: 7, balance: 500 })
    renderCheckout()

    // 2 × ₹100 live price, shown in both the review and the amount due panel.
    expect(await screen.findByText('₹200.00')).toBeInTheDocument()
    expect(await screen.findByText(/covers this order/i)).toBeInTheDocument()
  })

  test('blocks ordering until a wallet exists and can cover the total', async () => {
    vi.mocked(getWallet).mockRejectedValue(
      Object.assign(new Error('missing'), { status: 404, isNotFound: true }),
    )

    renderCheckout()

    expect(await screen.findByRole('button', { name: /set up wallet/i })).toBeInTheDocument()

    const placeOrder = screen.getByRole('button', { name: /place order/i })
    await waitFor(() => expect(placeOrder).toBeDisabled())
    expect(createOrder).not.toHaveBeenCalled()
  })

  test('blocks ordering when the wallet balance is short', async () => {
    vi.mocked(getWallet).mockResolvedValue({ userId: 7, balance: 50 })
    renderCheckout()

    expect(await screen.findByText(/₹150\.00 short for this order/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeDisabled())
  })

  test('places the order with an idempotency key and then tracks settlement', async () => {
    vi.mocked(getWallet).mockResolvedValue({ userId: 7, balance: 500 })
    vi.mocked(createOrder).mockResolvedValue({
      id: 42,
      orderNumber: 'ORD-ABC123',
      status: 'PENDING',
      totalAmount: 200,
      items: [],
      createdAt: '2026-01-01T00:00:00',
    })
    vi.mocked(getOrdersForUser).mockResolvedValue([
      {
        id: 42,
        orderNumber: 'ORD-ABC123',
        status: 'PAID',
        totalAmount: 200,
        items: [],
        createdAt: '2026-01-01T00:00:00',
      },
    ])

    renderCheckout()

    const placeOrder = await screen.findByRole('button', { name: /place order/i })
    await waitFor(() => expect(placeOrder).toBeEnabled())

    await act(async () => {
      placeOrder.click()
    })

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(createOrder).mock.calls[0][0]
    expect(payload.userId).toBe(7)
    expect(payload.items).toEqual([{ productId: 5, quantity: 2 }])
    expect(payload.idempotencyKey).toMatch(/^aureum-/)

    // The bag is cleared only once the order exists on the server.
    expect(clearCart).toHaveBeenCalledTimes(1)

    // Then the saga is watched to a terminal state.
    expect(await screen.findByText('ORD-ABC123')).toBeInTheDocument()
    expect(await screen.findByText(/what happens next/i)).toBeInTheDocument()
  })

  test('shows the backend failure and keeps the order retryable', async () => {
    vi.mocked(getWallet).mockResolvedValue({ userId: 7, balance: 500 })
    vi.mocked(createOrder).mockRejectedValue(
      Object.assign(new Error('Service unavailable'), { status: 503, isServerError: true }),
    )

    renderCheckout()

    const placeOrder = await screen.findByRole('button', { name: /place order/i })
    await waitFor(() => expect(placeOrder).toBeEnabled())

    await act(async () => {
      placeOrder.click()
    })

    expect(await screen.findByText(/the order was not created/i)).toBeInTheDocument()
    expect(screen.getByText(/Service unavailable/i)).toBeInTheDocument()
    expect(clearCart).not.toHaveBeenCalled()
  })
})
