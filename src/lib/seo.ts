/**
 * Funciones puras de SEO (sin DOM ni alias '@/'): URLs canónicas, descripciones y datos estructurados JSON-LD.
 * Las usan el hook useSeo, las páginas y las pruebas.
 */

/** Quita etiquetas HTML y espacios repetidos. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Descripción para buscadores: texto plano de hasta `max` caracteres, cortado en una palabra completa. */
export function truncateDescription(text: string, max = 160): string {
  const t = stripHtml(text)
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:\s]+$/, '')}…`
}

/** URL canónica absoluta: sin parámetros ni #, sin barra final (salvo la portada). */
export function canonicalUrl(origin: string, path: string): string {
  const clean = path.split('#')[0].split('?')[0]
  const p = `/${clean.replace(/^\/+/, '').replace(/\/+$/, '')}`
  return `${origin.replace(/\/+$/, '')}${p === '/' ? '/' : p}`
}

/** Convierte una imagen relativa en absoluta. */
export function absoluteUrl(origin: string, url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${origin.replace(/\/+$/, '')}${url.startsWith('/') ? '' : '/'}${url}`
}

const CTX = 'https://schema.org'

export function organizationJsonLd(o: { origin: string; name: string; description: string; logo: string; telephone?: string; email?: string }) {
  return {
    '@context': CTX,
    '@type': 'Organization',
    '@id': `${o.origin}/#organizacion`,
    name: o.name,
    url: `${o.origin}/`,
    logo: absoluteUrl(o.origin, o.logo),
    description: o.description,
    areaServed: { '@type': 'City', name: 'Santiago, Chile' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        ...(o.telephone ? { telephone: o.telephone } : {}),
        ...(o.email ? { email: o.email } : {}),
        areaServed: 'CL',
        availableLanguage: 'es',
      },
    ],
  }
}

export function websiteJsonLd(origin: string, name: string) {
  return { '@context': CTX, '@type': 'WebSite', '@id': `${origin}/#sitio`, url: `${origin}/`, name, inLanguage: 'es-CL' }
}

export interface Crumb {
  name: string
  path: string
}

export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: canonicalUrl(origin, c.path) })),
  }
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

/** Servicio técnico prestado en toda la ciudad de Santiago (sin dirección: no hay local). */
export function serviceJsonLd(s: { origin: string; name: string; description: string; path: string; providerName: string }) {
  return {
    '@context': CTX,
    '@type': 'Service',
    name: s.name,
    description: s.description,
    url: canonicalUrl(s.origin, s.path),
    provider: { '@type': 'Organization', name: s.providerName, url: `${s.origin}/` },
    areaServed: { '@type': 'City', name: 'Santiago, Chile' },
  }
}

export interface ProductLd {
  origin: string
  name: string
  description: string
  path: string
  images: string[]
  /** CLP como texto entero, sin puntos (ej. "12990"). */
  price: string
  inStock: boolean
  sku?: string
}

export function productJsonLd(p: ProductLd) {
  return {
    '@context': CTX,
    '@type': 'Product',
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.images.length ? { image: p.images.map((i) => absoluteUrl(p.origin, i)) } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    offers: {
      '@type': 'Offer',
      url: canonicalUrl(p.origin, p.path),
      priceCurrency: 'CLP',
      price: p.price,
      availability: p.inStock ? `${CTX}/InStock` : `${CTX}/OutOfStock`,
      itemCondition: `${CTX}/NewCondition`,
    },
  }
}

/**
 * Contenido de robots.txt. Bloqueado (demo): nada se indexa. Abierto: se permite todo salvo carrito, pago y el panel de WordPress;
 * NO se bloquea /wp/wp-json ni /wp/wp-content porque la tienda carga el catálogo y las imágenes desde ahí y Google necesita verlos.
 */
const NL = String.fromCharCode(10)

export function robotsTxt(indexable: boolean, origin: string): string {
  if (!indexable) return ['User-agent: *', 'Disallow: /', ''].join(NL)
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /carrito',
    'Disallow: /checkout',
    'Disallow: /pedido/',
    'Disallow: /wp/wp-admin/',
    'Allow: /wp/wp-admin/admin-ajax.php',
    '',
    `Sitemap: ${origin.replace(/\/+$/, '')}/sitemap.xml`,
    '',
  ].join(NL)
}
