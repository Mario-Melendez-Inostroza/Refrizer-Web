import type { ReactNode } from 'react'

export default function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/40 blur-3xl" />
      <div className="container-x relative py-12 sm:py-16">
        {eyebrow && <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-white/80">{children}</div>}
      </div>
    </section>
  )
}
