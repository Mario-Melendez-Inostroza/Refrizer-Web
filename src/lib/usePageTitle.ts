import { useEffect } from 'react'
import { site } from '@/config/site'
import { pageTitle } from './pageTitle'

/** Pone el título de la página mientras está montada ("Productos | Refrizer") y, al salir, vuelve al de la portada (el de index.html). */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = pageTitle(title, site.name, site.tagline)
    return () => {
      document.title = pageTitle(undefined, site.name, site.tagline)
    }
  }, [title])
}
