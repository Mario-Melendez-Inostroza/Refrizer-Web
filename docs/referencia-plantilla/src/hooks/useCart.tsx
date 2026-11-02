import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** Solo id + cantidad. Nunca precios. */
export interface CartLine { productId: number; quantity: number }

const KEY = 'tienda.cart.v1'

interface CartCtx {
  lines: CartLine[]
  count: number
  add: (productId: number, qty?: number) => void
  setQty: (productId: number, qty: number) => void
  remove: (productId: number) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
}

const Ctx = createContext<CartCtx | null>(null)

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw)
      ? raw.filter((l) => Number.isInteger(l?.productId) && Number.isInteger(l?.quantity) && l.quantity > 0).map((l) => ({ productId: l.productId, quantity: l.quantity }))
      : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read)
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lines))
  }, [lines])

  const setQty = useCallback((productId: number, qty: number) => {
    setLines((ls) => qty <= 0 ? ls.filter((l) => l.productId !== productId) : ls.map((l) => l.productId === productId ? { ...l, quantity: qty } : l))
  }, [])
  const add = useCallback((productId: number, qty = 1) => {
    setLines((ls) => ls.some((l) => l.productId === productId)
      ? ls.map((l) => l.productId === productId ? { ...l, quantity: l.quantity + qty } : l)
      : [...ls, { productId, quantity: qty }])
  }, [])
  const remove = useCallback((productId: number) => setLines((ls) => ls.filter((l) => l.productId !== productId)), [])
  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartCtx>(() => ({
    lines, count: lines.reduce((s, l) => s + l.quantity, 0),
    add, setQty, remove, clear, isOpen, open: () => setOpen(true), close: () => setOpen(false),
  }), [lines, add, setQty, remove, clear, isOpen])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart debe usarse dentro de CartProvider')
  return c
}
