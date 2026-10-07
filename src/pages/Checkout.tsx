import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router'
import { Lock, Truck } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { formatCLP } from '@/lib/format'
import { REGIONES, formatRut, isValidRut } from '@/lib/chile'
import { site } from '@/config/site'
import PageHeader from '@/components/PageHeader'

type Form = { nombre: string; rut: string; email: string; telefono: string; region: string; comuna: string; direccion: string; notas: string }
const empty: Form = { nombre: '', rut: '', email: '', telefono: '', region: '', comuna: '', direccion: '', notas: '' }

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (!f.nombre.trim()) e.nombre = 'Ingresa tu nombre completo'
  if (!isValidRut(f.rut)) e.rut = 'RUT inválido'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Correo inválido'
  if (f.telefono.replace(/\D/g, '').length < 8) e.telefono = 'Teléfono inválido'
  if (!f.region) e.region = 'Selecciona una región'
  if (!f.comuna) e.comuna = 'Selecciona una comuna'
  if (!f.direccion.trim()) e.direccion = 'Ingresa tu dirección'
  return e
}

export default function Checkout() {
  const { items, subtotal } = useCart()
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const navigate = useNavigate()

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v, ...(k === 'region' ? { comuna: '' } : {}) }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    // TODO: crear preferencia de Mercado Pago y redirigir a init_point.
    navigate('/pedido/retorno?status=pending')
  }

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
            <h2 className="text-lg font-semibold text-navy-900">Datos del cliente</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('nombre', 'Nombre completo', { autoComplete: 'name' })}</div>
              {field('rut', 'RUT', { placeholder: '12.345.678-9', inputMode: 'text' })}
              {field('telefono', 'Teléfono', { type: 'tel', placeholder: '+56 9 1234 5678', autoComplete: 'tel' })}
              <div className="sm:col-span-2">{field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email' })}</div>
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
            <button type="submit" className="btn mt-6 w-full bg-[#009ee3] py-3.5 text-white hover:bg-[#0089c5]">Pagar con Mercado Pago</button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" aria-hidden="true" />Pago seguro procesado por Mercado Pago</p>
          </aside>
        </form>
      </section>
    </>
  )
}
