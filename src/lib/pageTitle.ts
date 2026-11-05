/** Título de la pestaña y de los resultados de búsqueda por página: "Productos | Refrizer". Sin título, el título por defecto. */
export function pageTitle(title: string | undefined, siteName: string, tagline: string): string {
  const t = title?.trim()
  return t ? `${t} | ${siteName}` : `${siteName} – ${tagline}`
}
