import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link } from 'react-router'
import { Lock, Truck } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { formatCLP } from '@/lib/format'
import { REGIONES, formatRut, isValidRut } from '@/lib/chile'
import { createCheckout } from '@/services'
import { site } from '@/config/site'
import PageHeader from '@/components/PageHeader'
import { useSeo } from '@/lib/useSeo'
import { seoPrivate } from '@/config/seo'

type Form = { nombre: string; rut: string; email: string; telefono: string; region: string; comuna: string; direccion: string; notas: string; entrega: 'despacho' | 'retiro' }
const empty: Form = { nombre: '', rut: '', email: '', telefono: '', region: '', comuna: '', direccion: '', notas: '', entrega: 'despacho' }

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.nombre.trim().split(/\s+/).length < 2) e.nombre = 'Ingresa tu nombre y apellido'
  if (!isValidRut(f.rut)) e.rut = 'RUT inválido'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Correo inválido'
  if (f.telefono.replace(/\D/g, '').length < 8) e.telefono = 'Teléfono inválido'
  // Con retiro en Peñaflor no se pide dirección.
  if (f.entrega === 'despacho') {
    if (!f.region) e.region = 'Selecciona una región'
    if (!f.comuna) e.comuna = 'Selecciona una comuna'
    if (!f.direccion.trim()) e.direccion = 'Ingresa tu dirección'
  }
  return e
}

export default function Checkout() {
  useSeo(seoPrivate.checkout)
  const { items, subtotal, loading } = useCart()
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [payError, setPayError] = useState('')

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v, ...(k === 'region' ? { comuna: '' } : {}) }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    setPayError('')
    setSubmitting(true)
    try {
      // WooCommerce pide nombre y apellido por separado: la primera palabra es el nombre y el resto el apellido.
      const [firstName, ...rest] = form.nombre.trim().split(/\s+/)
      const retiro = form.entrega === 'retiro'
      const shipping = retiro
        ? { region: site.pickup.region, commune: site.pickup.commune, address: `Retiro en ${site.pickup.commune} (sin despacho)` }
        : { region: form.region, commune: form.comuna, address: form.direccion.trim() }
      const entregaNota = retiro ? `Entrega: retiro en ${site.pickup.commune}` : 'Entrega: despacho a coordinar'
      const { redirectUrl } = await createCheckout({
        customer: { firstName, lastName: rest.join(' '), email: form.email.trim(), phone: form.telefono.trim(), rut: form.rut },
        shipping,
        notes: [entregaNota, form.notas.trim()].filter(Boolean).join('\n'),
        expectedTotal: subtotal,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      })
      window.location.assign(redirectUrl)
    } catch (err) {
      setPayError(err instanceof Error && err.message ? err.message : 'No pudimos iniciar el pago. Inténtalo nuevamente.')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="container-x py-24 text-center text-muted" role="status">Cargando tu carrito…</div>

  if (items.length === 0)
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold text-navy-900">No hay productos en tu carrito</h1>
        <Link to="/productos" className="btn-orange mt-6">Ver productos</Link>
      </div>
    )

  const field = (k: keyof Form, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={k} className="label">{label}</label>
      <input id={k} value={form[k]} onChange={(e) => set(k, k === 'rut' ? formatRut(e.target.value) : e.target.value)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} className={`input ${errors[k] ? 'border-red-500' : ''}`} {...props} />
      {errors[k] && <p id={`${k}-err`} className="mt-1 text-xs text-red-600">{errors[k]}</p>}
    </div>
  )

  return (
    <>
      <PageHeader eyebrow="Checkout" title="Finalizar compra" />
      <section className="bg-surface py-10">
        <form onSubmit={submit} noValidate className="container-x grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-navy-900">Datos de contacto y entrega</h2>
            <p className="mt-1 text-sm text-muted">Usaremos tus datos solo para coordinar la entrega contigo. No se cobra envío por la página.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('nombre', 'Nombre completo', { autoComplete: 'name' })}</div>
              {field('rut', 'RUT', { placeholder: '12.345.678-9', inputMode: 'text' })}
              {field('telefono', 'Teléfono', { type: 'tel', placeholder: '+56 9 1234 5678', autoComplete: 'tel' })}
              <div className="sm:col-span-2">{field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email' })}</div>
              <fieldset className="sm:col-span-2">
                <legend className="label">¿Cómo quieres recibir tu compra?</legend>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  {([['despacho', 'Despacho a Santiago y regiones', 'Coordinamos el despacho contigo después del pago.'], ['retiro', `Retiro en ${site.pickup.commune}`, 'Sin dirección: te contactamos para coordinar el retiro.']] as const).map(([v, t, d]) => (
                    <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm ${form.entrega === v ? 'border-brand bg-surface' : 'border-line'}`}>
                      <input type="radio" name="entrega" value={v} checked={form.entrega === v} onChange={() => set('entrega', v)} className="mt-1" />
                      <span><strong className="block text-ink">{t}</strong><span className="text-muted">{d}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.entrega === 'despacho' && (<>
              <div>
                <label htmlFor="region" className="label">Región</label>
                <select id="region" value={form.region} onChange={(e) => set('region', e.target.value)} aria-invalid={!!errors.region} className={`input ${errors.region ? 'border-red-500' : ''}`}>
                  <option value="">Selecciona…</option>
                  {Object.keys(REGIONES).map((r) => <option key={r}>{r}</option>)}
                </select>
                {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
              </div>
              <div>
                <label htmlFor="comuna" className="label">Comuna</label>
                <select id="comuna" value={form.comuna} disabled={!form.region} onChange={(e) => set('comuna', e.target.value)} aria-invalid={!!errors.comuna} className={`input disabled:bg-surface ${errors.comuna ? 'border-red-500' : ''}`}>
                  <option value="">Selecciona…</option>
                  {(REGIONES[form.region] ?? []).map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.comuna && <p className="mt-1 text-xs text-red-600">{errors.comuna}</p>}
              </div>
              <div className="sm:col-span-2">{field('direccion', 'Dirección', { placeholder: 'Calle, número, depto.', autoComplete: 'street-address' })}</div>
              </>)}
              <div className="sm:col-span-2">
                <label htmlFor="notas" className="label">Notas del pedido <span className="font-normal text-muted">(opcional)</span></label>
                <textarea id="notas" rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} className="input" placeholder="Indicaciones adicionales" />
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface p-4 text-sm">
              <Truck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
              <p><strong>{site.delivery.text}.</strong> <span className="text-muted">{site.delivery.detail}</span></p>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-white p-6">
            <h2 className="text-lg font-semibold text-navy-900">Tu pedido</h2>
            <ul className="mt-4 divide-y divide-line text-sm">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between gap-3 py-2.5">
                  <span className="text-muted"><span className="text-ink">{product.name}</span> × {quantity}</span>
                  <span className="shrink-0 font-semibold">{formatCLP(parseInt(product.prices.price) * quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-4"><span className="font-semibold">Total</span><span className="font-display text-xl font-bold text-navy-900">{formatCLP(subtotal)}</span></div>
            {payError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{payError}</p>}
            <button type="submit" disabled={submitting} className="btn mt-6 w-full bg-[#009ee3] py-3.5 text-white hover:bg-[#0089c5] disabled:opacity-60">{submitting ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}</button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" aria-hidden="true" />Pago seguro procesado por Mercado Pago</p>
          </aside>
        </form>
      </section>
    </>
  )
}
