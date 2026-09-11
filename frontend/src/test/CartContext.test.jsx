import { render, screen, act } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { CartProvider } from '../contexts/CartContext'
import { useCart } from '../contexts/useCart'

function CartTestComponent() {
  const { items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal } = useCart()

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
        onClick={() =>
          addItem({ id: 101, name: 'Wireless Headphones', price: 99.99 })
        }
      >
        Add Item
      </button>
      <button onClick={() => updateQuantity(101, 3)}>Update Qty</button>
      <button onClick={() => removeItem(101)}>Remove Item</button>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  )
}

describe('CartContext Component', () => {
  test('manages adding, updating, removing, and clearing items in cart', async () => {
    render(
      <CartProvider>
        <CartTestComponent />
      </CartProvider>,
    )

    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0.00')

    const addBtn = screen.getByText('Add Item')
    act(() => {
      addBtn.click()
    })

    expect(screen.getByTestId('item-count')).toHaveTextContent('1')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('99.99')
    expect(screen.getByTestId('cart-item-101')).toHaveTextContent('Wireless Headphones x 1')

    const updateBtn = screen.getByText('Update Qty')
    act(() => {
      updateBtn.click()
    })

    expect(screen.getByTestId('item-count')).toHaveTextContent('3')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('299.97')

    const removeBtn = screen.getByText('Remove Item')
    act(() => {
      removeBtn.click()
    })

    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0.00')
  })
})
