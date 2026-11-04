import type { Product, ProductQuery } from '../types'
import { WcHttpError, wcFetch } from './client'
import { mapProduct, type StoreProduct } from './woocommerce'

export async function getProducts(params: ProductQuery = {}): Promise<Product[]> {
  const list = await wcFetch<StoreProduct[]>('/products', {
    per_page: 100,
    include: params.ids?.join(','),
    category: params.category,
    search: params.search?.trim(),
    featured: params.featured ? true : undefined,
    ...(params.sort === 'price-asc' && { orderby: 'price', order: 'asc' }),
    ...(params.sort === 'price-desc' && { orderby: 'price', order: 'desc' }),
  })
  return list.map(mapProduct)
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    return mapProduct(await wcFetch<StoreProduct>(`/products/${encodeURIComponent(slug)}`))
  } catch (e) {
    if (e instanceof WcHttpError && e.status === 404) return null
    throw e
  }
}
