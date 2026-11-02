// Mapeo de la WooCommerce Store API al modelo de la tienda (src/types), que ya tiene la misma forma.
import type { Category, Product, ProductImage } from '@/types'

interface StoreImage { id: number; src: string; thumbnail?: string; alt: string; name?: string }
interface StoreCategoryRef { id: number; name: string; slug: string }

export interface StoreProduct {
  id: number
  name: string
  slug: string
  short_description: string
  description: string
  /** CLP no usa decimales (currency_minor_unit = 0): los strings ya son enteros. */
  prices: { price: string; regular_price: string; sale_price: string; currency_code?: string; currency_minor_unit?: number }
  images: StoreImage[]
  categories: StoreCategoryRef[]
  is_in_stock: boolean
  featured?: boolean
}

export interface StoreCategory extends StoreCategoryRef {
  image: StoreImage | null
}

const ALLOWED_TAGS = new Set(['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4'])

/**
 * El HTML de descripciones se muestra con dangerouslySetInnerHTML: se deja solo una lista corta de etiquetas
 * y se quitan todos sus atributos (sin onerror, style ni enlaces). Lo demás se descarta.
 */
export function sanitizeHtml(html: string): string {
  return (html ?? '')
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, (_m, close: string, tag: string) => {
      const t = tag.toLowerCase()
      return ALLOWED_TAGS.has(t) ? (t === 'br' ? '<br>' : `<${close}${t}>`) : ''
    })
    .replace(/<(?![/a-z])/gi, '&lt;')
}

/** Nombres de producto y categoría llegan con entidades HTML (&amp;, &#8211;) y sin etiquetas. */
export function decodeText(text: string): string {
  return (text ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .trim()
}

/** Los precios llegan en unidades menores; con currency_minor_unit = 0 son el CLP entero. Se devuelven como string entero. */
function amount(value: string, minorUnit = 0): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(Math.round(n / 10 ** minorUnit)) : '0'
}

const toImage = (i: StoreImage): ProductImage => ({ id: i.id, src: i.src, thumbnail: i.thumbnail, alt: i.alt, name: i.name })

export function mapProduct(p: StoreProduct): Product {
  const unit = p.prices.currency_minor_unit ?? 0
  const price = amount(p.prices.price, unit)
  const regular = amount(p.prices.regular_price, unit)
  const sale = p.prices.sale_price ? amount(p.prices.sale_price, unit) : ''
  return {
    id: p.id,
    name: decodeText(p.name),
    slug: p.slug,
    prices: { price, regular_price: regular, sale_price: sale && sale !== regular ? sale : '', currency_code: p.prices.currency_code, currency_minor_unit: unit },
    images: p.images.map(toImage),
    categories: p.categories.map((c) => ({ id: c.id, name: decodeText(c.name), slug: c.slug })),
    short_description: sanitizeHtml(p.short_description),
    description: sanitizeHtml(p.description),
    is_in_stock: p.is_in_stock,
    featured: p.featured ?? false,
  }
}

export function mapCategory(c: StoreCategory): Category {
  return { id: c.id, name: decodeText(c.name), slug: c.slug, image: c.image ? toImage(c.image) : null }
}
