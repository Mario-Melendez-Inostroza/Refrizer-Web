const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

/** Formatea un precio CLP (string o número entero) como $12.990 */
export function formatCLP(value: string | number): string {
  const n = typeof value === 'string' ? parseInt(value, 10) : value
  return clp.format(Number.isFinite(n) ? n : 0).replace(/\s/g, '')
}

export const priceOf = (p: { prices: { price: string } }) => parseInt(p.prices.price, 10) || 0

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function whatsappUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
