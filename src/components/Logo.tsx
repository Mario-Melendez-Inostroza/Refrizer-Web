import { Link } from 'react-router'
import { site } from '@/config/site'

/**
 * Logo de marca (src/assets/logo.jpg vía site.logo).
 * - horizontal (header): emblema recortado del logo circular con CSS + wordmark en texto real.
 * - circular (footer): el archivo completo.
 */
export default function Logo({ variant = 'horizontal' }: { variant?: 'horizontal' | 'circular' }) {
  const label = `${site.name} – ${site.tagline}, inicio`

  if (variant === 'circular') {
    return (
      <Link to="/" className="inline-flex shrink-0" aria-label={label}>
        <img src={site.logo} alt={`${site.name} – ${site.tagline}`} className="size-28 rounded-full bg-white p-1" />
      </Link>
    )
  }

  return (
    <Link to="/" className="logo-h" aria-label={label}>
      <span className="logo-h__emblem" style={{ backgroundImage: `url(${site.logo})` }} aria-hidden="true" />
      <span className="logo-h__text" aria-hidden="true">
        <span className="logo-h__name">
          <span className="text-[#1a63e0]">REFRI</span>
          <span className="text-[#14223f]">ZER</span>
        </span>
        <span className="logo-h__tag">
          Refrigeración <span className="text-[#1a63e0]">&amp;</span> Electricidad
        </span>
      </span>
    </Link>
  )
}
