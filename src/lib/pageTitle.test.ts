import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageTitle } from './pageTitle.ts'

test('título por página: "Productos | Refrizer" y vuelta al título por defecto', () => {
  assert.equal(pageTitle('Productos', 'Refrizer', 'Refrigeración & Electricidad'), 'Productos | Refrizer')
  assert.equal(pageTitle('  Contacto  ', 'Refrizer', 'Refrigeración & Electricidad'), 'Contacto | Refrizer')
  assert.equal(pageTitle(undefined, 'Refrizer', 'Refrigeración & Electricidad'), 'Refrizer – Refrigeración & Electricidad')
  assert.equal(pageTitle('   ', 'Refrizer', 'Refrigeración & Electricidad'), 'Refrizer – Refrigeración & Electricidad')
})
