import { useState, type FormEvent } from 'react'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { site } from '@/config/site'
import { whatsappUrl } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import { WhatsappIcon } from '@/components/SocialIcons'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    window.open(whatsappUrl(site.whatsapp.number, `Hola, soy ${d.get('nombre')}. ${d.get('mensaje')}`), '_blank')
    setSent(true)
  }
  const info = [
    { icon: MapPin, label: 'Dirección', value: site.address },
    { icon: Phone, label: 'Teléfono', value: site.phone, href: `tel:${site.phone.replace(/\s/g, '')}` },
    { icon: Mail, label: 'Correo', value: site.email, href: `mailto:${site.email}` },
    { icon: Clock, label: 'Horario', value: site.hours },
  ]
  return (
    <>
      <PageHeader eyebrow="Contacto" title="Hablemos">Escríbenos y te ayudamos con tu compra o servicio técnico.</PageHeader>
      <section className="bg-surface py-14">
        <div className="container-x grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-3">
            {info.map(({ icon: I, label, value, href }) => (
              <div key={label} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><I className="size-5" aria-hidden="true" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>{href ? <a href={href} className="font-medium text-ink hover:text-brand">{value}</a> : <p className="font-medium text-ink">{value}</p>}</div>
              </div>
            ))}
            <a href={whatsappUrl(site.whatsapp.number, site.whatsapp.message)} target="_blank" rel="noreferrer" className="btn w-full bg-[#1fa855] py-3.5 text-white hover:bg-[#178a45]"><WhatsappIcon className="size-5" />Escríbenos por WhatsApp</a>
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-navy-900">Envíanos un mensaje</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="c-nombre" className="label">Nombre</label><input id="c-nombre" name="nombre" required className="input" /></div>
              <div><label htmlFor="c-tel" className="label">Teléfono</label><input id="c-tel" name="telefono" type="tel" className="input" /></div>
              <div className="sm:col-span-2"><label htmlFor="c-email" className="label">Correo</label><input id="c-email" name="email" type="email" required className="input" /></div>
              <div className="sm:col-span-2"><label htmlFor="c-msg" className="label">Mensaje</label><textarea id="c-msg" name="mensaje" rows={5} required className="input" /></div>
            </div>
            <button className="btn-orange mt-5">Enviar mensaje</button>
            {sent && <p className="mt-3 text-sm text-emerald-700" role="status">¡Gracias! Continuamos la conversación por WhatsApp.</p>}
          </form>
        </div>
      </section>
    </>
  )
}
