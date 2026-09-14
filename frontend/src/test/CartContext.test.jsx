import { render, screen, act } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { CartProvider } from '../contexts/CartContext'
import { useCart } from '../contexts/useCart'

function CartTestComponent() {
  const {
    items,
    addItem,
    removeItem,
    setQuantity,
    increment,
    decrement,
    clearCart,
    itemCount,
    subtotal,
  } = useCart()

  return (
    <div>
      <span data-testid="item-count">{itemCount}</span>
      <span data-testid="subtotal">{subtotal.toFixed(2)}</span>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-testid={`cart-item-${item.id}`}>
            {item.name} x {item.quantity}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addItem({ id: 101, name: 'Wireless Headphones', price: 99.99 })}
      >
        Add Item
      </button>
      <button type="button" onClick={() => addItem({ id: 202, name: 'Scarce Lamp', price: 10, stockQuantity: 2 })}>
        Add Limited Item
      </button>
      <button type="button" onClick={() => increment(202)}>
        Increment Limited
      </button>
      <button type="button" onClick={() => decrement(202)}>
        Decrement Limited
      </button>
      <button type="button" onClick={() => setQuantity(101, 3)}>
        Update Qty
      </button>
      <button type="button" onClick={() => removeItem(101)}>
        Remove Item
      </button>
      <button type="button" onClick={clearCart}>
        Clear Cart
      </button>
    </div>
  )
}

function renderCart() {
  return render(
    <CartProvider>
      <CartTestComponent />
    </CartProvider>,
  )
}

const click = (name) => act(() => screen.getByText(name).click())

describe('CartProvider', () => {
  test('adds, updates, removes and clears items with correct totals', () => {
    renderCart()

    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0.00')

    click('Add Item')
    expect(screen.getByTestId('item-count')).toHaveTextContent('1')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('99.99')
    expect(screen.getByTestId('cart-item-101')).toHaveTextContent('Wireless Headphones x 1')

    click('Update Qty')
    expect(screen.getByTestId('item-count')).toHaveTextContent('3')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('299.97')

    click('Remove Item')
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0.00')

    click('Add Item')
    click('Clear Cart')
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
  })

  test('never lets a quantity exceed the known stock', () => {
    renderCart()

    click('Add Limited Item')
    click('Increment Limited')
    click('Increment Limited')
    click('Increment Limited')

    // stockQuantity is 2, so three increments must stop at two.
    expect(screen.getByTestId('cart-item-202')).toHaveTextContent('Scarce Lamp x 2')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('20.00')

    click('Decrement Limited')
    expect(screen.getByTestId('cart-item-202')).toHaveTextContent('Scarce Lamp x 1')
  })

  test('adds the same product once and increases its quantity', () => {
    renderCart()

    click('Add Item')
    click('Add Item')

    expect(screen.getAllByTestId('cart-item-101')).toHaveLength(1)
    expect(screen.getByTestId('cart-item-101')).toHaveTextContent('x 2')
  })

  test('persists the bag across mounts', () => {
    const { unmount } = renderCart()
    click('Add Item')
    unmount()

    renderCart()
    expect(screen.getByTestId('cart-item-101')).toBeInTheDocument()
  })

  test('discards corrupted stored data instead of crashing', () => {
    localStorage.setItem('aureum.cart', '{"not":"an array"}')
    renderCart()
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')

    localStorage.setItem('aureum.cart', JSON.stringify([{ nonsense: true }]))
    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
  })
})
