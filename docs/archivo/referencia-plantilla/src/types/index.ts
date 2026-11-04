export type StockStatus = 'instock' | 'outofstock' | 'lowstock'

export interface ProductImage { src: string; alt: string }
export interface Category { id: number; name: string; slug: string; description?: string; image?: ProductImage }

export interface Product {
  id: number
  name: string
  slug: string
  shortDescription: string
  description: string
  /** Precio vigente (CLP, entero) */
  price: number
  regularPrice: number
  salePrice: number | null
  images: ProductImage[]
  categories: Pick<Category, 'id' | 'name' | 'slug'>[]
  stockStatus: StockStatus
  stockQuantity: number | null
  featured?: boolean
}

export type SortOrder = 'relevance' | 'price-asc' | 'price-desc'

export interface ProductQuery {
  category?: string
  search?: string
  sort?: SortOrder
  featured?: boolean
  ids?: number[]
}

export type ShippingMethod = 'pickup' | 'delivery'

export interface CheckoutPayload {
  customer: { firstName: string; lastName: string; email: string; phone: string; rut: string }
  shipping: { method: ShippingMethod; region: string; commune: string; address: string }
  notes: string
  /** Total que el comprador vio (CLP). WooCommerce rechaza el checkout si su total no coincide (expected_total). */
  expectedTotal: number
  /** Solo id + cantidad: el backend calcula precios */
  items: { productId: number; quantity: number }[]
}

export interface CheckoutResponse { redirectUrl: string }

export type OrderStatus = 'pending' | 'paid' | 'failed'
export interface OrderStatusResponse { id: string; status: OrderStatus }
