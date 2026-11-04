import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { site } from '@/config/site'
import { useCart } from '@/lib/cart'
import { whatsappUrl } from '@/lib/format'
import { returnedRejected, returnedWithoutPayment } from '@/lib/return'
import { getOrderStatus, hasOrderAccess, lastOrderId, orderIdFromReference, reconcileSaysPaid, requestReconcile } from '@/services/orders'
import type { OrderStatus } from '@/types'

const STATES = {
  paid: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', title: '¡Pago recibido!', text: `Gracias por tu compra. ${site.delivery.text}: te escribiremos pronto con los detalles.` },
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', title: 'Pago pendiente de confirmación', text: 'Mercado Pago aún no confirma tu pago. Puede tardar un par de minutos; no cierres esta página.' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', title: 'No pudimos procesar el pago', text: 'No se realizó ningún cargo. Tu carrito sigue guardado para que lo intentes nuevamente.' },
}

/** Aviso de pago (IPN) medido: 1 s a 2 min 4 s. Se consulta cada 4 s el primer minuto y cada 10 s hasta completar 5 min. */
const POLL_FAST_MS = 60_000
const POLL_TOTAL_MS = 300_000
const TIMED_OUT_TEXT = 'Tu pago está siendo confirmado, te avisaremos por correo.'
/** Volvió de Mercado Pago sin pagar (el query solo elige el texto; el estado real sale del servidor). */
const REJECTED = { title: 'Tu pago fue rechazado', text: 'No se realizó ningún cargo. Tu carrito sigue guardado: puedes intentarlo nuevamente con otra tarjeta u otro medio de pago.' }
const NO_PAYMENT = { title: 'Todavía no registramos tu pago.', text: 'Si ya pagaste, espera unos minutos y pulsa "Actualizar estado". Si no, puedes intentarlo nuevamente.' }

export default function PaymentReturn() {
  const [query] = useSearchParams()
  // Mercado Pago vuelve a una URL fija con external_reference = prefijo + id del pedido. Si falta o no cuadra, se usa
  // el último pedido creado en este navegador. status, payment_id y collection_status los controla el comprador: solo
  // eligen el texto "sin pagar", nunca el estado.
  const id = orderIdFromReference(query.get('external_reference')) ?? lastOrderId() ?? ''
  const { clear } = useCart()
  const clearRef = useRef(clear)
  clearRef.current = clear

  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [error, setError] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await getOrderStatus(id)
      setStatus(res.status)
      setError(false)
    } catch {
      setError(true)
    }
  }, [id])

  useEffect(() => {
    if (id) void refresh()
  }, [id, refresh])

  useEffect(() => {
    if (status === 'paid') clearRef.current()
  }, [status])

  // Pendiente: se consulta durante 5 min desde la primera respuesta pendiente; luego solo el botón "Actualizar estado".
  useEffect(() => {
    if (status !== 'pending') {
      setTimedOut(false)
      return
    }
    const start = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const elapsed = Date.now() - start
      if (elapsed >= POLL_TOTAL_MS) return setTimedOut(true)
      void refresh()
      timer = setTimeout(tick, elapsed < POLL_FAST_MS ? 4000 : 10_000)
    }
    timer = setTimeout(tick, 4000)
    return () => clearTimeout(timer)
  }, [status, refresh])

  // Agotados los 5 min aún pendiente: una sola conciliación (el servidor consulta a Mercado Pago). Solo si responde
  // pagado se vuelve a consultar; en cualquier otro caso queda el texto "te avisaremos por correo" y el cron lo cubre.
  const reconciledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!timedOut || !id || reconciledFor.current === id) return
    reconciledFor.current = id
    void requestReconcile(id).then((code) => {
      if (reconcileSaysPaid(code)) void refresh()
    })
  }, [timedOut, id, refresh])

  const shell = (children: React.ReactNode) => (
    <section className="bg-surface py-16 sm:py-24">
      <div className="container-x max-w-xl">{children}</div>
    </section>
  )

  // Sin pedido, o abierto desde otro navegador (falta su order_key): no se puede consultar el estado.
  if (!id || !hasOrderAccess(id)) {
    return shell(
      <div className="rounded-2xl border border-line bg-white p-8 text-center sm:p-10" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-8" aria-hidden="true" /></span>
        <h1 className="mt-5 text-2xl font-bold text-navy-900">{id ? 'Recibimos tu pedido' : 'No encontramos tu pedido'}</h1>
        <p className="mt-3 text-muted">{id ? 'Te contactaremos por correo.' : 'Si ya pagaste, te contactaremos por correo.'}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/productos" className="btn-orange">Seguir comprando</Link>
          <a href={whatsappUrl(site.whatsapp.number, 'Hola, tengo una consulta sobre mi pedido.')} target="_blank" rel="noreferrer" className="btn-outline">Contactar por WhatsApp</a>
        </div>
      </div>,
    )
  }

  if (status === null) {
    return shell(
      <div className="rounded-2xl border border-line bg-white p-8 text-center sm:p-10" role="status">
        <p className="text-muted">{error ? 'No pudimos consultar tu pedido.' : 'Consultando tu pago…'}</p>
        {error && <button type="button" onClick={() => void refresh()} className="btn-orange mt-6">Reintentar</button>}
      </div>,
    )
  }

  const noPayment = status === 'pending' && returnedWithoutPayment(query)
  const rejected = status === 'pending' && returnedRejected(query)
  const st = STATES[status]
  const I = st.icon
  return shell(
    <div className="rounded-2xl border border-line bg-white p-8 text-center sm:p-10" role="status">
      <span className={`mx-auto grid size-16 place-items-center rounded-full ${st.color}`}><I className="size-8" aria-hidden="true" /></span>
      <h1 className="mt-5 text-2xl font-bold text-navy-900">{rejected ? REJECTED.title : noPayment ? NO_PAYMENT.title : st.title}</h1>
      <p className="mt-3 text-muted">{rejected ? REJECTED.text : noPayment ? NO_PAYMENT.text : status === 'pending' && timedOut ? TIMED_OUT_TEXT : st.text}</p>
      <p className="mt-3 text-xs text-muted">Pedido N° {id}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {(status === 'failed' || noPayment || rejected) && <Link to="/checkout" className="btn-orange">Reintentar pago</Link>}
        {status === 'pending' && !rejected && <button type="button" onClick={() => void refresh()} className="btn-orange">Actualizar estado</button>}
        {status === 'paid' && <Link to="/productos" className="btn-orange">Seguir comprando</Link>}
        <a href={whatsappUrl(site.whatsapp.number, 'Hola, tengo una consulta sobre mi pedido.')} target="_blank" rel="noreferrer" className="btn-outline">Contactar por WhatsApp</a>
      </div>
    </div>,
  )
}
