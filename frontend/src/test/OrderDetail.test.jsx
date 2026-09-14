import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import OrderDetail from '../pages/OrderDetail'
import { getOrder } from '../api/orders'
import { listProducts } from '../api/products'

vi.mock('../api/orders', () => ({
  getOrder: vi.fn(),
}))

vi.mock('../api/products', () => ({
  listProducts: vi.fn(),
}))

const MOCK_ORDER = {
  id: 44,
  orderNumber: 'ORD-440099',
  status: 'PAID',
  totalAmount: 150.00,
  createdAt: '2026-09-14T10:00:00',
  items: [
    { productId: 1, quantity: 2, price: 50.00, totalPrice: 100.00 },
    { productId: 2, quantity: 1, price: 50.00, totalPrice: 50.00 },
  ],
}

function renderOrderDetail(orderId = '44') {
  return render(
    <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listProducts).mockResolvedValue([])
  })

  test('renders order details correctly when API succeeds', async () => {
    vi.mocked(getOrder).mockResolvedValue(MOCK_ORDER)

    renderOrderDetail('44')

    await waitFor(() => expect(screen.getAllByText('ORD-440099').length).toBeGreaterThan(0))
    expect(screen.getByText('ID #44')).toBeInTheDocument()
    expect(screen.getByText('₹150.00')).toBeInTheDocument()
    expect(screen.getAllByText('PAID').length).toBeGreaterThan(0)
    expect(screen.getByText('Distributed Saga Execution Showcase')).toBeInTheDocument()
    expect(getOrder).toHaveBeenCalledWith('44', expect.any(Object))
  })

  test('renders missing order empty state when 404 occurs', async () => {
    const error404 = new Error('Not found')
    error404.status = 404
    error404.isNotFound = true
    vi.mocked(getOrder).mockRejectedValue(error404)

    renderOrderDetail('999999')

    expect(await screen.findByText('We could not find that order')).toBeInTheDocument()
    expect(screen.getByText(/The order number may be wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to your orders/i })).toBeInTheDocument()
  })

  test('renders forbidden empty state when 403 occurs', async () => {
    const error403 = new Error('Forbidden')
    error403.status = 403
    error403.isForbidden = true
    vi.mocked(getOrder).mockRejectedValue(error403)

    renderOrderDetail('44')

    expect(await screen.findByText('This order is not yours to view')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to your orders/i })).toBeInTheDocument()
  })

  test('renders error state when generic API error occurs', async () => {
    const error500 = new Error('Server failure')
    error500.status = 500
    error500.isServerError = true
    vi.mocked(getOrder).mockRejectedValue(error500)

    renderOrderDetail('44')

    expect(await screen.findByText('A service is having trouble')).toBeInTheDocument()
    expect(screen.getByText(/Our backend could not complete that request/i)).toBeInTheDocument()
  })
})
