/** Tests sin red: fetch se reemplaza por uno que falla, salvo donde cada test instala su doble. */
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { buildWcUrl, WC_BASE, WcHttpError, wcRequest } from './client.ts'

const noNetwork = (() => {
  throw new Error('Red prohibida en los tests')
}) as typeof fetch
globalThis.fetch = noNetwork
afterEach(() => {
  globalThis.fetch = noNetwork
})

interface Call { url: string; init: RequestInit }
function stubFetch(status: number, body: unknown, headers: Record<string, string> = {}): Call[] {
  const calls: Call[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
  }) as typeof fetch
  return calls
}

test('la Store API se pide en el mismo origen, bajo /wp', () => {
  assert.equal(WC_BASE, '/wp/wp-json/wc/store/v1')
  assert.ok(buildWcUrl('GET', '/cart').startsWith('/wp/wp-json/wc/store/v1/cart'))
})

test('catálogo: _ = bloque de 30 s (Math.floor(ahora / 30000))', () => {
  assert.equal(buildWcUrl('GET', '/products', { per_page: 100 }, 90_000), `${WC_BASE}/products?per_page=100&_=3`)
  assert.equal(buildWcUrl('GET', '/products/categories', { per_page: 100 }, 90_000), `${WC_BASE}/products/categories?per_page=100&_=3`)
  assert.equal(buildWcUrl('GET', '/products/prensa-francesa', {}, 90_000), `${WC_BASE}/products/prensa-francesa?_=3`)
})

test('catálogo: misma URL dentro de la ventana de 30 s, otra al cambiar de ventana', () => {
  const at = (now: number) => buildWcUrl('GET', '/products', {}, now)
  assert.equal(at(60_000), at(89_999))
  assert.notEqual(at(89_999), at(90_000))
})

test('estado del pedido: se respeta el _ (marca de tiempo única) que trae el llamador', () => {
  const url = buildWcUrl('GET', '/order/31', { key: 'wc_order_abc', billing_email: 'a@b.cl', _: 1_791_335_825_123 }, 90_000)
  assert.equal(url, `${WC_BASE}/order/31?key=wc_order_abc&billing_email=a%40b.cl&_=1791335825123`)
})

test('sin _ fuera del catálogo y en POST; /productsx no cuenta como catálogo', () => {
  assert.equal(buildWcUrl('GET', '/cart', {}, 90_000), `${WC_BASE}/cart`)
  assert.equal(buildWcUrl('POST', '/cart/add-item', {}, 90_000), `${WC_BASE}/cart/add-item`)
  assert.equal(buildWcUrl('POST', '/products', {}, 90_000), `${WC_BASE}/products`)
  assert.equal(buildWcUrl('GET', '/productsx', {}, 90_000), `${WC_BASE}/productsx`)
})

test('parámetros vacíos o undefined no viajan', () => {
  assert.equal(buildWcUrl('GET', '/cart', { a: undefined, b: '', c: 0, d: false }), `${WC_BASE}/cart?c=0&d=false`)
})

test('wcRequest: credentials omit (sin cookies de WordPress), Cart-Token y sin no-store por defecto', async () => {
  const calls = stubFetch(200, { items: [] }, { 'Cart-Token': 'nuevo-token' })
  const r = await wcRequest('POST', '/cart/add-item', { body: { id: 17, quantity: 1 }, cartToken: 'token-previo' })
  assert.equal(r.cartToken, 'nuevo-token')
  const { url, init } = calls[0]
  assert.equal(url, `${WC_BASE}/cart/add-item`)
  assert.equal(init.credentials, 'omit')
  assert.equal(init.cache, undefined)
  assert.equal((init.headers as Record<string, string>)['Cart-Token'], 'token-previo')
  assert.equal(init.body, JSON.stringify({ id: 17, quantity: 1 }))
})

test('wcRequest: noStore pide cache no-store y sigue omitiendo credenciales', async () => {
  const calls = stubFetch(200, { id: 31, status: 'pending' })
  await wcRequest('GET', '/order/31', { params: { _: 1 }, noStore: true })
  assert.deepEqual([calls[0].init.cache, calls[0].init.credentials], ['no-store', 'omit'])
})

test('wcRequest: error de un POST muestra el mensaje de WooCommerce sin HTML; un GET usa el genérico', async () => {
  stubFetch(400, { message: '<strong>El total</strong> cambió' })
  await assert.rejects(wcRequest('POST', '/checkout', { body: {} }), (e: WcHttpError) => e.status === 400 && e.message === 'El total cambió')
  stubFetch(404, { message: 'interno /wp-json/x' })
  await assert.rejects(wcRequest('GET', '/products/x'), (e: WcHttpError) => e.status === 404 && !e.message.includes('wp-json'))
})
