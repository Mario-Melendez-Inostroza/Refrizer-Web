import assert from 'node:assert/strict'
import { test } from 'node:test'
import { REGIONS, REGION_CODES } from './regions.ts'

/** Estados de CL que expone WooCommerce (wc/v3/data/countries/CL, confirmado en la tienda de prueba). */
const WOO_CODES = ['CL-AI', 'CL-AN', 'CL-AP', 'CL-AR', 'CL-AT', 'CL-BI', 'CL-CO', 'CL-LI', 'CL-LL', 'CL-LR', 'CL-MA', 'CL-ML', 'CL-NB', 'CL-RM', 'CL-TA', 'CL-VS']

/** Cantidad oficial de comunas por región (346 en total desde la creación de Ñuble). */
const EXPECTED: Record<string, number> = {
  'Arica y Parinacota': 4, 'Tarapacá': 7, 'Antofagasta': 9, 'Atacama': 9, 'Coquimbo': 15, 'Valparaíso': 38, 'Región Metropolitana': 52,
  "O'Higgins": 33, 'Maule': 30, 'Ñuble': 21, 'Biobío': 33, 'Araucanía': 32, 'Los Ríos': 12, 'Los Lagos': 30, 'Aysén': 10, 'Magallanes': 11,
}

test('hay 16 regiones y 346 comunas', () => {
  assert.equal(Object.keys(REGIONS).length, 16)
  assert.equal(Object.values(REGIONS).flat().length, 346)
})

test('cada región tiene la cantidad oficial de comunas', () => {
  for (const [region, n] of Object.entries(EXPECTED)) assert.equal(REGIONS[region]?.length, n, region)
  assert.deepEqual(Object.keys(REGIONS).sort(), Object.keys(EXPECTED).sort())
})

test('no hay comunas repetidas dentro de una región ni nombres vacíos', () => {
  for (const [region, list] of Object.entries(REGIONS)) {
    assert.equal(new Set(list).size, list.length, `repetidas en ${region}`)
    assert.ok(list.every((c) => c.trim() === c && c.length > 1), `nombre inválido en ${region}`)
  }
})

test('cada región tiene un código distinto y son exactamente los 16 de WooCommerce', () => {
  assert.deepEqual(Object.keys(REGION_CODES).sort(), Object.keys(REGIONS).sort())
  assert.deepEqual(Object.values(REGION_CODES).sort(), [...WOO_CODES].sort())
})

test('Los Ríos es CL-LR (Valdivia) y Los Lagos es CL-LL (Osorno, Puerto Montt)', () => {
  assert.equal(REGION_CODES['Los Ríos'], 'CL-LR')
  assert.equal(REGION_CODES['Los Lagos'], 'CL-LL')
  assert.ok(REGIONS['Los Ríos'].includes('Valdivia'))
  assert.ok(!REGIONS['Los Lagos'].includes('Valdivia'))
  assert.ok(REGIONS['Los Lagos'].includes('Osorno') && REGIONS['Los Lagos'].includes('Puerto Montt'))
})

test('comunas homónimas viven en su región (Los Lagos existe en Los Ríos; O\'Higgins en Aysén)', () => {
  assert.ok(REGIONS['Los Ríos'].includes('Los Lagos'))
  assert.ok(REGIONS['Aysén'].includes("O'Higgins"))
})
