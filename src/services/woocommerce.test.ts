import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeText, mapCategory, mapProduct, sanitizeHtml, type StoreProduct } from './woocommerce.ts'

const base: StoreProduct = {
  id: 7,
  name: 'Aire &amp; Climatizaci&#8211;n',
  slug: 'aire-12000',
  short_description: '<p>Split <strong>inverter</strong></p>',
  description: '<p>Texto</p><script>alert(1)</script><img src=x onerror=alert(1)>',
  prices: { price: '399990', regular_price: '429990', sale_price: '399990', currency_code: 'CLP', currency_minor_unit: 0 },
  images: [{ id: 1, src: 'https://x.cl/a.jpg', thumbnail: 'https://x.cl/a-150.jpg', alt: 'Aire' }],
  categories: [{ id: 3, name: 'Aire &amp; frío', slug: 'aire' }],
  is_in_stock: true,
}

test('mapProduct: precios enteros CLP como string, nombre decodificado', () => {
  const p = mapProduct(base)
  assert.equal(p.name, 'Aire & Climatizaci–n')
  assert.deepEqual([p.prices.price, p.prices.regular_price, p.prices.sale_price], ['399990', '429990', '399990'])
  assert.equal(p.categories[0].name, 'Aire & frío')
  assert.equal(p.featured, false)
})

test('mapProduct: sin oferta, sale_price queda vacío', () => {
  const p = mapProduct({ ...base, prices: { ...base.prices, price: '12990', regular_price: '12990', sale_price: '12990' } })
  assert.equal(p.prices.sale_price, '')
})

test('mapProduct: respeta currency_minor_unit', () => {
  const p = mapProduct({ ...base, prices: { ...base.prices, price: '1299000', regular_price: '1299000', sale_price: '', currency_minor_unit: 2 } })
  assert.equal(p.prices.price, '12990')
})

test('sanitizeHtml: quita scripts, atributos y etiquetas no permitidas', () => {
  assert.equal(sanitizeHtml(base.description), '<p>Texto</p>')
  assert.equal(sanitizeHtml('<p onclick="x()" style="a">Hola <a href="javascript:x">link</a></p>'), '<p>Hola link</p>')
  assert.equal(sanitizeHtml('<ul><li>A</li></ul>'), '<ul><li>A</li></ul>')
})

test('decodeText y mapCategory', () => {
  assert.equal(decodeText('<b>A</b> &amp; B &#x41;'), 'A & B A')
  assert.deepEqual(mapCategory({ id: 1, name: 'Otros', slug: 'otros', image: null }), { id: 1, name: 'Otros', slug: 'otros', image: null })
})
