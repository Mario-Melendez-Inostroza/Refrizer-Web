/** El carrito guarda solo id + cantidad: nunca precios (los precios salen del catálogo vivo). */
export interface CartLine { productId: number; quantity: number }

export const CART_KEY = 'refrizer.cart.v1'
export const MAX_QTY = 99

/** Lee un valor guardado en el navegador y descarta lo que no sea { productId, quantity } enteros y positivos. */
export function parseLines(raw: string | null): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw || '[]')
    if (!Array.isArray(data)) return []
    const lines: CartLine[] = []
    for (const l of data) {
      const productId = l?.productId
      const quantity = l?.quantity
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) continue
      if (lines.some((x) => x.productId === productId)) continue
      lines.push({ productId, quantity: Math.min(quantity, MAX_QTY) })
    }
    return lines
  } catch {
    return []
  }
}

export function readLines(): CartLine[] {
  try { return parseLines(localStorage.getItem(CART_KEY)) } catch { return [] }
}

export function writeLines(lines: CartLine[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(lines)) } catch { /* almacenamiento bloqueado: el carrito dura la sesión */ }
}
