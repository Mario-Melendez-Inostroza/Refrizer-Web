import { Link, useParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { site } from '@/config/site'
import { SEO_ORIGIN, SITE_NAME, seoPages, services } from '@/config/seo'
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo'
import { whatsappUrl } from '@/lib/format'
import { useSeo } from '@/lib/useSeo'
import PageHeader from '@/components/PageHeader'
import NotFound from './NotFound'

/** Página de un servicio técnico (/servicios/:slug): contenido propio, preguntas frecuentes y datos estructurados. */
export default function ServiceDetail() {
  const { slug = '' } = useParams()
  const s = services.find((x) => x.slug === slug)
  const path = `${seoPages.services.path}/${slug}`
  useSeo(
    s
      ? {
          path,
          title: s.title,
          description: s.description,
          jsonLd: [
            serviceJsonLd({ origin: SEO_ORIGIN, name: s.name, description: s.description, path, providerName: SITE_NAME }),
            faqJsonLd(s.faqs),
            breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: seoPages.services.path }, { name: s.name, path }]),
          ],
        }
      : null,
  )
  if (!s) return <NotFound />

  const otros = services.filter((x) => x.slug !== s.slug)
  return (
    <>
      <PageHeader eyebrow="Servicios en todo Santiago" title={s.h1}>{s.description}</PageHeader>
      <section className="py-12">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            {s.intro.map((p) => <p key={p} className="mb-4 text-base leading-relaxed text-ink">{p}</p>)}

            <h2 className="mt-8 text-xl font-bold text-navy-900">Qué incluye</h2>
            <ul className="mt-3 space-y-2">
              {s.includes.map((i) => (
                <li key={i} className="flex gap-2.5 text-ink"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />{i}</li>
              ))}
            </ul>

            <h2 className="mt-8 text-xl font-bold text-navy-900">Cómo cotizar</h2>
            <p className="mt-3 text-ink">Escríbenos por WhatsApp y cuéntanos:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-ink">
              {s.quoteInfo.map((i) => <li key={i}>{i}</li>)}
            </ul>

            <h2 className="mt-8 text-xl font-bold text-navy-900">Preguntas frecuentes</h2>
            <div className="mt-3 space-y-3">
              {s.faqs.map((f) => (
                <details key={f.q} className="rounded-xl border border-line bg-white p-4">
                  <summary className="cursor-pointer font-semibold text-navy-900">{f.q}</summary>
                  <p className="mt-2 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold text-navy-900">Cotiza este servicio</h2>
            <p className="mt-2 text-sm text-muted">Hacemos servicios técnicos en todas las comunas de Santiago.</p>
            <a href={whatsappUrl(site.whatsapp.number, s.whatsapp)} target="_blank" rel="noreferrer" className="btn-orange mt-5 w-full">Cotizar por WhatsApp</a>
            <p className="mt-4 text-sm"><Link to={seoPages.coverage.path} className="font-semibold text-brand hover:underline">Ver comunas de cobertura</Link></p>
            <p className="mt-2 text-sm"><Link to={seoPages.products.path} className="font-semibold text-brand hover:underline">Ver productos de la tienda</Link></p>
          </aside>
        </div>
      </section>

      <section className="border-t border-line bg-surface py-12">
        <div className="container-x">
          <h2 className="text-xl font-bold text-navy-900">Otros servicios</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otros.map((o) => (
              <li key={o.slug}><Link to={`${seoPages.services.path}/${o.slug}`} className="block rounded-xl border border-line bg-white p-4 font-semibold text-navy-900 hover:border-brand hover:text-brand">{o.name}</Link></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
