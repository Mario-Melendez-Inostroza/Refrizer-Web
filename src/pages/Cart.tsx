import { Link } from 'react-router'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { formatCLP, priceOf } from '@/lib/format'
import { site } from '@/config/site'
import PageHeader from '@/components/PageHeader'

export default function Cart() {
  const { items, subtotal, update, remove } = useCart()
  return (
    <>
      <PageHeader title="Carrito" />
      <section className="bg-surface py-10">
        <div className="container-x">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <ShoppingCart className="mx-auto size-10 text-brand" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-navy-900">Tu carrito está vacío</h2>
              <p className="mt-2 text-muted">Explora nuestros productos y agrega lo que necesites.</p>
              <Link to="/productos" className="btn-orange mt-6">Ver productos</Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <ul className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
                    <img src={product.images[0]?.thumbnail ?? product.images[0]?.src} alt={product.images[0]?.alt ?? product.name} className="size-20 shrink-0 rounded-lg object-cover sm:size-24" />
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <Link to={`/producto/${product.slug}`} className="font-semibold text-ink hover:text-brand">{product.name}</Link>
                        <p className="text-sm text-muted">{formatCLP(product.prices.price)} c/u</p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center rounded-lg border border-line">
                          <button onClick={() => update(product.id, quantity - 1)} className="grid size-9 place-items-center hover:text-brand" aria-label={`Disminuir cantidad de ${product.name}`}><Minus className="size-3.5" /></button>
                          <span className="w-8 text-center text-sm font-semibold" aria-label="Cantidad">{quantity}</span>
                          <button onClick={() => update(product.id, quantity + 1)} className="grid size-9 place-items-center hover:text-brand" aria-label={`Aumentar cantidad de ${product.name}`}><Plus className="size-3.5" /></button>
                        </div>
                        <p className="w-24 text-right font-display font-bold text-navy-900">{formatCLP(priceOf(product) * quantity)}</p>
                        <button onClick={() => remove(product.id)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${product.name}`}><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <aside className="h-fit rounded-2xl border border-line bg-white p-6">
                <h2 className="text-lg font-semibold text-navy-900">Resumen</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold">{formatCLP(subtotal)}</dd></div>
                </dl>
                <div className="mt-4 flex justify-between border-t border-line pt-4"><span className="font-semibold">Total</span><span className="font-display text-xl font-bold text-navy-900">{formatCLP(subtotal)}</span></div>
                <p className="mt-3 text-xs text-muted">{site.delivery.text}.</p>
                <Link to="/checkout" className="btn-orange mt-5 w-full">Continuar con la compra</Link>
                <Link to="/productos" className="mt-3 block text-center text-sm font-medium text-brand hover:underline">Seguir comprando</Link>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
