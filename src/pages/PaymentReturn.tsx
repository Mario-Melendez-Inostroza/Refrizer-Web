import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { site } from '@/config/site'
import { whatsappUrl } from '@/lib/format'

// Mercado Pago retorna ?status=approved|pending|in_process|rejected|failure
const STATES = {
  paid: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', title: '¡Pago recibido!', text: `Gracias por tu compra. ${site.delivery.text}: te escribiremos pronto con los detalles.` },
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', title: 'Pago pendiente de confirmación', text: 'Estamos esperando la confirmación de Mercado Pago. Te avisaremos por correo apenas se acredite.' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', title: 'No pudimos procesar el pago', text: 'El pago fue rechazado o cancelado. Puedes intentarlo nuevamente o contactarnos para ayudarte.' },
}

function resolve(s: string | null): keyof typeof STATES {
  if (s === 'approved' || s === 'paid') return 'paid'
  if (s === 'pending' || s === 'in_process') return 'pending'
  return 'failed'
}

export default function PaymentReturn() {
  const [params] = useSearchParams()
  const key = resolve(params.get('status') ?? params.get('collection_status'))
  const st = STATES[key]
  const I = st.icon
  return (
    <section className="bg-surface py-16 sm:py-24">
      <div className="container-x max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-8 text-center sm:p-10" role="status">
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${st.color}`}><I className="size-8" aria-hidden="true" /></span>
          <h1 className="mt-5 text-2xl font-bold text-navy-900">{st.title}</h1>
          <p className="mt-3 text-muted">{st.text}</p>
          {params.get('payment_id') && <p className="mt-3 text-xs text-muted">N° de pago: {params.get('payment_id')}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {key === 'failed' ? <Link to="/checkout" className="btn-orange">Reintentar pago</Link> : <Link to="/productos" className="btn-orange">Seguir comprando</Link>}
            <a href={whatsappUrl(site.whatsapp.number, 'Hola, tengo una consulta sobre mi pedido.')} target="_blank" rel="noreferrer" className="btn-outline">Contactar por WhatsApp</a>
          </div>
        </div>
      </div>
    </section>
  )
}
