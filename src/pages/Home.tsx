import { Link } from 'react-router'
import { useRef } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, Snowflake } from 'lucide-react'
import { site } from '@/config/site'
import { getCategories, getProducts } from '@/services'
import { useAsync } from '@/lib/useAsync'
import { placeholder } from '@/lib/placeholder'
import heroBg from '@/assets/fondo_clima.png'
import Icon from '@/components/Icon'
import ProductCard from '@/components/ProductCard'

function Hero() {
  const h = site.hero
  return (
    // Medidas tomadas de la referencia a 1440 px de ancho (1vw = 14.4px); sobre 1440 se congelan.
    <section className="relative overflow-hidden bg-navy-900 text-white lg:flex lg:min-h-[clamp(30rem,39.6vw,44rem)] lg:items-center">
      <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[right_center]" />
      {/* Overlay azul marino solo a la izquierda, para legibilidad del texto */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_26_61/0.82)_0%,rgb(7_26_61/0.55)_30%,rgb(7_26_61/0)_55%)] max-lg:bg-navy-950/60" />
      <div className="container-x relative w-full py-10 sm:py-14 lg:pb-[clamp(2rem,2.9vw,2.6rem)] lg:pt-[clamp(2rem,4.03vw,3.625rem)]">
        <div className="max-w-[40rem]">
          <p className="font-display text-[clamp(0.7rem,1.11vw,1rem)] font-semibold uppercase tracking-[0.28em] text-white">{h.eyebrow}</p>
          <h1 className="mt-[clamp(0.75rem,1.11vw,1rem)] text-[clamp(2.1rem,4.72vw,4.25rem)] font-extrabold leading-[0.91] tracking-[-0.018em]">
            {h.titleLines.map((l) => <span key={l} className="block">{l}</span>)}
            <span className="block text-orange">{h.titleHighlight}</span>
          </h1>
          <p className="mt-[clamp(0.875rem,1.18vw,1.0625rem)] max-w-[30rem] text-[clamp(1rem,1.39vw,1.25rem)] leading-[1.4] text-white">{h.subtitle}</p>
          <div className="mt-[clamp(1.1rem,1.53vw,1.375rem)] flex flex-wrap gap-[clamp(0.75rem,1.2vw,1.1rem)]">
            <Link to="/productos" className="btn-orange h-[clamp(3rem,3.89vw,3.5rem)] rounded-md px-[clamp(1.25rem,2vw,1.75rem)] text-[clamp(1rem,1.25vw,1.125rem)]"><ShoppingCart className="size-[1.4em]" aria-hidden="true" />Ver productos</Link>
            <Link to="/servicios" className="btn-ghost-light h-[clamp(3rem,3.89vw,3.5rem)] rounded-md px-[clamp(1.25rem,2vw,1.75rem)] text-[clamp(1rem,1.25vw,1.125rem)]">Nuestros servicios<ArrowRight className="size-[1.2em]" aria-hidden="true" /></Link>
          </div>
          <ul className="mt-[clamp(1.75rem,3.1vw,2.75rem)] flex flex-wrap gap-y-4 sm:divide-x sm:divide-white/20">
            {h.trust.map((t) => (
              <li key={t.title} className="flex items-center gap-[clamp(0.75rem,1.1vw,1rem)] pr-[clamp(1.25rem,2.15vw,1.95rem)] text-[clamp(0.875rem,1.08vw,0.97rem)] leading-[1.35] sm:pl-[clamp(1.25rem,2.15vw,1.95rem)] sm:first:pl-0">
                <Icon name={t.icon} className="size-[clamp(2.25rem,3.15vw,2.85rem)] shrink-0 text-[#2f7bf5]" strokeWidth={1.8} />
                <span>{t.title}<br />{t.subtitle}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        to={h.floatingCard.href}
        className="absolute right-[max(1.5rem,calc((100vw-77rem)/2-2.5rem))] top-[42%] hidden w-[clamp(15rem,19.9vw,17.9rem)] rounded-[clamp(0.9rem,1.2vw,1.1rem)] bg-white/95 px-[1.15rem] pb-[0.9rem] pt-[1.2rem] text-ink shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] backdrop-blur transition-transform hover:-translate-y-1 lg:block"
      >
        <div className="flex items-center gap-[0.9rem]">
          <span className="grid size-[3.25rem] shrink-0 place-items-center rounded-full border-[3px] border-brand text-brand"><Snowflake className="size-[1.9rem]" strokeWidth={2.2} aria-hidden="true" /></span>
          <p className="font-display text-[clamp(1.25rem,1.63vw,1.47rem)] font-extrabold leading-[1.15] tracking-[-0.02em] text-navy-900">{h.floatingCard.title}</p>
        </div>
        <div className="mt-[0.35rem] flex items-center justify-between pl-[4.15rem]">
          <span className="text-[0.9rem] font-medium text-ink">{h.floatingCard.subtitle}</span>
          <span className="grid size-[2.15rem] place-items-center rounded-full bg-brand text-white"><ChevronRight className="size-5" strokeWidth={2.6} aria-hidden="true" /></span>
        </div>
        <span className="absolute -bottom-2 right-[3.6rem] size-4 rotate-45 rounded-sm bg-white/95" aria-hidden="true" />
      </Link>
    </section>
  )
}

function Categories() {
  const { data } = useAsync(getCategories, [])
  return (
    <section aria-label="Categorías" className="relative z-10 pb-8 pt-8">
      <div className="container-x">
        <ul className="grid grid-cols-2 gap-2.5 rounded-2xl bg-white p-3 shadow-[0_20px_44px_-18px_rgba(11,37,87,0.35)] sm:grid-cols-4 lg:grid-cols-7">
          {(data ?? Array.from({ length: 7 }, () => null)).map((c, i) => (
            <li key={c?.id ?? i}>
              {c ? (
                <Link to={`/productos?categoria=${c.slug}`} className="flex h-full flex-col items-center rounded-xl border border-line bg-white px-3 pb-4 pt-3 shadow-[0_4px_14px_-8px_rgba(11,37,87,0.2)] text-center transition-colors hover:border-brand hover:bg-brand/[0.03]">
                  <img src={c.image?.src ?? placeholder()} alt="" className="aspect-[6/5] w-full rounded-lg object-cover" />
                  <span className="mt-3 text-[13px] font-semibold leading-tight text-ink">{c.name}</span>
                </Link>
              ) : (
                <div className="h-40 animate-pulse rounded-xl bg-surface" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Featured() {
  const { data, loading } = useAsync(() => getProducts({ featured: true }), [])
  const track = useRef<HTMLUListElement>(null)
  if (!site.flags.showFeatured) return null
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <section className="border-t border-line bg-white py-12 sm:py-14">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Productos destacados</p>
            <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-[2rem]">Lo que necesitas, en <span className="text-brand">un solo lugar</span></h2>
            <p className="mt-2 text-muted">Encuentra los mejores productos en refrigeración y electricidad.</p>
          </div>
          <Link to="/productos" className="btn-outline bg-white py-2.5 text-[13px]">Ver todos los productos<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>

        {!loading && (!data || data.length === 0) ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Pronto nuevos productos.</p>
        ) : (
          <div className="relative mt-8">
            <button onClick={() => scroll(-1)} aria-label="Anterior" className="absolute -left-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md hover:text-brand md:grid lg:-left-6"><ChevronLeft className="size-5" /></button>
            <ul ref={track} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none]">
              {(data ?? [null, null, null]).map((p, i) => (
                <li key={p?.id ?? i} className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[calc(20%-13px)] lg:min-w-[220px]">
                  {p ? <ProductCard product={p} /> : <div className="h-80 animate-pulse rounded-2xl bg-white" />}
                </li>
              ))}
            </ul>
            <button onClick={() => scroll(1)} aria-label="Siguiente" className="absolute -right-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md hover:text-brand md:grid lg:-right-6"><ChevronRight className="size-5" /></button>
          </div>
        )}
      </div>
    </section>
  )
}

export function ServicesBand() {
  const s = site.services
  return (
    <section className="grid bg-navy-900 text-white lg:grid-cols-[36%_1fr]">
      <div className="relative min-h-60 bg-navy-800">
        <img src={placeholder('Imagen técnico', 800, 700)} alt="Técnico de Refrizer instalando un equipo" className="absolute inset-0 size-full object-cover opacity-90" />
      </div>
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:px-12">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{s.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">{s.title}<br /><span className="text-orange">{s.titleHighlight}</span></h2>
          <p className="mt-4 max-w-md text-white/80">{s.text}</p>
          <Link to="/servicios" className="btn-orange mt-7">Ver servicios<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <ul className="divide-y divide-white/10">
          {s.items.map((it) => (
            <li key={it.title} className="flex items-center gap-4 py-3.5 text-sm">
              <Icon name={it.icon} className={`size-6 shrink-0 ${it.icon === 'bolt' ? 'text-orange' : 'text-[#4f8cff]'}`} strokeWidth={1.7} />
              {it.title}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Benefits() {
  return (
    <section aria-label="Beneficios" className="border-b border-line bg-surface">
      <ul className="container-x grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {site.benefits.map((b) => (
          <li key={b.title} className="flex items-center gap-4 lg:px-6 lg:first:pl-0">
            <Icon name={b.icon} className="size-9 shrink-0 text-brand" strokeWidth={1.5} />
            <span className="text-sm"><strong className="block font-display font-semibold text-navy-900">{b.title}</strong><span className="text-muted">{b.text}</span></span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function About() {
  const a = site.about
  return (
    <section className="py-16">
      <div className="container-x grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{a.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-[2rem]">{a.title} <span className="text-brand">{a.highlightBlue}</span> y <span className="text-orange">{a.highlightOrange}</span></h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{a.text}</p>
          <Link to="/nosotros" className="btn-outline mt-6 py-2.5 text-[13px]">Conócenos<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Instalación', 'Electricidad', 'Mantención'].map((l) => (
            <img key={l} src={placeholder(l, 400, 380)} alt={`Imagen de ${l.toLowerCase()}`} className="aspect-[20/19] w-full rounded-xl border border-line object-cover" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <Featured />
      <ServicesBand />
      <Benefits />
      <About />
    </>
  )
}
