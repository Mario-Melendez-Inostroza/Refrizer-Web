import { Link } from 'react-router'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { site } from '@/config/site'
import { FacebookIcon, InstagramIcon, WhatsappIcon } from './SocialIcons'
import { whatsappUrl } from '@/lib/format'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo variant="circular" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{site.slogan}. Productos y servicio técnico en refrigeración y electricidad.</p>
          <div className="mt-5 flex gap-3">
            <a href={site.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-orange"><FacebookIcon /></a>
            <a href={site.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-orange"><InstagramIcon /></a>
          </div>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Navegación</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[['/productos', 'Productos'], ['/servicios', 'Servicios'], ['/nosotros', 'Nosotros'], ['/contacto', 'Contacto'], ['/carrito', 'Carrito']].map(([to, l]) => (
              <li key={to}><Link to={to} className="hover:text-orange">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Contacto</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />{site.address}</li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" /><a href={`tel:${site.phone.replace(/\s/g, '')}`} className="hover:text-orange">{site.phone}</a></li>
            <li className="flex gap-2.5"><WhatsappIcon className="mt-0.5 size-4 shrink-0 text-orange" /><a href={whatsappUrl(site.whatsapp.number, site.whatsapp.message)} target="_blank" rel="noreferrer" className="hover:text-orange">WhatsApp</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" /><a href={`mailto:${site.email}`} className="hover:text-orange">{site.email}</a></li>
            <li className="flex gap-2.5"><Clock className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />{site.hours}</li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Medios de pago</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {site.paymentMethods.map((m) => (
              <li key={m} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs">{m}</li>
            ))}
          </ul>
          <p className="mt-5 text-sm">{site.delivery.text}.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name} – {site.tagline}. Todos los derechos reservados.</p>
          <p>{site.city}</p>
        </div>
      </div>
    </footer>
  )
}
