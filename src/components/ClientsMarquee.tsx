import { site } from '@/config/site'

/** Carrusel infinito de clientes. Pausa al pasar el mouse o enfocar; con "reducir movimiento" queda estático. */
export default function ClientsMarquee() {
  const { title, items } = site.clients
  if (items.length === 0) return null
  const tile = (c: (typeof items)[number], i: number, hidden: boolean) => (
    <li key={`${c.name}-${i}`} aria-hidden={hidden || undefined} className="flex h-20 w-52 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-5 text-center">
      {c.logo ? (
        <img src={c.logo} alt={hidden ? '' : c.name} loading="lazy" className="max-h-12 w-auto max-w-full object-contain" />
      ) : (
        <span className="text-sm font-semibold leading-tight text-navy-900">{c.name}</span>
      )}
    </li>
  )
  return (
    <section className="bg-surface py-14" aria-labelledby="clientes-title">
      <div className="container-x">
        <h2 id="clientes-title" className="text-center text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h2>
        <div className="marquee mt-8" tabIndex={0} aria-label={title}>
          <ul className="marquee__track">
            {items.map((c, i) => tile(c, i, false))}
            {items.map((c, i) => tile(c, i + items.length, true))}
          </ul>
        </div>
      </div>
    </section>
  )
}
