import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_QTY, parseLines } from './cartStorage.ts'

test('parseLines: acepta líneas válidas y descarta basura', () => {
  const raw = JSON.stringify([
    { productId: 1, quantity: 2, price: '1' },
    { productId: 2, quantity: 0 },
    { productId: '3', quantity: 1 },
    { productId: 4, quantity: 1.5 },
    null,
    { productId: 1, quantity: 5 },
  ])
  assert.deepEqual(parseLines(raw), [{ productId: 1, quantity: 2 }])
})

test('parseLines: JSON roto, vacío o no arreglo da carrito vacío; cantidad tope', () => {
  assert.deepEqual(parseLines('{'), [])
  assert.deepEqual(parseLines(null), [])
  assert.deepEqual(parseLines('{"a":1}'), [])
  assert.deepEqual(parseLines(JSON.stringify([{ productId: 9, quantity: 5000 }])), [{ productId: 9, quantity: MAX_QTY }])
})
