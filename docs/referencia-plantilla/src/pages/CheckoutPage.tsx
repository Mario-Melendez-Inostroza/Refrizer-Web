import { Loader2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { site } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { useCart } from '../hooks/useCart'
import { useCartProducts } from '../hooks/useCartProducts'
import { useSeo } from '../hooks/useSeo'
import { formatPrice } from '../lib/format'
import { REGIONS } from '../lib/regions'
import { formatRut, isValidRut } from '../lib/rut'
import { createCheckout, getShippingOptions } from '../services'
import type { ShippingMethod } from '../types'

type Form = { firstName: string; lastName: string; email: string; phone: string; rut: string; region: string; commune: string; address: string; notes: string }
const EMPTY: Form = { firstName: '', lastName: '', email: '', phone: '', rut: '', region: '', commune: '', address: '', notes: '' }

function validate(f: Form, method: ShippingMethod) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (!f.firstName.trim()) e.firstName = 'Ingresa tu nombre.'
  if (!f.lastName.trim()) e.lastName = 'Ingresa tu apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Ingresa un correo válido, ej: nombre@correo.cl'
  if (!/^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/.test(f.phone.replace(/[-\s]/g, '').replace(/^(\+?56)?/, '$1'))) e.phone = 'Ingresa un celular chileno, ej: +56 9 1234 5678'
  if (!isValidRut(f.rut)) e.rut = 'RUT inválido. Formato: 12.345.678-5'
  // Con despacho desactivado no hay retiro: siempre se piden región, comuna y dirección para coordinar la entrega.
  if (!site.shipping.enabled || method === 'delivery') {
    if (!f.region) e.region = 'Selecciona una región.'
    if (!f.commune) e.commune = 'Selecciona una comuna.'
    if (f.address.trim().length < 5) e.address = 'Ingresa calle, número y depto si aplica.'
  }
  return e
}

