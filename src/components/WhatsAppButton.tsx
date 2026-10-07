import { site } from '@/config/site'
import { whatsappUrl } from '@/lib/format'
import { WhatsappIcon } from './SocialIcons'

export default function WhatsAppButton() {
  if (!site.flags.showWhatsappButton) return null
  return (
    <a
      href={whatsappUrl(site.whatsapp.number, site.whatsapp.message)}
      target="_blank"
      rel="noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-[#1fa855] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
    >
      <WhatsappIcon />
    </a>
  )
}
