import { Link } from 'react-router'
import { site } from '@/config/site'
import { SEO_ORIGIN, seoPages } from '@/config/seo'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'
import { whatsappUrl } from '@/lib/format'
import { useSeo } from '@/lib/useSeo'
import PageHeader from '@/components/PageHeader'

const FAQS = [
  { q: '¿Cobran envío por la página?', a: 'No. Al pagar con Mercado Pago no se suma un costo de envío; el despacho se coordina contigo después del pago.' },
  { q: '¿Dónde puedo retirar mi compra?', a: `En la comuna de ${site.pickup.commune}. Te indicamos el punto de retiro cuando coordinamos contigo.` },
  { q: '¿Despachan a regiones?', a: 'Sí, despachamos productos a Santiago y a regiones. Los servicios técnicos (instalación, mantención y reparación) solo se hacen en Santiago.' },
  { q: '¿Cómo pago?', a: 'Con Mercado Pago, de forma segura. Una vez confirmado el pago, te contactamos para coordinar el despacho o el retiro.' },
]

/** Cómo se entregan los productos: despacho a Santiago y regiones, o retiro en Peñaflor. */
export default function Delivery() {
  useSeo({
    ...seoPages.delivery,
    jsonLd: [faqJsonLd(FAQS), breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Despacho y retiro', path: seoPages.delivery.path }])],
  })
  return (
    <>
      <PageHeader eyebrow="Entrega" title="Despacho y retiro de productos">Despacho a Santiago y regiones, o retiro en {site.pickup.commune}.</PageHeader>
      <section className="py-12">
        <div className="container-x max-w-4xl">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6">
              <h2 className="text-lg font-semibold text-navy-900">Despacho a Santiago y regiones</h2>
              <p className="mt-2 text-sm text-muted">Enviamos tu compra a la dirección que indiques. Coordinamos el despacho contigo después del pago.</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6">
              <h2 className="text-lg font-semibold text-navy-900">Retiro en {site.pickup.commune}</h2>
              <p className="mt-2 text-sm text-muted">Si prefieres retirar, no necesitas indicar dirección: te contactamos para coordinar el retiro.</p>
            </div>
          </div>

          <h2 className="mt-10 text-xl font-bold text-navy-900">Cómo funciona</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-ink">
            <li>Eliges tus productos y pagas de forma segura con Mercado Pago.</li>
            <li>Al finalizar la compra eliges despacho o retiro.</li>
            <li>Te contactamos para coordinar la entrega.</li>
          </ol>

          <h2 className="mt-10 text-xl font-bold text-navy-900">Preguntas frecuentes</h2>
          <div className="mt-3 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-xl border border-line bg-white p-4">
                <summary className="cursor-pointer font-semibold text-navy-900">{f.q}</summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 text-ink">
            ¿Buscas un servicio técnico? Hacemos instalación, mantención y reparación en <Link to={seoPages.coverage.path} className="font-semibold text-brand hover:underline">todas las comunas de Santiago</Link>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={seoPages.products.path} className="btn-orange">Ver productos</Link>
            <a href={whatsappUrl(site.whatsapp.number, 'Hola, tengo una consulta sobre despacho o retiro.')} target="_blank" rel="noreferrer" className="btn-outline">Consultar por WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  )
}
