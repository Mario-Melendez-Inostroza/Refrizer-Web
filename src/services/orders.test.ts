/** Tests sin red ni navegador: fetch y localStorage se reemplazan por dobles. */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { getOrderStatus, parseReconcileCode, RECONCILE_URL, reconcileSaysPaid, requestReconcile, saveOrderAccess } from './orders.ts'

const noNetwork = (() => {
  throw new Error('Red prohibida en los tests')
}) as typeof fetch
globalThis.fetch = noNetwork

const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
})

beforeEach(() => {
  store.clear()
  globalThis.fetch = noNetwork
})
afterEach(() => {
  globalThis.fetch = noNetwork
})

interface Call { url: string; init: RequestInit }
function stubFetch(respond: () => Response): Call[] {
  const calls: Call[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return respond()
  }) as typeof fetch
  return calls
}
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ACCESS = { key: 'wc_order_abc', email: 'comprador@example.com' }

test('getOrderStatus: /wp/wp-json/.../order/{id} con key, email, _ = marca de tiempo única y cache no-store', async () => {
  saveOrderAccess(31, ACCESS)
  const calls = stubFetch(json(200, { id: 31, status: 'processing' }))
  const before = Date.now()
  assert.deepEqual(await getOrderStatus('31'), { id: '31', status: 'paid' })
  const url = new URL(calls[0].url, 'https://tienda.example')
  assert.equal(url.pathname, '/wp/wp-json/wc/store/v1/order/31')
  assert.equal(url.searchParams.get('key'), ACCESS.key)
  assert.equal(url.searchParams.get('billing_email'), ACCESS.email)
  // Marca de tiempo en ms (no el bloque de 30 s del catálogo): cada consulta esquiva la caché del hosting.
  assert.ok(Number(url.searchParams.get('_')) >= before)
  assert.deepEqual([calls[0].init.cache, calls[0].init.credentials], ['no-store', 'omit'])
})

test('getOrderStatus: estados de WooCommerce a estados de la tienda', async () => {
  saveOrderAccess(31, ACCESS)
  for (const [wc, ours] of [['completed', 'paid'], ['pending', 'pending'], ['on-hold', 'pending'], ['cancelled', 'failed'], ['refunded', 'failed'], ['failed', 'failed']]) {
    stubFetch(json(200, { id: 31, status: wc }))
    assert.equal((await getOrderStatus('31')).status, ours, wc)
  }
})

test('getOrderStatus: sin acceso guardado no consulta', async () => {
  const calls = stubFetch(json(200, {}))
  await assert.rejects(getOrderStatus('31'))
  assert.equal(calls.length, 0)
})

test('requestReconcile: POST a la ruta del plugin con el mismo cuerpo, sin credenciales ni caché', async () => {
  assert.equal(RECONCILE_URL, '/wp/wp-json/tienda/v1/reconcile')
  saveOrderAccess(31, ACCESS)
  const calls = stubFetch(json(200, { ok: true, result: 'marked_paid' }))
  assert.equal(await requestReconcile('31'), 'marked_paid')
  const { url, init } = calls[0]
  assert.equal(url, RECONCILE_URL)
  assert.equal(init.method, 'POST')
  assert.deepEqual([init.cache, init.credentials], ['no-store', 'omit'])
  assert.deepEqual(JSON.parse(String(init.body)), { orderId: '31', orderKey: ACCESS.key, email: ACCESS.email })
})

test('requestReconcile: devuelve los cinco códigos del plugin tal cual', async () => {
  saveOrderAccess(31, ACCESS)
  for (const code of ['not_found', 'already_paid', 'marked_paid', 'pending', 'try_later']) {
    stubFetch(json(200, { ok: true, result: code }))
    assert.equal(await requestReconcile('31'), code)
  }
})

test('requestReconcile: "review" (versión de Vercel) u otro valor desconocido cuenta como pending', async () => {
  saveOrderAccess(31, ACCESS)
  for (const body of [{ ok: true, result: 'review' }, { result: 'would_mark_paid' }, { result: 8990 }, {}, null, 'texto']) {
    stubFetch(json(200, body))
    assert.equal(await requestReconcile('31'), 'pending', JSON.stringify(body))
  }
  stubFetch(() => new Response('<html>no json</html>', { status: 200 }))
  assert.equal(await requestReconcile('31'), 'pending')
})

test('requestReconcile: sin acceso, id inválido, error HTTP o sin red devuelve null', async () => {
  let calls = stubFetch(json(200, { result: 'marked_paid' }))
  assert.equal(await requestReconcile('31'), null)
  assert.equal(await requestReconcile('../31'), null)
  assert.equal(calls.length, 0)
  saveOrderAccess(31, ACCESS)
  calls = stubFetch(json(404, { code: 'rest_no_route' }))
  assert.equal(await requestReconcile('31'), null)
  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch')
  }) as typeof fetch
  assert.equal(await requestReconcile('31'), null)
})

test('reconcileSaysPaid: solo marked_paid y already_paid justifican volver a consultar el estado', () => {
  assert.equal(reconcileSaysPaid('marked_paid'), true)
  assert.equal(reconcileSaysPaid('already_paid'), true)
  for (const code of ['not_found', 'pending', 'try_later', null] as const) assert.equal(reconcileSaysPaid(code), false, String(code))
})

test('parseReconcileCode: solo acepta la propiedad result', () => {
  assert.equal(parseReconcileCode({ result: 'already_paid' }), 'already_paid')
  assert.equal(parseReconcileCode({ code: 'already_paid' }), 'pending')
})
