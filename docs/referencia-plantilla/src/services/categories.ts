import type { Category } from '../types'
import { wcFetch } from './client'
import { mapCategory, type StoreCategory } from './woocommerce'

export async function getCategories(): Promise<Category[]> {
  const list = await wcFetch<StoreCategory[]>('/products/categories', { per_page: 100, hide_empty: true })
  return list.map(mapCategory)
}
