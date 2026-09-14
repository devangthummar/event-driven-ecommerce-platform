import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect } from 'vitest'
import ProductCard from '../components/product/ProductCard'
import { CartProvider } from '../contexts/CartContext'
import { useCart } from '../contexts/useCart'

const PRODUCT = {
  id: 11,
  name: 'Atlas Wireless Headphones',
  price: 249.5,
  category: 'Electronics',
  stockQuantity: 12,
  imageUrl: null,
  averageRating: 4.4,
  createdAt: '2026-01-01T00:00:00',
}

function CartProbe() {
  const { itemCount, subtotal } = useCart()
  return (
    <div>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="subtotal">{subtotal.toFixed(2)}</span>
    </div>
  )
}

function renderCard(product = PRODUCT) {
  return render(
    <MemoryRouter>
      <CartProvider>
        <ProductCard product={product} />
        <CartProbe />
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  test('renders the product name, formatted price and rating', () => {
    renderCard()

    expect(screen.getByText('Atlas Wireless Headphones')).toBeInTheDocument()
    expect(screen.getByText('₹249.50')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /rated 4.4 out of 5/i })).toBeInTheDocument()
  })

  test('links to the product page with an accessible label', () => {
    renderCard()
    expect(
      screen.getByRole('link', { name: /Atlas Wireless Headphones, ₹249\.50 — view details/i }),
    ).toHaveAttribute('href', '/products/11')
  })

  test('adds the product to the bag and reflects it in the cart total', () => {
    renderCard()

    act(() => {
      screen.getByRole('button', { name: /add Atlas Wireless Headphones to bag/i }).click()
    })

    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('249.50')
    // The button confirms purely from state — no toast, no page-level noise.
    expect(screen.getByRole('button', { name: /add Atlas Wireless Headphones to bag/i })).toHaveTextContent(
      'Added',
    )
  })

  test('marks a sold-out product and disables adding it', () => {
    renderCard({ ...PRODUCT, stockQuantity: 0 })

    // Both the badge and the disabled CTA communicate the same real state.
    expect(screen.getAllByText('Sold out').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /is sold out/i })).toBeDisabled()
  })

  test('falls back to a monogram tile when there is no image or on load failure', () => {
    renderCard()
    const img = screen.getByAltText('Atlas Wireless Headphones')
    act(() => {
      img.dispatchEvent(new Event('error'))
    })
    expect(screen.getByText('AW')).toBeInTheDocument()
  })
})
