import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { PackageSearch, Search } from 'lucide-react'
import type { ProductSort } from '@/types'
import { getCategories, getProducts } from '@/services'
import { useAsync } from '@/lib/useAsync'
import PageHeader from '@/components/PageHeader'
import ProductCard from '@/components/ProductCard'
import { useSeo } from '@/lib/useSeo'
import { SEO_ORIGIN, seoPages } from '@/config/seo'
import { breadcrumbJsonLd } from '@/lib/seo'

export default function Products() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  // La categoría tiene URL propia (/categoria/aire-acondicionado); ?categoria= sigue funcionando por enlaces antiguos.
  const category = slug ?? params.get('categoria') ?? ''
  const q = params.get('q') ?? ''
  const sort = (params.get('orden') as ProductSort) || 'default'
  const [term, setTerm] = useState(q)
  useEffect(() => {
    setTerm(q)
  }, [q])

  const { data: categories } = useAsync(getCategories, [])
  const catName = categories?.find((c) => c.slug === category)?.name
  useSeo(
    q
      ? { ...seoPages.products, noindex: true } // resultados de búsqueda interna: no se indexan
      : category && catName
        ? {
            path: `/categoria/${category}`,
            title: catName,
            description: `${catName}: despacho a Santiago y regiones o retiro en Peñaflor. Pago seguro con Mercado Pago.`,
            jsonLd: [breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Productos', path: '/productos' }, { name: catName, path: `/categoria/${category}` }])],
          }
        : category
          ? null // categoría aún cargando o inexistente
          : { ...seoPages.products, jsonLd: [breadcrumbJsonLd(SEO_ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Productos', path: '/productos' }])] },
  )
  const { data: products, loading } = useAsync(() => getProducts({ category, search: q, sort }), [category, q, sort])

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-brand hover:text-brand'}`

  return (
    <>
      <PageHeader eyebrow="Tienda" title="Productos">Equipos y materiales para refrigeración y electricidad.</PageHeader>
      <section className="bg-surface py-10">
        <div className="container-x">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form role="search" onSubmit={(e) => { e.preventDefault(); set('q', term.trim()) }} className="relative flex-1">
              <label htmlFor="product-search" className="sr-only">Buscar productos</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="product-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre…" className="input pl-10" />
            </form>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-muted">Ordenar</label>
              <select id="sort" value={sort} onChange={(e) => set('orden', e.target.value === 'default' ? '' : e.target.value)} className="input w-auto">
                <option value="default">Relevancia</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>
          <div role="group" aria-label="Filtrar por categoría" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <Link to="/productos" className={chip(!category)} aria-current={!category ? 'page' : undefined}>Todas</Link>
            {categories?.map((c) => (
              <Link key={c.id} to={`/categoria/${c.slug}`} className={chip(category === c.slug)} aria-current={category === c.slug ? 'page' : undefined}>{c.name}</Link>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted" aria-live="polite">{loading ? 'Cargando…' : `${products?.length ?? 0} producto(s)`}</p>
          {!loading && products?.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <PackageSearch className="mx-auto size-10 text-brand" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-navy-900">No encontramos productos con esos filtros</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">Prueba con otra búsqueda o categoría. Si no encuentras lo que necesitas, escríbenos y te ayudamos a conseguirlo.</p>
              <button onClick={() => setParams({}, { replace: true })} className="btn-outline mt-6">Ver todos los productos</button>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(loading ? Array.from({ length: 4 }, () => null) : products ?? []).map((p, i) => (
                <li key={p?.id ?? i}>{p ? <ProductCard product={p} /> : <div className="h-80 animate-pulse rounded-2xl bg-white" />}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
