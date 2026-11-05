import { CheckCircle2 } from 'lucide-react'
import { site } from '@/config/site'
import PageHeader from '@/components/PageHeader'
import ClientsMarquee from '@/components/ClientsMarquee'
import { usePageTitle } from '@/lib/usePageTitle'

export default function About() {
  usePageTitle('Nosotros')
  const a = site.about
  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={<>{a.title} <span className="text-[#6ea0ff]">{a.highlightBlue}</span> y <span className="text-orange">{a.highlightOrange}</span></>} />
      <section className="py-14">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <img src="/images/nosotros.webp" alt="Letrero de Refrizer, refrigeración y electricidad" width={1774} height={887} className="aspect-video w-full rounded-2xl object-cover object-[35%_center]" />
          <div>
            <p className="text-lg leading-relaxed text-muted">{a.text}</p>
            <ul className="mt-8 space-y-5">
              {a.values.map((v) => (
                <li key={v.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden="true" />
                  <div><h2 className="font-semibold text-navy-900">{v.title}</h2><p className="text-sm text-muted">{v.text}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <ClientsMarquee />
    </>
  )
}
