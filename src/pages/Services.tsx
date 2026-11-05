import { Link } from 'react-router'
import { site } from '@/config/site'
import { whatsappUrl } from '@/lib/format'
import Icon from '@/components/Icon'
import PageHeader from '@/components/PageHeader'
import { Benefits } from './Home'
import { useSeo } from '@/lib/useSeo'
import { SEO_ORIGIN, seoPages, services } from '@/config/seo'
import { breadcrumbJsonLd } from '@/lib/seo'

export default function Services() {
  useSeo({ ...seoPages.services, jsonLd: [breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: seoPages.services.path }])] })
  const s = site.services
  return (
    <>
      <PageHeader eyebrow={s.eyebrow} title={<>{s.title} <span className="text-orange">{s.titleHighlight}</span></>}>{s.text}</PageHeader>
      <section className="py-14">
        <ul className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((it) => {
            const detalle = services.find((x) => x.name === it.title)
            return (
            <li key={it.title} className="rounded-2xl border border-line bg-white p-6 shadow-[0_6px_24px_-14px_rgba(11,37,87,0.2)]">
              <span className="grid size-12 place-items-center rounded-xl bg-brand/10"><Icon name={it.icon} className={`size-6 ${it.icon === 'bolt' ? 'text-orange' : 'text-brand'}`} /></span>
              <h2 className="mt-4 text-lg font-semibold text-navy-900">{it.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{it.text}</p>
              {detalle && <Link to={`${seoPages.services.path}/${detalle.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Ver más sobre este servicio</Link>}
            </li>
            )
          })}
          <li className="flex flex-col justify-between rounded-2xl bg-navy-900 p-6 text-white">
            <div>
              <h2 className="text-lg font-semibold">¿Necesitas una cotización?</h2>
              <p className="mt-2 text-sm text-white/80">Cuéntanos qué necesitas y te respondemos a la brevedad.</p>
            </div>
            <a href={whatsappUrl(site.whatsapp.number, 'Hola, quiero cotizar un servicio.')} target="_blank" rel="noreferrer" className="btn-orange mt-6 self-start">Cotizar por WhatsApp</a>
          </li>
        </ul>
      </section>
      <Benefits />
    </>
  )
}
