import { Link } from 'react-router'
import { ShoppingCart } from 'lucide-react'
import type { Product } from '@/types'
import { formatCLP } from '@/lib/format'
import { placeholder } from '@/lib/placeholder'
import { useCart } from '@/lib/cart'

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const img = product.images[0]
  const onSale = product.prices.sale_price && product.prices.sale_price !== product.prices.regular_price
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_6px_24px_-12px_rgba(11,37,87,0.18)] transition-shadow hover:shadow-[0_14px_34px_-14px_rgba(11,37,87,0.3)]">
      <Link to={`/producto/${product.slug}`} className="relative block overflow-hidden rounded-xl bg-surface">
        <img src={img?.src ?? placeholder()} alt={img?.alt ?? product.name} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
        {!product.is_in_stock && <span className="absolute left-2 top-2 rounded-md bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white">Sin stock</span>}
        {onSale && product.is_in_stock && <span className="absolute left-2 top-2 rounded-md bg-orange px-2 py-1 text-[11px] font-semibold text-white">Oferta</span>}
      </Link>
      <h3 className="mt-4 line-clamp-2 min-h-[2.75rem] font-sans text-sm font-semibold leading-snug text-ink">
        <Link to={`/producto/${product.slug}`} className="hover:text-brand">{product.name}</Link>
      </h3>
      <div className="mt-1 flex flex-1 items-start gap-2">
        <p className="font-display text-lg font-bold text-navy-900">{formatCLP(product.prices.price)}</p>
        {onSale && <p className="mt-1.5 text-xs text-muted line-through">{formatCLP(product.prices.regular_price)}</p>}
      </div>
      <button onClick={() => add(product)} disabled={!product.is_in_stock} className="btn-orange mt-3.5 w-full py-2.5 text-[13px]">
        <ShoppingCart className="size-4" aria-hidden="true" />
        {product.is_in_stock ? 'Agregar al carrito' : 'Sin stock'}
      </button>
    </article>
  )
}
