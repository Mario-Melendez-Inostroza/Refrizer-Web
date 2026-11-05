import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteUrl, breadcrumbJsonLd, canonicalUrl, faqJsonLd, organizationJsonLd, productJsonLd, robotsTxt, serviceJsonLd, stripHtml, truncateDescription } from './seo.ts'
import { HOME_TITLE, coverageComunas, seoPages, seoPrivate, services, staticPaths } from '../config/seo.ts'
import { pageTitle } from './pageTitle.ts'

const ORIGIN = 'https://refrizer.cl'

test('canonicalUrl: sin parámetros, sin # y sin barra final (salvo la portada)', () => {
  assert.equal(canonicalUrl(ORIGIN, '/'), 'https://refrizer.cl/')
  assert.equal(canonicalUrl(ORIGIN, ''), 'https://refrizer.cl/')
  assert.equal(canonicalUrl(ORIGIN, '/productos?_=v4&q=aire'), 'https://refrizer.cl/productos')
  assert.equal(canonicalUrl(ORIGIN + '/', '/servicios/'), 'https://refrizer.cl/servicios')
  assert.equal(canonicalUrl(ORIGIN, 'categoria/aire#top'), 'https://refrizer.cl/categoria/aire')
})

test('absoluteUrl: deja las absolutas y completa las relativas', () => {
  assert.equal(absoluteUrl(ORIGIN, 'https://x.cl/a.jpg'), 'https://x.cl/a.jpg')
  assert.equal(absoluteUrl(ORIGIN, '/og-image.jpg'), 'https://refrizer.cl/og-image.jpg')
  assert.equal(absoluteUrl(ORIGIN + '/', 'og-image.jpg'), 'https://refrizer.cl/og-image.jpg')
})

test('stripHtml y truncateDescription: texto plano, palabra completa y máximo de 160', () => {
  assert.equal(stripHtml('<p>Hola&nbsp;<strong>mundo</strong> &amp; todos</p>'), 'Hola mundo & todos')
  assert.equal(truncateDescription('<p>corto</p>'), 'corto')
  const largo = 'palabra '.repeat(50)
  const d = truncateDescription(largo, 100)
  assert.ok(d.length <= 100, `largo ${d.length}`)
  assert.ok(d.endsWith('…') && !d.endsWith(' …'))
  assert.ok(!/palabr…$/.test(d), 'no corta una palabra por la mitad')
})

test('JSON-LD de organización: sin dirección (no hay local), con área de servicio y contacto', () => {
  const o = organizationJsonLd({ origin: ORIGIN, name: 'Refrizer', description: 'd', logo: '/apple-touch-icon.png', telephone: '+56998525452', email: 'ventas@refrizer.cl' })
  assert.equal(o['@type'], 'Organization')
  assert.equal(o.logo, 'https://refrizer.cl/apple-touch-icon.png')
  assert.equal(o.areaServed.name, 'Santiago, Chile')
  assert.ok(!('address' in o), 'no se declara dirección')
  assert.equal(o.contactPoint[0].telephone, '+56998525452')
})

test('JSON-LD de producto: precio en CLP, disponibilidad e imágenes absolutas', () => {
  const p = productJsonLd({ origin: ORIGIN, name: 'Equipo', description: 'desc', path: '/producto/equipo?x=1', images: ['/wp/a.jpg'], price: '12990', inStock: true, sku: 'EQ1' })
  assert.equal(p.offers.priceCurrency, 'CLP')
  assert.equal(p.offers.price, '12990')
  assert.equal(p.offers.availability, 'https://schema.org/InStock')
  assert.equal(p.offers.url, 'https://refrizer.cl/producto/equipo')
  assert.deepEqual(p.image, ['https://refrizer.cl/wp/a.jpg'])
  assert.equal(productJsonLd({ origin: ORIGIN, name: 'E', description: '', path: '/producto/e', images: [], price: '1', inStock: false }).offers.availability, 'https://schema.org/OutOfStock')
  assert.ok(!('image' in productJsonLd({ origin: ORIGIN, name: 'E', description: '', path: '/p', images: [], price: '1', inStock: true })))
})

