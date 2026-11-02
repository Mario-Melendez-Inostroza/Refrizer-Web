/** Tipos mínimos de la Store API de WooCommerce y su mapeo al modelo de la tienda (src/types). */
import type { Category, Product, ProductImage, StockStatus } from '../types'

export interface StoreImage { src: string; alt: string }
export interface StoreCategoryRef { id: number; name: string; slug: string }

export interface StoreProduct {
  id: number
  name: string
  slug: string
  short_description: string
  description: string
  /** CLP no usa decimales (currency_minor_unit = 0): los strings ya son enteros. */
  prices: { price: string; regular_price: string; sale_price: string; currency_minor_unit: number }
  on_sale: boolean
  images: StoreImage[]
  categories: StoreCategoryRef[]
  is_in_stock: boolean
  low_stock_remaining: number | null
  stock_availability: { text: string; class: string }
}

export interface StoreCategory extends StoreCategoryRef {
  description: string
  image: StoreImage | null
}

/** HTML de WordPress a texto plano (la UI no renderiza HTML). */
export function htmlToText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function firstSentence(text: string, max = 110): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const stop = cut.lastIndexOf('. ')
  return stop > 40 ? cut.slice(0, stop + 1) : `${cut.replace(/\s+\S*$/, '')}…`
}

/** price viene en unidades menores; con currency_minor_unit = 0 equivale al CLP entero. */
function toAmount(value: string, minorUnit: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n / 10 ** minorUnit) : 0
}

const toImage = (i: StoreImage): ProductImage => ({ src: i.src, alt: i.alt })

export function mapCategory(c: StoreCategory): Category {
  return {
    id: c.id,
    name: htmlToText(c.name),
    slug: c.slug,
    description: htmlToText(c.description) || undefined,
    image: c.image ? toImage(c.image) : undefined,
  }
}

export function mapProduct(p: StoreProduct): Product {
  const unit = p.prices.currency_minor_unit
  const regularPrice = toAmount(p.prices.regular_price, unit)
  const price = toAmount(p.prices.price, unit)
  const salePrice = p.on_sale ? toAmount(p.prices.sale_price, unit) : null

  // La Store API no expone la cantidad exacta: solo low_stock_remaining (stock bajo) y, si la tienda
  // lo muestra, un texto "N disponibles". Se toma el número de ahí; si no hay, null (la UI usa 99).
  const fromText = Number(/\d+/.exec(p.stock_availability?.text ?? '')?.[0])
  const stockQuantity = !p.is_in_stock ? 0 : (p.low_stock_remaining ?? (Number.isFinite(fromText) ? fromText : null))
  const stockStatus: StockStatus = !p.is_in_stock ? 'outofstock' : p.low_stock_remaining != null ? 'lowstock' : 'instock'

  const description = htmlToText(p.description)
  return {
    id: p.id,
    name: htmlToText(p.name),
    slug: p.slug,
    shortDescription: htmlToText(p.short_description) || firstSentence(description),
    description,
    price,
    regularPrice,
    salePrice,
    images: p.images.map(toImage),
    categories: p.categories.map((c) => ({ id: c.id, name: htmlToText(c.name), slug: c.slug })),
    stockStatus,
    stockQuantity,
  }
}