function Field({ id, label, error, children, className = '' }: { id: string; label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

export default function CheckoutPage() {
  useSeo('Checkout', 'Completa tus datos y paga con Mercado Pago.')
  const { lines } = useCart()
  const cart = useCartProducts()
  const shippingOn: boolean = site.shipping.enabled
  const ship = useAsync(() => (shippingOn ? getShippingOptions() : Promise.resolve([])), [])
  const [f, setF] = useState<Form>(EMPTY)
  const [method, setMethod] = useState<ShippingMethod>('delivery')
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const shipCost = shippingOn ? (ship.data?.find((s) => s.id === method)?.cost ?? 0) : 0
  const askAddress = !shippingOn || method === 'delivery'
  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    setF((p) => ({ ...p, [k]: e.target.value, ...(k === 'region' ? { commune: '' } : {}) }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }))
  }
  const aria = (k: keyof Form) => ({ id: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined, className: `field ${errors[k] ? 'border-danger' : ''}` })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(f, method)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    setSubmitting(true); setSubmitError('')
    try {
      const { redirectUrl } = await createCheckout({
        customer: { firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone, rut: formatRut(f.rut) },
        shipping: { method, region: f.region, commune: f.commune, address: f.address },
        notes: f.notes,
        expectedTotal: cart.subtotal + shipCost,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      window.location.assign(redirectUrl)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No pudimos iniciar el pago.')
      setSubmitting(false)
    }
  }

  if (!lines.length) return <div className="wrap"><EmptyState title="No hay nada que pagar" action={<Link to="/catalogo" className="underline">Ir a la tienda</Link>} /></div>

  return (
    <>
      <PageHeader eyebrow="Compra como invitado" title="Checkout" />
      <form noValidate onSubmit={submit} className="wrap grid gap-12 py-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 font-display text-3xl">1. Tus datos</legend>
            <Field id="firstName" label="Nombre" error={errors.firstName}><input {...aria('firstName')} value={f.firstName} onChange={set('firstName')} autoComplete="given-name" /></Field>
            <Field id="lastName" label="Apellido" error={errors.lastName}><input {...aria('lastName')} value={f.lastName} onChange={set('lastName')} autoComplete="family-name" /></Field>
            <Field id="email" label="Correo" error={errors.email}><input {...aria('email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field id="phone" label="Teléfono" error={errors.phone}><input {...aria('phone')} type="tel" value={f.phone} onChange={set('phone')} placeholder="+56 9 1234 5678" autoComplete="tel" /></Field>
            <Field id="rut" label="RUT" error={errors.rut}><input {...aria('rut')} value={f.rut} onChange={set('rut')} onBlur={() => f.rut && setF((p) => ({ ...p, rut: formatRut(p.rut) }))} placeholder="12.345.678-5" /></Field>
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-display text-3xl">2. Datos de contacto y entrega</legend>
            {!shippingOn ? (
              site.shipping.coordinationText && <p className="rounded-card bg-paper-2 p-4 text-sm text-ink-soft">{site.shipping.coordinationText}</p>
            ) : ship.error ? <ErrorState onRetry={ship.retry} /> : !ship.data ? <Skeleton className="h-36" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ship.data.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer gap-3 rounded-card border p-4 ${method === s.id ? 'border-ink bg-paper-2' : 'border-line'}`}>
                    <input type="radio" name="method" checked={method === s.id} onChange={() => setMethod(s.id)} className="mt-1 accent-[var(--color-accent)]" />
                    <span className="flex-1">
                      <span className="flex justify-between font-semibold"><span>{s.label}</span><span className="tabular-nums">{s.cost ? formatPrice(s.cost) : 'Gratis'}</span></span>
                      <span className="text-sm text-ink-soft">{s.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {askAddress && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="region" label="Región" error={errors.region}>
                  <select {...aria('region')} value={f.region} onChange={set('region')}><option value="">Selecciona…</option>{Object.keys(REGIONS).map((r) => <option key={r}>{r}</option>)}</select>
                </Field>
                <Field id="commune" label="Comuna" error={errors.commune}>
                  <select {...aria('commune')} value={f.commune} onChange={set('commune')} disabled={!f.region}><option value="">Selecciona…</option>{(REGIONS[f.region] ?? []).map((c) => <option key={c}>{c}</option>)}</select>
                </Field>
                <Field id="address" label="Dirección" error={errors.address} className="sm:col-span-2"><input {...aria('address')} value={f.address} onChange={set('address')} autoComplete="street-address" placeholder="Calle, número, depto." /></Field>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-display text-3xl">3. Notas del pedido</legend>
            <label htmlFor="notes" className="sr-only">Notas</label>
            <textarea id="notes" rows={3} value={f.notes} onChange={set('notes')} placeholder="Molienda, horario de entrega, etc. (opcional)" className="field" />
          </fieldset>
        </div>

        <aside className="h-fit rounded-card bg-paper-2 p-6 lg:sticky lg:top-28">
          <h2 className="mb-4 font-display text-3xl">Resumen</h2>
          {cart.error ? <ErrorState onRetry={cart.retry} /> : cart.loading ? <Skeleton className="h-32" /> : (
            <ul className="divide-y divide-line">
              {cart.items.map((i) => (
                <li key={i.product.id} className="flex items-center gap-3 py-3">
                  <img src={i.product.images[0]?.src} alt={i.product.images[0]?.alt} className="size-12 rounded-card object-cover" />
                  <span className="flex-1 text-sm">{i.product.name} <span className="text-ink-soft">× {i.line.quantity}</span></span>
                  <span className="text-sm tabular-nums">{formatPrice(i.product.price * i.line.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd></div>
            {shippingOn && <div className="flex justify-between"><dt>Despacho</dt><dd className="tabular-nums">{shipCost ? formatPrice(shipCost) : 'Gratis'}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(cart.subtotal + shipCost)}</dd></div>
          </dl>
          {submitError && <p role="alert" className="mt-4 text-sm text-danger">{submitError}</p>}
          <button type="submit" disabled={submitting || cart.loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill bg-[#009ee3] py-4 text-sm font-bold text-white hover:brightness-95 disabled:opacity-60">
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Redirigiendo…</> : 'Pagar con Mercado Pago'}
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
        </aside>
      </form>
    </>
  )
}
