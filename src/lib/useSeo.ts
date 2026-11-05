import { useEffect } from 'react'
import { site } from '@/config/site'
import { HOME_TITLE, SEO_ORIGIN, SITE_NAME, type SeoPage } from '@/config/seo'
import { absoluteUrl, canonicalUrl } from './seo'
import { pageTitle } from './pageTitle'

const DEFAULT_IMAGE = '/og-image.jpg'
const LD_ID = 'ld-pagina'

function meta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Aplica el SEO de la página: título, descripción, canonical, vista previa al compartir (Open Graph y Twitter), noindex y datos
 * estructurados (JSON-LD). Con `null` (p. ej. mientras carga un producto) no cambia nada.
 *
 * El noindex solo se AGREGA en las páginas privadas (carrito, pago, 404): la etiqueta robots global de index.html (que hoy bloquea
 * todo el sitio y se quita al abrir) no se toca en las demás, y al salir de la página se restaura tal como estaba.
 */
export function useSeo(page: SeoPage | null): void {
  const key = page ? JSON.stringify(page) : ''
  useEffect(() => {
    if (!page) return
    const title = page.title ? pageTitle(page.title, SITE_NAME, site.tagline) : HOME_TITLE
    const url = canonicalUrl(SEO_ORIGIN, page.path)
    document.title = title
    setCanonical(url)
    if (page.description) {
      meta('name', 'description').content = page.description
      meta('property', 'og:description').content = page.description
      meta('name', 'twitter:description').content = page.description
    }
    meta('property', 'og:title').content = title
    meta('property', 'og:url').content = url
    meta('property', 'og:type').content = page.type === 'product' ? 'product' : 'website'
    meta('name', 'twitter:title').content = title
    const image = absoluteUrl(SEO_ORIGIN, page.image || DEFAULT_IMAGE)
    meta('property', 'og:image').content = image
    meta('name', 'twitter:image').content = image

    // Solo se toca la etiqueta robots en las páginas privadas; en las demás no se crea ni se modifica.
    let robots: HTMLMetaElement | null = null
    let creada = false
    let antes: string | null = null
    if (page.noindex) {
      robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
      if (!robots) {
        robots = meta('name', 'robots')
        creada = true
      }
      antes = robots.getAttribute('content')
      robots.content = 'noindex, nofollow'
    }

    let ld: HTMLScriptElement | null = null
    if (page.jsonLd?.length) {
      ld = document.createElement('script')
      ld.type = 'application/ld+json'
      ld.id = LD_ID
      ld.textContent = JSON.stringify(page.jsonLd.length === 1 ? page.jsonLd[0] : page.jsonLd)
      document.head.appendChild(ld)
    }

    return () => {
      ld?.remove()
      if (robots) {
        if (creada) robots.remove()
        else if (antes === null) robots.removeAttribute('content')
        else robots.setAttribute('content', antes)
      }
    }
    // `key` representa el contenido de `page`; evita repetir el efecto por un objeto nuevo con el mismo contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
