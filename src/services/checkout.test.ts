/** Tests sin red: la Store API se reemplaza por un doble que responde según la ruta. */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createCheckout } from './checkout.ts'
import { lastOrderId } from './orders.ts'
import type { CheckoutPayload } from '../types'

const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear() },
})

interface Call { path: string; method: string; token: string | null; body: any }
let calls: Call[] = []

function stubStoreApi(redirect = 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1', paymentStatus = 'success') {
  calls = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const path = String(url).replace('/wp/wp-json/wc/store/v1', '').split('?')[0]
    const h = init.headers as Record<string, string>
    calls.push({ path, method: String(init.method), token: h['Cart-Token'] ?? null, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const body = path === '/checkout' ? { order_id: 31, order_key: 'wc_order_abc', payment_result: { payment_status: paymentStatus, redirect_url: redirect } } : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', 'Cart-Token': `t${calls.length}` } })
  }) as typeof fetch
}

const payload: CheckoutPayload = {
  customer: { firstName: 'Ana', lastName: 'Pérez Soto', email: 'ana@correo.cl', phone: '+56 9 1234 5678', rut: '12.345.678-5' },
  shipping: { region: 'Región Metropolitana', commune: 'Santiago', address: 'Calle 1 #23' },
  notes: 'Tocar timbre',
  expectedTotal: 25980,
  items: [{ productId: 102, quantity: 2 }, { productId: 101, quantity: 1 }],
}

beforeEach(() => store.clear())

test('createCheckout: carrito nuevo, items por id, cliente, checkout y redirección a Mercado Pago', async () => {
  stubStoreApi()
  const r = await createCheckout(payload)
  assert.equal(r.redirectUrl, 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1')
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ['GET /cart', 'POST /cart/add-item', 'POST /cart/add-item', 'POST /cart/update-customer', 'POST /checkout'])
  assert.deepEqual(calls[1].body, { id: 102, quantity: 2 })
  assert.equal(calls[1].token, 't1') // el Cart-Token de cada respuesta se reenvía en la siguiente petición
  const checkout = calls[4].body
  assert.equal(checkout.payment_method, 'woo-mercado-pago-basic')
  assert.equal(checkout.expected_total, '25980') // texto, no número
  assert.equal(checkout.billing_address.state, 'CL-RM')
  assert.equal(checkout.billing_address.city, 'Santiago')
  assert.equal(checkout.billing_address.country, 'CL')
  assert.equal(checkout.billing_address.email, 'ana@correo.cl')
  assert.equal(checkout.customer_note, 'RUT: 12.345.678-5\nTocar timbre')
})

test('createCheckout: guarda order_key y correo para consultar el pedido al volver', async () => {
  stubStoreApi()
  await createCheckout(payload)
  assert.equal(lastOrderId(), '31')
  assert.deepEqual(JSON.parse(store.get('pedido:31')!), { key: 'wc_order_abc', email: 'ana@correo.cl' })
})

test('createCheckout: carrito vacío, pago no exitoso o URL que no es https se rechazan', async () => {
  stubStoreApi()
  await assert.rejects(createCheckout({ ...payload, items: [] }), /vacío/)
  stubStoreApi('https://www.mercadopago.cl/x', 'failure')
  await assert.rejects(createCheckout(payload), /No pudimos iniciar el pago/)
  stubStoreApi('http://evil.example/x')
  await assert.rejects(createCheckout(payload), /No pudimos iniciar el pago/)
  stubStoreApi('javascript:alert(1)')
  await assert.rejects(createCheckout(payload), /No pudimos iniciar el pago/)
  assert.equal(lastOrderId(), null) // un pago fallido no deja acceso guardado
})
