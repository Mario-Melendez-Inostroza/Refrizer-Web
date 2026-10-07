import { CheckCircle2 } from 'lucide-react'
import { site } from '@/config/site'
import { placeholder } from '@/lib/placeholder'
import PageHeader from '@/components/PageHeader'

export default function About() {
  const a = site.about
  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={<>{a.title} <span className="text-[#6ea0ff]">{a.highlightBlue}</span> y <span className="text-orange">{a.highlightOrange}</span></>} />
      <section className="py-14">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <img src={placeholder('Imagen equipo', 900, 700)} alt="Equipo de Refrizer" className="aspect-[9/7] w-full rounded-2xl object-cover" />
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
    </>
  )
}
