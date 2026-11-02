const clp = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

/** Única función para formatear precios: 19990 → "$19.990" */
export function formatPrice(value: number): string {
  return '$' + clp.format(Math.round(value))
}
