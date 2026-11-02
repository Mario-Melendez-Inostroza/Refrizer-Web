// Capa de datos: WooCommerce Store API (/wp/wp-json/wc/store/v1). Con VITE_USE_MOCKS=true usa src/mocks (desarrollo sin WordPress).
import type { Category, Product, ProductQuery } from '@/types'
import { WcHttpError, wcFetch } from './client'
import { getMockCategories, getMockProduct, getMockProducts } from './mock'
import { mapCategory, mapProduct, type StoreCategory, type StoreProduct } from './woocommerce'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  if (useMocks) return getMockProducts(query)
  const list = await wcFetch<StoreProduct[]>('/products', {
    per_page: 100,
    category: query.category,
    search: query.search?.trim(),
    featured: query.featured ? true : undefined,
    ...(query.sort === 'price-asc' && { orderby: 'price', order: 'asc' }),
    ...(query.sort === 'price-desc' && { orderby: 'price', order: 'desc' }),
  })
  // La Store API no devuelve el campo featured: si se pidieron destacados, todos lo son.
  return list.map((p) => mapProduct(query.featured ? { ...p, featured: true } : p))
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (useMocks) return getMockProduct(slug)
  try {
    return mapProduct(await wcFetch<StoreProduct>(`/products/${encodeURIComponent(slug)}`))
  } catch (e) {
    if (e instanceof WcHttpError && e.status === 404) return null
    throw e
  }
}

export async function getCategories(): Promise<Category[]> {
  if (useMocks) return getMockCategories()
  const list = await wcFetch<StoreCategory[]>('/products/categories', { per_page: 100, hide_empty: true })
  return list.map(mapCategory)
}

export const searchProducts = (term: string) => getProducts({ search: term })
