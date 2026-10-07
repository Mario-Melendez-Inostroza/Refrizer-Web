import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, Product } from '@/types'
import { priceOf } from '@/lib/format'

interface CartCtx {
  items: CartItem[]
  count: number
  subtotal: number
  add: (product: Product, qty?: number) => void
  update: (id: number, qty: number) => void
  remove: (id: number) => void
  clear: () => void
}

const noop = () => {}
const fallback: CartCtx = { items: [], count: 0, subtotal: 0, add: noop, update: noop, remove: noop, clear: noop }

const Ctx = createContext<CartCtx>(fallback)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const value = useMemo<CartCtx>(() => {
    const add = (product: Product, qty = 1) =>
      setItems((prev) => {
        const found = prev.find((i) => i.product.id === product.id)
        if (found) return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i))
        return [...prev, { product, quantity: qty }]
      })
    const update = (id: number, qty: number) =>
      setItems((prev) => (qty <= 0 ? prev.filter((i) => i.product.id !== id) : prev.map((i) => (i.product.id === id ? { ...i, quantity: qty } : i))))
    const remove = (id: number) => setItems((prev) => prev.filter((i) => i.product.id !== id))
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + priceOf(i.product) * i.quantity, 0),
      add,
      update,
      remove,
      clear: () => setItems([]),
    }
  }, [items])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  return useContext(Ctx)
}
