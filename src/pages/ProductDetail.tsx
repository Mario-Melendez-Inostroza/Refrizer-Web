import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, ChevronRight, Minus, Plus, ShoppingCart, Truck, X } from 'lucide-react'
import { getProduct } from '@/services'
import { useAsync } from '@/lib/useAsync'
import { formatCLP } from '@/lib/format'
import { useCart } from '@/lib/cart'
import { site } from '@/config/site'

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const { data: product, loading } = useAsync(() => getProduct(slug), [slug])
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { add } = useCart()

  if (loading) return <div className="container-x py-20"><div className="h-96 animate-pulse rounded-2xl bg-surface" /></div>
  if (!product)
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Producto no encontrado</h1>
        <Link to="/productos" className="btn-orange mt-6">Volver a productos</Link>
      </div>
    )

  const img = product.images[active] ?? product.images[0]
  const onSale = product.prices.sale_price && product.prices.sale_price !== product.prices.regular_price
  const handleAdd = () => {
    add(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div className="bg-surface pb-16">
      <nav aria-label="Ruta" className="container-x flex flex-wrap items-center gap-1 py-5 text-sm text-muted">
        <Link to="/" className="hover:text-brand">Inicio</Link><ChevronRight className="size-3.5" aria-hidden="true" />
        <Link to="/productos" className="hover:text-brand">Productos</Link><ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-ink" aria-current="page">{product.name}</span>
      </nav>
      <div className="container-x grid gap-8 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {img && <img src={img.src} alt={img.alt} className="aspect-square w-full object-cover" />}
          </div>
          {product.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((im, i) => (
                <li key={im.id}>
                  <button onClick={() => setActive(i)} aria-label={`Ver imagen ${i + 1}`} aria-current={i === active} className={`block overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand' : 'border-transparent'}`}>
                    <img src={im.thumbnail ?? im.src} alt="" className="aspect-square w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <p className="eyebrow">{product.categories.map((c) => c.name).join(' · ')}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-navy-900 sm:text-3xl">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-3xl font-bold text-navy-900">{formatCLP(product.prices.price)}</p>
            {onSale && <p className="text-muted line-through">{formatCLP(product.prices.regular_price)}</p>}
          </div>
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${product.is_in_stock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {product.is_in_stock ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
            {product.is_in_stock ? 'En stock' : 'Sin stock'}
          </p>
          <div className="prose-sm mt-5 text-muted [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: product.short_description }} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-line">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center hover:text-brand" aria-label="Disminuir cantidad"><Minus className="size-4" /></button>
              <label htmlFor="qty" className="sr-only">Cantidad</label>
              <input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 border-x border-line py-2.5 text-center text-sm font-semibold focus:outline-none" />
              <button onClick={() => setQty((q) => q + 1)} className="grid size-11 place-items-center hover:text-brand" aria-label="Aumentar cantidad"><Plus className="size-4" /></button>
            </div>
            <button onClick={handleAdd} disabled={!product.is_in_stock} className="btn-orange flex-1 py-3.5">
              {added ? <Check className="size-4" aria-hidden="true" /> : <ShoppingCart className="size-4" aria-hidden="true" />}
              {added ? 'Agregado' : 'Agregar al carrito'}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">{added ? 'Producto agregado al carrito' : ''}</p>
          {added && <Link to="/carrito" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Ir al carrito →</Link>}

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface p-4 text-sm">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <p><strong className="text-ink">{site.delivery.text}.</strong> <span className="text-muted">{site.delivery.detail}</span></p>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-navy-900">Descripción</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        </div>
      </div>
    </div>
  )
}
