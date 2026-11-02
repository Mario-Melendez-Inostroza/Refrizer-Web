/** Simula latencia de red. Aún lo usa getShippingOptions (mock) hasta conectar shipping_rates. */
export const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))

/**
 * Base de la Store API de WooCommerce. Mismo origen: React en la raíz del dominio y WordPress en /wp.
 * En local, el proxy de Vite traduce /wp/wp-json hacia WC_URL/wp-json.
 */
export const WC_BASE = '/wp/wp-json/wc/store/v1'

/** Ventana de la caché del catálogo: el hosting cachea los GET por URL (informe §10b), así que la URL cambia cada 30 s. */
const CATALOG_WINDOW_MS = 30_000

/** /products, /products/categories y /products/{slug}. */
const isCatalog = (path: string) => /^\/products(\/|$)/.test(path)

const GENERIC_ERROR = 'No pudimos cargar la tienda. Inténtalo de nuevo en unos minutos.'

export class WcHttpError extends Error {
  status: number
  constructor(status: number, message = GENERIC_ERROR) {
    super(message)
    this.status = status
  }
}

type Params = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  params?: Params
  body?: unknown
  /** Cart-Token devuelto por la respuesta anterior; identifica el carrito sin cookies. */
  cartToken?: string
  /** Salta la caché HTTP del navegador (cache: 'no-store'). */
  noStore?: boolean
}

/**
 * URL de la Store API. En los GET del catálogo añade _=<bloque de 30 s>: la copia del hosting dura como máximo 30 s
 * y sigue sirviendo a quienes piden lo mismo en esa ventana. Si el llamador ya trae `_` (estado del pedido, con
 * marca de tiempo única), se respeta.
 */
export function buildWcUrl(method: 'GET' | 'POST', path: string, params: Params = {}, now = Date.now()): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  if (method === 'GET' && isCatalog(path) && !qs.has('_')) qs.set('_', String(Math.floor(now / CATALOG_WINDOW_MS)))
  const query = qs.toString()
  return `${WC_BASE}${path}${query ? `?${query}` : ''}`
}

/**
 * Store API sin credenciales. credentials: 'omit' porque WordPress está en el mismo origen: sin esto el navegador
 * enviaría las cookies de WordPress (sesión de administrador, sesión de WooCommerce) y el carrito dejaría de
 * depender solo del Cart-Token, como ocurría tras el proxy de la Fase 0. Los mensajes de error no incluyen URLs ni cabeceras.
 */
export async function wcRequest<T>(method: 'GET' | 'POST', path: string, opts: RequestOptions = {}): Promise<{ data: T; cartToken: string }> {
  const res = await fetch(buildWcUrl(method, path, opts.params), {
    method,
    credentials: 'omit',
    cache: opts.noStore ? 'no-store' : undefined,
    headers: {
      Accept: 'application/json',
      ...(opts.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(opts.cartToken && { 'Cart-Token': opts.cartToken }),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const json = res.headers.get('content-type')?.includes('application/json') ? await res.json().catch(() => null) : null
  if (!res.ok) {
    // WooCommerce devuelve mensajes pensados para el comprador (ej. "el total cambió"); se muestran sin HTML.
    const message = typeof json?.message === 'string' ? json.message.replace(/<[^>]*>/g, '').trim() : undefined
    throw new WcHttpError(res.status, method === 'POST' ? message || undefined : undefined)
  }
  if (json === null) throw new WcHttpError(502)
  return { data: json as T, cartToken: res.headers.get('cart-token') ?? opts.cartToken ?? '' }
}

export async function wcFetch<T>(path: string, params: Params = {}, noStore = false): Promise<T> {
  return (await wcRequest<T>('GET', path, { params, noStore })).data
}
