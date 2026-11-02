import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deliveryCopy, site } from './site.ts'

const SHIPPING_WORDS = /camino|seguimiento|despach|puerta|env[ií]o|enviamos/i

test('sin despacho (coordinated): ningún texto menciona envío, despacho ni seguimiento', () => {
  for (const [key, text] of Object.entries(deliveryCopy.coordinated)) {
    assert.doesNotMatch(text, SHIPPING_WORDS, `${key}: "${text}"`)
  }
})

test('sin despacho (coordinated): hay textos de retiro o coordinación con el vendedor', () => {
  const all = Object.values(deliveryCopy.coordinated).join(' ')
  assert.match(all, /retiro/i)
  assert.match(all, /coordin/i)
})

test('con despacho (shipped): conserva los textos de despacho y seguimiento', () => {
  assert.match(deliveryCopy.shipped.paidTitle, /camino/i)
  assert.match(deliveryCopy.shipped.paidText, /seguimiento/i)
})

test('los dos bloques tienen exactamente las mismas claves', () => {
  assert.deepEqual(Object.keys(deliveryCopy.shipped).sort(), Object.keys(deliveryCopy.coordinated).sort())
})

test('la configuración por defecto (shipping.enabled=false) usa los textos coordinated en todas las pantallas', () => {
  assert.equal(site.shipping.enabled, false)
  const used = [
    site.seo.homeDescription, site.home.heroText, site.home.deliveryBadgeValue, site.home.deliveryBadgeText,
    site.delivery.paidTitle, site.delivery.paidText, site.delivery.termsTitle, site.delivery.termsText,
  ]
  for (const text of used) assert.doesNotMatch(text, SHIPPING_WORDS, text)
  assert.equal(site.delivery.paidTitle, deliveryCopy.coordinated.paidTitle)
})
