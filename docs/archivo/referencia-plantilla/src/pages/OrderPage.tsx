import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ErrorState, Skeleton } from '../components/ui/States'
import { site } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { useCart } from '../hooks/useCart'
import { useSeo } from '../hooks/useSeo'
import { returnedWithoutPayment } from '../lib/return'
import { getOrderStatus, hasOrderAccess, lastOrderId, orderIdFromReference, reconcileSaysPaid, requestReconcile } from '../services'

const UI = {
  paid: { Icon: CheckCircle2, tone: 'bg-ok', eyebrow: 'Pagado', title: site.delivery.paidTitle, text: site.delivery.paidText },
  pending: { Icon: Clock, tone: 'bg-warn', eyebrow: 'Pago pendiente', title: 'Estamos esperando la confirmación.', text: 'Mercado Pago aún no confirma tu pago. Puede tardar un par de minutos; no cierres esta página.' },
  failed: { Icon: XCircle, tone: 'bg-danger', eyebrow: 'Pago fallido', title: 'No pudimos procesar el pago.', text: 'No se realizó ningún cargo. Tu carrito sigue guardado para que lo intentes nuevamente.' },
}

/** Aviso de pago (IPN) medido: 1 s a 2 min 4 s. Se consulta cada 4 s el primer minuto y cada 10 s hasta completar 5 min. */
const POLL_FAST_MS = 60_000
const POLL_TOTAL_MS = 300_000
const TIMED_OUT_TEXT = 'Tu pago está siendo confirmado, te avisaremos por correo.'
/** Volvió de Mercado Pago sin pagar (el query solo elige el texto; el estado real sale del servidor). */
const NO_PAYMENT = { title: 'Todavía no registramos tu pago.', text: 'Si ya pagaste, espera unos minutos y pulsa "Actualizar estado". Si no, puedes intentarlo nuevamente.' }

export default function OrderPage() {
  const { id: param = '' } = useParams()
  const [query] = useSearchParams()
  // Mercado Pago vuelve a una URL fija (/pedido/retorno) con external_reference = prefijo + id del pedido.
  // Si falta o no cuadra, se usa el último pedido creado en este navegador.
  // Los demás parámetros del query (status, payment_id, collection_status) los controla el comprador: no se leen.
  const isReturn = param === 'retorno'
  const id = isReturn ? (orderIdFromReference(query.get('external_reference')) ?? lastOrderId() ?? '') : param
  const { data, loading, error, retry } = useAsync(() => getOrderStatus(id), [id])
  const { clear } = useCart()
  useSeo(`Pedido #${id}`, 'Estado de tu pedido.')
  useEffect(() => {
    if (data?.status === 'paid') clear()
  }, [data?.status, clear])
  // Mientras esté pendiente se consulta (siempre con parámetro único, ver getOrderStatus) durante 5 min desde la primera
  // respuesta pendiente. Pasado ese tiempo se deja de consultar; el botón "Actualizar estado" sigue disponible.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (data?.status !== 'pending') {
      setTimedOut(false)
      return
    }
    const start = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const elapsed = Date.now() - start
      if (elapsed >= POLL_TOTAL_MS) return setTimedOut(true)
      retry()
      timer = setTimeout(tick, elapsed < POLL_FAST_MS ? 4000 : 10_000)
    }
    timer = setTimeout(tick, 4000)
    return () => clearTimeout(timer)
  }, [data?.status, retry])

  // Agotados los 5 min con el pedido aún pendiente: una sola llamada a la conciliación del plugin (el servidor comprueba
  // el pago en Mercado Pago). Solo si responde que el pedido quedó pagado se vuelve a consultar el estado; con pending,
  // try_later, not_found o un error se mantiene el texto de "te avisaremos por correo" (el cron sigue cubriendo el pedido).
  // Una vez por pedido y carga de página.
  const reconciledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!timedOut || !id || reconciledFor.current === id) return
    reconciledFor.current = id
    requestReconcile(id).then((code) => {
      if (reconcileSaysPaid(code)) retry()
    })
  }, [timedOut, id, retry])

  // Retorno desde otro navegador: el pedido existe pero aquí no está su order_key, así que no se puede consultar el estado.
  if (isReturn && id && !hasOrderAccess(id)) {
    return (
      <section className="wrap max-w-3xl py-16 md:py-24">
        <div className="rounded-card bg-ink p-8 text-paper md:p-12">
          <CheckCircle2 className="size-10" strokeWidth={1.4} />
          <h1 className="mt-6 font-display text-5xl leading-[0.95] md:text-6xl">Recibimos tu pedido</h1>
          <p className="mt-4 max-w-lg opacity-90">Te contactaremos por correo.</p>
        </div>
        <div className="mt-8"><Link to="/catalogo" className="rounded-pill border border-ink px-6 py-3.5 text-sm font-semibold">Seguir comprando</Link></div>
      </section>
    )
  }
  if (error) return <div className="wrap py-16"><ErrorState message="No encontramos este pedido." onRetry={retry} /></div>
  if (!data) return <div className="wrap max-w-2xl py-20"><Skeleton className="h-72" /></div>

  const s = UI[data.status]
  const noPayment = isReturn && data.status === 'pending' && returnedWithoutPayment(query)
  return (
    <section className="wrap max-w-3xl py-16 md:py-24">
      <div className={`${s.tone} rounded-card p-8 text-paper md:p-12`}>
        <s.Icon className="size-10" strokeWidth={1.4} />
        <p className="eyebrow mt-6 opacity-80">{s.eyebrow} · Pedido #{data.id}</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] md:text-6xl">{noPayment ? NO_PAYMENT.title : s.title}</h1>
        <p className="mt-4 max-w-lg opacity-90">{noPayment ? NO_PAYMENT.text : data.status === 'pending' && timedOut ? TIMED_OUT_TEXT : s.text}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {(data.status === 'failed' || noPayment) && <Link to="/checkout" className="rounded-pill bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink">Reintentar pago</Link>}
        {data.status === 'pending' && <button onClick={retry} className="rounded-pill bg-ink px-6 py-3.5 text-sm font-semibold text-paper">Actualizar estado</button>}
        <Link to="/catalogo" className="rounded-pill border border-ink px-6 py-3.5 text-sm font-semibold">Seguir comprando</Link>
        <Link to="/contacto" className="px-2 py-3.5 text-sm underline underline-offset-4">¿Necesitas ayuda?</Link>
      </div>
    </section>
  )
}
