import { Link } from 'react-router'
import { useSeo } from '@/lib/useSeo'
import { seoPrivate } from '@/config/seo'

export default function NotFound() {
  useSeo(seoPrivate.notFound)
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-navy-900">Página no encontrada</h1>
      <Link to="/" className="btn-orange mt-6">Volver al inicio</Link>
    </div>
  )
}
