import assert from 'node:assert/strict'
import { test } from 'node:test'
import { returnedWithoutPayment } from './return.ts'

const q = (s: string) => new URLSearchParams(s)

test('retorno sin pagar: status, collection_status y payment_id en "null" (caso real del pedido #29)', () => {
  assert.equal(returnedWithoutPayment(q('collection_id=null&collection_status=null&payment_id=null&status=null&external_reference=WC-29')), true)
})

test('retorno sin parámetros de pago o con valores vacíos', () => {
  assert.equal(returnedWithoutPayment(q('external_reference=WC-29')), true)
  assert.equal(returnedWithoutPayment(q('status=&payment_id=&collection_status=')), true)
})

test('retorno con un pago (aprobado, pendiente o rechazado) no se trata como "sin pagar"', () => {
  assert.equal(returnedWithoutPayment(q('status=approved&payment_id=186623937052&collection_status=approved')), false)
  assert.equal(returnedWithoutPayment(q('status=pending&payment_id=1')), false)
  assert.equal(returnedWithoutPayment(q('status=rejected&payment_id=1&collection_status=rejected')), false)
  assert.equal(returnedWithoutPayment(q('payment_id=123')), false)
})
