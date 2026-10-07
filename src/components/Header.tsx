import { useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { Menu, Search, ShoppingCart, X } from 'lucide-react'
import Logo from './Logo'
import { useCart } from '@/lib/cart'
import { site } from '@/config/site'

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/productos', label: 'Productos' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/contacto', label: 'Contacto' },
]

export default function Header() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/productos${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`)
    setSearchOpen(false)
    setOpen(false)
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative py-2 text-[clamp(0.9375rem,1.11vw,1rem)] font-semibold transition-colors ${isActive ? 'text-brand after:absolute after:inset-x-0 after:-bottom-[0.6rem] after:h-[3px] after:rounded-full after:bg-brand' : 'text-navy-900 hover:text-brand'}`

  return (
    <header className="sticky top-0 z-40 border-b-2 border-brand bg-white">
      <div className="container-x flex h-[clamp(4rem,6.67vw,6rem)] items-center gap-6">
        <span className="lg:pl-[1.5rem]"><Logo /></span>
        <nav aria-label="Principal" className="hidden lg:ml-[clamp(2rem,4.8vw,4.35rem)] lg:block">
          <ul className="flex items-center gap-[clamp(1.75rem,2.85vw,2.5rem)]">
            {NAV.map((n) => (
              <li key={n.to}><NavLink to={n.to} end={n.to === '/'} className={linkCls}>{n.label}</NavLink></li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-[clamp(0.25rem,1.4vw,1.25rem)]">
          {site.flags.showSearch && (
            <button onClick={() => setSearchOpen((v) => !v)} className="grid size-11 place-items-center rounded-full text-navy-900 hover:bg-surface" aria-label="Buscar productos" aria-expanded={searchOpen}>
              <Search className="size-6 lg:size-[2.15rem]" strokeWidth={2.1} />
            </button>
          )}
          <Link to="/carrito" className="relative grid size-11 place-items-center rounded-full text-navy-900 hover:bg-surface" aria-label={`Carrito, ${count} productos`}>
            <ShoppingCart className="size-6 lg:size-[2.15rem]" strokeWidth={2.1} />
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[19px] place-items-center rounded-full bg-orange px-1 text-[11px] font-bold leading-[19px] text-white">{count}</span>
          </Link>
          <button onClick={() => setOpen((v) => !v)} className="grid size-11 place-items-center rounded-full hover:bg-surface lg:hidden" aria-label="Abrir menú" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {searchOpen && (
        <form onSubmit={submit} role="search" className="border-t border-line bg-white">
          <div className="container-x flex gap-2 py-3">
            <label htmlFor="header-search" className="sr-only">Buscar productos</label>
            <input id="header-search" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="¿Qué estás buscando?" className="input" />
            <button className="btn-orange">Buscar</button>
          </div>
        </form>
      )}
      {open && (
        <nav aria-label="Móvil" className="border-t border-line bg-white lg:hidden">
          <ul className="container-x flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-3 font-medium ${isActive ? 'bg-brand/5 text-brand' : 'text-ink'}`}>{n.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
