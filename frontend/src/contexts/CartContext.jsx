import { useState, useCallback, useEffect } from 'react'
import CartContext from './CartContextObject'

const CART_STORAGE_KEY = 'cart_items'

/**
 * CartContext — frontend-only cart state with localStorage persistence.
 *
 * Cart item shape:
 *   { id: number, name: string, price: number|string, imageUrl: string|null, quantity: number }
 *
 * The backend calculates authoritative prices at order time.
 * Frontend prices are display-only.
 */

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Validate each item has required fields
    return parsed.filter(
      (item) =>
        item &&
        (typeof item.id === 'number' || typeof item.id === 'string') &&
        typeof item.name === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    )
  } catch {
    return []
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage errors
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    saveCart(items)
  }, [items])

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || null,
          quantity: 1,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price
    return sum + (price || 0) * item.quantity
  }, 0)

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
