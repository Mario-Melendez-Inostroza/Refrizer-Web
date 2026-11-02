import { ORDER_REFERENCE_PREFIX } from '../config/orders.ts'
import type { OrderStatus, OrderStatusResponse } from '../types'
import { wcFetch } from './client.ts'

/**
 * La Store API solo entrega un pedido con order_key + email del comprador (ambos, o responde 401).
 * Se guardan en este navegador al crear el pedido; /pedido/:id no se puede enumerar sin ellos.
 */
interface OrderAccess { key: string; email: string }
const accessKey = (id: string) => `pedido:${id}`
const LAST_KEY = 'pedido:ultimo'

export function saveOrderAccess(id: number | string, access: OrderAccess) {
  try {
    localStorage.setItem(accessKey(String(id)), JSON.stringify(access))
    localStorage.setItem(LAST_KEY, String(id))
  } catch { /* almacenamiento bloqueado: el estado no se podrá consultar en este navegador */ }
}

/** Último pedido creado en este navegador (el retorno de Mercado Pago llega a una URL fija, sin id). */
export function lastOrderId(): string | null {
  try { return localStorage.getItem(LAST_KEY) } catch { return null }
}

/** Id del pedido desde external_reference ("WC-26" -> "26"). Si no cuadra con prefijo + solo dígitos, null. */
export function orderIdFromReference(ref: string | null): string | null {
  const prefix = ORDER_REFERENCE_PREFIX
  if (!ref || !ref.startsWith(prefix)) return null
  const id = ref.slice(prefix.length)
  return /^\d+$/.test(id) ? id : null
}

export const hasOrderAccess = (id: string) => readAccess(id) !== null

function readAccess(id: string): OrderAccess | null {
  try {
    const raw = localStorage.getItem(accessKey(id))
    return raw ? (JSON.parse(raw) as OrderAccess) : null
  } catch { return null }
}

/** Ruta del plugin tienda-conciliacion (wordpress/), en el mismo origen que la tienda. */
export const RECONCILE_URL = '/wp/wp-json/tienda/v1/reconcile'

/** Únicos códigos que devuelve el plugin al navegador: nunca montos ni motivos (ni "review"). */
export type ReconcileCode = 'not_found' | 'already_paid' | 'marked_paid' | 'pending' | 'try_later'
const RECONCILE_CODES: readonly ReconcileCode[] = ['not_found', 'already_paid', 'marked_paid', 'pending', 'try_later']

/** Cualquier valor fuera de la lista (p. ej. "review" de la versión de Vercel) cuenta como 'pending': no cambia nada en pantalla. */
export function parseReconcileCode(body: unknown): ReconcileCode {
  const result = typeof body === 'object' && body !== null ? (body as { result?: unknown }).result : undefined
  return RECONCILE_CODES.find((c) => c === result) ?? 'pending'
}

/** Solo vale la pena volver a consultar el estado si el servidor dice que el pedido ya quedó pagado. */
export const reconcileSaysPaid = (code: ReconcileCode | null) => code === 'marked_paid' || code === 'already_paid'

/**
 * Pide al servidor que concilie el pedido con Mercado Pago cuando el aviso de pago no llegó.
 * No lleva credenciales: solo la order_key y el email del propio comprador. Devuelve null si no se pudo preguntar
 * (sin acceso guardado, sin red, sin plugin o error HTTP); en ese caso el cron de cPanel sigue cubriendo el pedido.
 */
export async function requestReconcile(orderId: string): Promise<ReconcileCode | null> {
  const access = /^\d+$/.test(orderId) ? readAccess(orderId) : null
  if (!access) return null
  try {
    const res = await fetch(RECONCILE_URL, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderKey: access.key, email: access.email }),
    })
    if (!res.ok) return null
    return parseReconcileCode(await res.json().catch(() => null))
  } catch {
    return null
  }
}

const PAID = ['processing', 'completed']
const FAILED = ['failed', 'cancelled', 'refunded']

export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const access = /^\d+$/.test(orderId) ? readAccess(orderId) : null
  if (!access) throw new Error('Pedido no encontrado')
  // El hosting cachea las respuestas GET por URL (se vio una copia "pending" más de 8 min tras el pago):
  // cada consulta lleva un parámetro único y cache: 'no-store'. Aplica al sondeo y al botón "Actualizar estado".
  const order = await wcFetch<{ id: number; status: string }>(
    `/order/${orderId}`,
    { key: access.key, billing_email: access.email, _: Date.now() },
    true,
  )
  const status: OrderStatus = PAID.includes(order.status) ? 'paid' : FAILED.includes(order.status) ? 'failed' : 'pending'
  return { id: String(order.id), status }
}
