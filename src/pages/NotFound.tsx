import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-navy-900">Página no encontrada</h1>
      <Link to="/" className="btn-orange mt-6">Volver al inicio</Link>
    </div>
  )
}
