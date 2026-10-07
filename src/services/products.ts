// Capa de datos. Hoy lee de src/mocks; luego se reemplaza por fetch a la
// WooCommerce Store API (/wp-json/wc/store/v1) sin tocar los componentes.
import type { Category, Product, ProductQuery } from '@/types'
import { mockProducts } from '@/mocks/products'
import { mockCategories } from '@/mocks/categories'
import { priceOf } from '@/lib/format'

const delay = <T,>(data: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(data), ms))

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  let list = [...mockProducts]
  if (query.featured) list = list.filter((p) => p.featured)
  if (query.category) list = list.filter((p) => p.categories.some((c) => c.slug === query.category))
  if (query.search) {
    const q = normalize(query.search)
    list = list.filter((p) => normalize(p.name + ' ' + p.short_description).includes(q))
  }
  if (query.sort === 'price-asc') list.sort((a, b) => priceOf(a) - priceOf(b))
  if (query.sort === 'price-desc') list.sort((a, b) => priceOf(b) - priceOf(a))
  return delay(list)
}

export async function getProduct(slug: string): Promise<Product | null> {
  return delay(mockProducts.find((p) => p.slug === slug) ?? null)
}

export async function getCategories(): Promise<Category[]> {
  return delay(mockCategories)
}

export async function searchProducts(term: string): Promise<Product[]> {
  return getProducts({ search: term })
}
