import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('majustel-cart')) || []
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('majustel-cart', JSON.stringify(items))
  }, [items])

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setOpen(true)
  }

  const updateQty = (id, qty) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i)),
    )
  }

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))
  const clearCart = () => setItems([])

  const { count, total } = useMemo(
    () => ({
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
    }),
    [items],
  )

  const value = { items, count, total, open, setOpen, addItem, updateQty, removeItem, clearCart }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
