import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, Product } from '@/types'
import { priceOf } from '@/lib/format'
import { MAX_QTY, readLines, writeLines, type CartLine } from '@/lib/cartStorage'
import { getProducts } from '@/services'

interface CartCtx {
  items: CartItem[]
  count: number
  subtotal: number
  loading: boolean
  add: (product: Product, qty?: number) => void
  update: (id: number, qty: number) => void
  remove: (id: number) => void
  clear: () => void
}

const noop = () => {}
const fallback: CartCtx = { items: [], count: 0, subtotal: 0, loading: false, add: noop, update: noop, remove: noop, clear: noop }

const Ctx = createContext<CartCtx>(fallback)

/**
 * El carrito persiste solo { productId, quantity } en el navegador. El producto (nombre, imagen, precio, stock) se pide
 * al catálogo en cada visita, así un precio cambiado en WooCommerce nunca queda viejo en el carrito. Si un producto
 * ya no existe, su línea se descarta. El total real lo calcula WooCommerce al pagar.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readLines)
  const [products, setProducts] = useState<Record<number, Product>>({})
  const [loading, setLoading] = useState(() => readLines().length > 0)

  useEffect(() => writeLines(lines), [lines])

  // Al abrir el sitio: traer del catálogo los productos guardados.
  useEffect(() => {
    const ids = lines.map((l) => l.productId)
    if (ids.length === 0) return setLoading(false)
    let alive = true
    getProducts({ ids })
      .then((list) => {
        if (!alive) return
        setProducts((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.id, p])) }))
        setLines((prev) => prev.filter((l) => list.some((p) => p.id === l.productId)))
      })
      .catch((err) => console.error(err)) // sin red: las líneas se conservan y se reintenta en la próxima visita
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<CartCtx>(() => {
    const items = lines.flatMap((l) => (products[l.productId] ? [{ product: products[l.productId], quantity: l.quantity }] : []))
    const add = (product: Product, qty = 1) => {
      setProducts((prev) => ({ ...prev, [product.id]: product }))
      setLines((prev) =>
        prev.some((l) => l.productId === product.id)
          ? prev.map((l) => (l.productId === product.id ? { ...l, quantity: Math.min(l.quantity + qty, MAX_QTY) } : l))
          : [...prev, { productId: product.id, quantity: Math.min(qty, MAX_QTY) }],
      )
    }
    const update = (id: number, qty: number) =>
      setLines((prev) => (qty <= 0 ? prev.filter((l) => l.productId !== id) : prev.map((l) => (l.productId === id ? { ...l, quantity: Math.min(qty, MAX_QTY) } : l))))
    const remove = (id: number) => setLines((prev) => prev.filter((l) => l.productId !== id))
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + priceOf(i.product) * i.quantity, 0),
      loading,
      add,
      update,
      remove,
      clear: () => setLines([]),
    }
  }, [lines, products, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  return useContext(Ctx)
}
