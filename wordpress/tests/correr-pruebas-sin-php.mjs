/**
 * Corre wordpress/tests/decide-test.php SIN tener PHP instalado, con PHP 8.3 en WebAssembly (@php-wasm/node).
 * Es PHP real pero NO es WordPress: no sustituye una compra de prueba (README, playbook §4).
 *
 * Uso (las dependencias se instalan FUERA del repositorio, en una carpeta temporal):
 *   mkdir %TEMP%\phpwasm && cd %TEMP%\phpwasm && npm init -y && npm i @php-wasm/node @php-wasm/universal
 *   copy <repo>\wordpress\tests\correr-pruebas-sin-php.mjs .
 *   node correr-pruebas-sin-php.mjs <ruta-absoluta-a-la-carpeta-wordpress-del-repo>
 *
 * Imprime "N pruebas, M fallidas" y las líneas "NO - ..." con el motivo; el código de salida es 0 si no falló ninguna.
 * Notas: sin `processId` el runtime no arranca; el proceso no termina solo, por eso el process.exit al final.
 */
import { PHP } from '@php-wasm/universal'
import { loadNodeRuntime } from '@php-wasm/node'
import fs from 'node:fs'

const root = process.argv[2]
if (!root || !fs.existsSync(root + '/tests/decide-test.php')) {
  console.error('Uso: node correr-pruebas-sin-php.mjs <ruta-absoluta-a-la-carpeta-wordpress>')
  process.exit(2)
}

const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }))

function copy(dir, vdir) {
  php.mkdir(vdir)
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name
    const v = vdir + '/' + e.name
    if (e.isDirectory()) copy(p, v)
    else php.writeFile(v, fs.readFileSync(p))
  }
}
copy(root, '/work/wordpress')

let r
try {
  r = await php.run({ scriptPath: '/work/wordpress/tests/decide-test.php' })
} catch (e) {
  // El script sale con código 1 si alguna prueba falla; la respuesta viene dentro del error.
  r = e.response
}
const text = new TextDecoder().decode(r.bytes)
const lines = text.split('\n')
for (const l of lines) if (l.startsWith('NO - ') || /^\s+esperado/.test(l)) console.log(l)
console.log(lines.filter((l) => /pruebas, \d+ fallidas/.test(l)).join('\n') || text.slice(-400))
process.exit(r.exitCode === 0 ? 0 : 1)
