import { Link } from 'react-router'
import { site } from '@/config/site'
import { SEO_ORIGIN, coverageComunas, seoPages, services } from '@/config/seo'
import { breadcrumbJsonLd } from '@/lib/seo'
import { whatsappUrl } from '@/lib/format'
import { useSeo } from '@/lib/useSeo'
import PageHeader from '@/components/PageHeader'

/** Dónde se hacen los servicios (todo Santiago) y adónde se despachan los productos (Santiago y regiones). */
export default function Coverage() {
  useSeo({ ...seoPages.coverage, jsonLd: [breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Cobertura', path: seoPages.coverage.path }])] })
  return (
    <>
      <PageHeader eyebrow="Cobertura" title="Servicios técnicos en todo Santiago">Instalación, mantención y reparación en todas las comunas de Santiago.</PageHeader>
      <section className="py-12">
        <div className="container-x max-w-4xl">
          <h2 className="text-xl font-bold text-navy-900">Servicios técnicos</h2>
          <p className="mt-3 text-ink">
            Realizamos nuestros servicios técnicos en todas las comunas de Santiago. Fuera de Santiago no hacemos servicios: solo despachamos productos.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.slug}><Link to={`${seoPages.services.path}/${s.slug}`} className="font-semibold text-brand hover:underline">{s.name}</Link></li>
            ))}
          </ul>

          <h2 className="mt-10 text-xl font-bold text-navy-900">Comunas donde hacemos servicios</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-ink sm:grid-cols-3 lg:grid-cols-4">
            {coverageComunas.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="mt-4 text-sm text-muted">¿Tu comuna no está en la lista? Escríbenos y lo revisamos.</p>

          <h2 className="mt-10 text-xl font-bold text-navy-900">Despacho de productos</h2>
          <p className="mt-3 text-ink">
            Los productos de la tienda se despachan a Santiago y a regiones, o se retiran en Peñaflor.{' '}
            <Link to={seoPages.delivery.path} className="font-semibold text-brand hover:underline">Ver cómo funciona el despacho y el retiro</Link>.
          </p>

          <a href={whatsappUrl(site.whatsapp.number, 'Hola, quiero consultar si atienden mi comuna.')} target="_blank" rel="noreferrer" className="btn-orange mt-8">Consultar por WhatsApp</a>
        </div>
      </section>
    </>
  )
}
