import { Link } from 'react-router'
import { site } from '@/config/site'

/** Logo de marca (src/assets/logo.jpg vía site.logo). */
export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label={`${site.name} – ${site.tagline}, inicio`}>
      <img
        src={site.logo}
        alt={`${site.name} – ${site.tagline}`}
        className={`h-14 w-auto sm:h-16 ${inverted ? 'rounded-full bg-white p-1' : 'mix-blend-multiply'}`}
      />
    </Link>
  )
}
