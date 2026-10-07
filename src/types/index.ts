// Tipos alineados con la WooCommerce Store API (/wp-json/wc/store/v1)
export interface ProductImage {
  id: number
  src: string
  thumbnail?: string
  alt: string
  name?: string
}

export interface ProductCategoryRef {
  id: number
  name: string
  slug: string
}

export interface ProductPrices {
  /** Precio en CLP como string entero, sin decimales (ej. "12990") */
  price: string
  regular_price: string
  sale_price: string
  currency_code?: string
  currency_minor_unit?: number
}

export interface Product {
  id: number
  name: string
  slug: string
  prices: ProductPrices
  images: ProductImage[]
  categories: ProductCategoryRef[]
  short_description: string
  description: string
  is_in_stock: boolean
  featured: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  image: ProductImage | null
}

export type ProductSort = 'default' | 'price-asc' | 'price-desc'

export interface ProductQuery {
  category?: string
  search?: string
  featured?: boolean
  sort?: ProductSort
}

export interface CartItem {
  product: Product
  quantity: number
}