test('JSON-LD de migas, preguntas y servicio', () => {
  const b = breadcrumbJsonLd(ORIGIN, [{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: '/servicios' }])
  assert.equal(b.itemListElement[1].position, 2)
  assert.equal(b.itemListElement[1].item, 'https://refrizer.cl/servicios')
  const f = faqJsonLd([{ q: 'P', a: 'R' }])
  assert.equal(f.mainEntity[0].acceptedAnswer.text, 'R')
  const s = serviceJsonLd({ origin: ORIGIN, name: 'N', description: 'D', path: '/servicios/x', providerName: 'Refrizer' })
  assert.equal(s.areaServed.name, 'Santiago, Chile')
})

test('contenido de SEO: títulos y descripciones con largo razonable y sin duplicados', () => {
  const todas = [...Object.values(seoPages), ...services.map((s) => ({ path: `/servicios/${s.slug}`, title: s.title, description: s.description }))]
  const paths = new Set<string>()
  const titulos = new Set<string>()
  for (const p of todas) {
    assert.ok(!paths.has(p.path), `ruta repetida ${p.path}`)
    paths.add(p.path)
    const titulo = pageTitle(('title' in p ? p.title : undefined) as string | undefined, 'Refrizer', 'x')
    if ('title' in p && p.title) {
      assert.ok(titulo.length <= 65, `título largo (${titulo.length}): ${titulo}`)
      assert.ok(!titulos.has(titulo), `título repetido ${titulo}`)
      titulos.add(titulo)
    }
    assert.ok(p.description && p.description.length >= 70 && p.description.length <= 165, `descripción de ${p.path}: ${p.description?.length}`)
  }
  assert.ok(HOME_TITLE.length <= 60, `título de portada ${HOME_TITLE.length}`)
})

test('servicios: slugs únicos, 3 preguntas y la misma regla de cobertura (Santiago; fuera solo productos)', () => {
  assert.equal(new Set(services.map((s) => s.slug)).size, services.length)
  for (const s of services) {
    assert.match(s.slug, /^[a-z0-9-]+$/)
    assert.ok(s.faqs.length >= 3, s.slug)
    assert.ok(s.includes.length >= 3 && s.quoteInfo.length >= 3, s.slug)
    assert.ok(s.faqs.some((f) => /todas las comunas de Santiago/.test(f.a) && /solo despachamos productos/.test(f.a)), s.slug)
    // No se inventan promesas: nada de garantía, plazos ni "mismo día".
    const texto = JSON.stringify(s).toLowerCase()
    for (const prohibida of ['garantía', 'mismo día', '24 horas', '24/7', 'años de experiencia']) assert.ok(!texto.includes(prohibida), `${s.slug} dice "${prohibida}"`)
  }
})

test('cobertura y rutas: comunas únicas, Santiago incluida, rutas fijas del sitemap y páginas privadas con noindex', () => {
  assert.equal(new Set(coverageComunas).size, coverageComunas.length)
  assert.ok(coverageComunas.includes('Santiago') && coverageComunas.includes('Maipú'))
  const rutas = staticPaths()
  assert.equal(new Set(rutas).size, rutas.length)
  assert.ok(rutas.includes('/') && rutas.includes('/cobertura') && rutas.includes('/servicios/instalacion-de-aire-acondicionado'))
  for (const p of rutas) assert.ok(!/^\/(carrito|checkout|pedido)/.test(p), `ruta privada en el sitemap: ${p}`)
  for (const p of Object.values(seoPrivate)) assert.equal(p.noindex, true)
})

test('robots.txt: bloqueado en demo; abierto sin bloquear la API ni las imágenes de WordPress y con sitemap', () => {
  const nl = String.fromCharCode(10)
  assert.equal(robotsTxt(false, ORIGIN), ['User-agent: *', 'Disallow: /', ''].join(nl))
  const abierto = robotsTxt(true, ORIGIN + '/')
  assert.ok(abierto.includes('Allow: /'))
  assert.ok(abierto.includes('Disallow: /carrito') && abierto.includes('Disallow: /checkout') && abierto.includes('Disallow: /pedido/'))
  assert.ok(abierto.includes('Sitemap: https://refrizer.cl/sitemap.xml'))
  assert.ok(!/Disallow: \/wp\/(wp-json|wp-content)/.test(abierto), 'la tienda necesita wp-json y wp-content para mostrar productos')
  assert.ok(!/Disallow: \/\s*$/m.test(abierto), 'abierto no bloquea todo el sitio')
})
