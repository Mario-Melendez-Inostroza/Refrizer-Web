import { getProducts } from '../services'
import type { Product } from '../types'
import { useAsync } from './useAsync'
import { useCart } from './useCart'

/** Une las líneas del carrito con los productos del servicio. Total solo visual. */
export function useCartProducts() {
  const { lines } = useCart()
  const ids = lines.map((l) => l.productId)
  const key = ids.join(',')
  const q = useAsync<Product[]>(() => (ids.length ? getProducts({ ids }) : Promise.resolve([])), [key])
  const items = lines
    .map((l) => ({ line: l, product: q.data?.find((p) => p.id === l.productId) }))
    .filter((x): x is { line: typeof x.line; product: Product } => !!x.product)
  const subtotal = items.reduce((s, i) => s + i.product.price * i.line.quantity, 0)
  return { ...q, items, subtotal, loading: q.loading && !q.data }
}
