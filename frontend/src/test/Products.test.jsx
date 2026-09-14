import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Products from '../pages/Products'
import { CartProvider } from '../contexts/CartContext'
import { listProducts, listProductsByCategory } from '../api/products'

// Mutable auth state so individual tests can exercise the signed-out path.
let authState = { isAuthenticated: true, user: { id: 7, role: 'USER' }, isAdmin: false }
vi.mock('../contexts/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('../api/products', () => ({
  listProducts: vi.fn(),
  listProductsByCategory: vi.fn(),
  searchProducts: vi.fn(),
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))

const CATALOG = [
  {
    id: 1,
    name: 'Zephyr Lamp',
    price: 120,
    category: 'Home',
    stockQuantity: 8,
    imageUrl: null,
    averageRating: 4.5,
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 2,
    name: 'Atlas Headphones',
    price: 89.5,
    category: 'Electronics',
    stockQuantity: 0,
    imageUrl: null,
    averageRating: 4.9,
    createdAt: '2026-03-01T00:00:00',
  },
]

function renderProducts(initialEntries = ['/products']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CartProvider>
        <Products />
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('Products catalog page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { isAuthenticated: true, user: { id: 7, role: 'USER' }, isAdmin: false }
  })

  test('renders the catalog with a result count and category facets', async () => {
    vi.mocked(listProducts).mockResolvedValue(CATALOG)

    renderProducts()

    expect(await screen.findByText('Zephyr Lamp')).toBeInTheDocument()
    expect(screen.getByText('Atlas Headphones')).toBeInTheDocument()
    expect(screen.getByText('2 products')).toBeInTheDocument()

    // Facets are derived from the real catalog, including counts.
    expect(screen.getByRole('radio', { name: /Home/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Electronics/ })).toBeInTheDocument()
  })

  test('respects a category filter from the URL using the category endpoint', async () => {
    vi.mocked(listProductsByCategory).mockResolvedValue([CATALOG[1]])

    renderProducts(['/products?category=Electronics'])

    await waitFor(() => expect(listProductsByCategory).toHaveBeenCalledWith('Electronics', expect.anything()))
    expect(await screen.findByText('Atlas Headphones')).toBeInTheDocument()
    expect(screen.queryByText('Zephyr Lamp')).not.toBeInTheDocument()
  })

  test('shows an intentional empty state for a filter with no matches', async () => {
    vi.mocked(listProducts).mockResolvedValue(CATALOG)

    renderProducts(['/products?min=1000'])

    expect(await screen.findByText(/no products match these filters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
  })

  test('shows an error state with a retry action instead of a blank page', async () => {
    const failure = Object.assign(new Error('boom'), { status: 500, isServerError: true })
    vi.mocked(listProducts).mockRejectedValue(failure)

    renderProducts()

    expect(await screen.findByText(/a service is having trouble/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  test('gates the catalog when there is no session', async () => {
    vi.mocked(listProducts).mockResolvedValue(CATALOG)
    authState = { isAuthenticated: false, user: null, isAdmin: false }

    renderProducts()

    expect(await screen.findByText(/sign in to browse the catalog/i)).toBeInTheDocument()
    expect(listProducts).not.toHaveBeenCalled()
  })
})
