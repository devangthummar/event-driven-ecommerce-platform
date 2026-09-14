import { useCallback, useEffect, useMemo, useState } from 'react'
import { toNumber } from '../lib/format'
import CartContext from './CartContextObject'

/* ==========================================================================
   CartProvider
   --------------------------------------------------------------------------
   The bag is a frontend concern: the Order Service prices every order from
   Product Service data at order time, so nothing here is trusted as money.
   Line prices are a display cache, refreshed against the live catalog before
   checkout (see the checkout screen's price revalidation).

   Item shape: { id, name, price, imageUrl, category, quantity, stockQuantity }
   ========================================================================== */

const CART_STORAGE_KEY = 'aureum.cart'
const MAX_QUANTITY = 20

function isValidItem(item) {
  const hasIdentity = typeof item?.id === 'number' || typeof item?.id === 'string'
  return Boolean(
    hasIdentity &&
      typeof item.name === 'string' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
  )
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Drop anything that does not look like a cart line (corrupted storage).
    return parsed.filter(isValidItem)
  } catch {
    return []
  }
}

function persist(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* storage unavailable — the cart simply does not survive a reload */
  }
}

/** Available stock is the tighter of catalog stock and any known inventory. */
function upperBound(item) {
  const stock = Number.isInteger(item?.stockQuantity) ? item.stockQuantity : null
  if (stock === null || stock < 0) return MAX_QUANTITY
  return Math.max(1, Math.min(stock, MAX_QUANTITY))
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    persist(items)
  }, [items])

  // Keep multiple open tabs consistent.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== CART_STORAGE_KEY) return
      setItems(loadCart())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = useCallback((product, quantity = 1) => {
    const productId = product?.id
    if (productId === undefined || productId === null) return

    setItems((previous) => {
      const existing = previous.find((item) => String(item.id) === String(productId))
      if (existing) {
        const limit = upperBound(existing)
        return previous.map((item) =>
          String(item.id) === String(productId)
            ? { ...item, quantity: Math.min(item.quantity + quantity, limit) }
            : item,
        )
      }

      const line = {
        id: productId,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl ?? null,
        category: product.category ?? null,
        stockQuantity: Number.isInteger(product.stockQuantity) ? product.stockQuantity : null,
        quantity: Math.max(1, quantity),
      }
      return [...previous, line]
    })
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((previous) => previous.filter((item) => String(item.id) !== String(productId)))
  }, [])

  const setQuantity = useCallback((productId, quantity) => {
    setItems((previous) =>
      previous
        .map((item) => {
          if (String(item.id) !== String(productId)) return item
          const limit = upperBound(item)
          return { ...item, quantity: Math.min(Math.max(1, Math.floor(quantity)), limit) }
        })
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const increment = useCallback((productId) => {
    setItems((previous) =>
      previous.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, quantity: Math.min(item.quantity + 1, upperBound(item)) }
          : item,
      ),
    )
  }, [])

  const decrement = useCallback((productId) => {
    setItems((previous) =>
      previous.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  /** Replace the bag after reconciling line items against the live catalog. */
  const replaceItems = useCallback((nextItems) => {
    setItems(Array.isArray(nextItems) ? nextItems.filter(isValidItem) : [])
  }, [])

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0
    let total = 0
    for (const item of items) {
      count += item.quantity
      total += toNumber(item.price) * item.quantity
    }
    return { itemCount: count, subtotal: total }
  }, [items])

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      increment,
      decrement,
      clearCart,
      replaceItems,
      hasItem: (productId) => items.some((item) => String(item.id) === String(productId)),
      quantityOf: (productId) =>
        items.find((item) => String(item.id) === String(productId))?.quantity ?? 0,
    }),
    [
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      increment,
      decrement,
      clearCart,
      replaceItems,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
