import { Link } from 'react-router'
import PageHeader from '@/components/PageHeader'
import { legalUpdated, returns, terms, type LegalPageContent } from '@/config/legal'

const pages: Record<'terminos' | 'devoluciones', LegalPageContent> = { terminos: terms, devoluciones: returns }

export default function Legal({ page }: { page: keyof typeof pages }) {
  const p = pages[page]
  return (
    <>
      <PageHeader eyebrow={p.eyebrow} title={p.title}>{p.intro}</PageHeader>
      <section className="py-12 sm:py-14">
        <div className="container-x max-w-3xl">
          <p className="text-sm text-muted">Última actualización: {legalUpdated}</p>
          {p.sections.map((s, i) => (
            <div key={s.title} className="mt-8">
              <h2 className="text-xl font-bold text-navy-900">{i + 1}. {s.title}</h2>
              {s.paragraphs?.map((t) => <p key={t} className="mt-3 leading-relaxed text-muted">{t}</p>)}
              {s.items && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted">
                  {s.items.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
              {s.link && <Link to={s.link.to} className="btn-outline mt-4 py-2.5 text-[13px]">{s.link.label}</Link>}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
