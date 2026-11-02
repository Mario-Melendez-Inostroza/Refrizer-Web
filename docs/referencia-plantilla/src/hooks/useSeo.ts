import { useEffect } from 'react'
import { site } from '../config/site'

const SITE = site.name

/** Título y meta description por página */
export function useSeo(title: string, description: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
  }, [title, description])
}
