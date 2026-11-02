# Reporte de la noche: piezas reutilizables de la plantilla

Rama `fase0-woocommerce`. Trabajo sin red y sin tocar la tienda de prueba. Un commit por tarea, sin push.

## Resultado

| Comprobación | Resultado |
|---|---|
| Type-check (`npx tsc --noEmit`, incluye `api/`) | Pasa |
| Tests (`npm test`, ejecutor integrado de Node) | **50 de 50** |
| Build (`npm run build`) | Pasa |
| Secretos del servidor en `dist/` (`MP_ACCESS_TOKEN`, `RECONCILE_SECRET`, `WC_CONSUMER`, `Bearer`) | 0 coincidencias |
| Archivos prohibidos rastreados (`.tmp-*`, `.env*`, `dist/`, logs, `.gz`, `.claude/`) | Ninguno |

**No se hizo ninguna llamada de red real.** Los tests reemplazan `fetch` por uno que falla si se usa sin mock. No se leyó ni se mostró `.env.local` (tu regla de permisos lo bloquea). No se instaló ninguna librería: las pruebas usan `node --test` y TypeScript nativo de Node 26.

## Por tarea

### Tarea 1: conciliación (`6c93f96`)
- **Hecho:** `POST /api/reconcile` y `POST /api/reconcile-pending` (§6 del informe).
  - Lee el pedido por wc/v3. Si ya está `processing` o `completed` no escribe. Si está `cancelled`, `refunded` o `failed` no lo toca. Solo concilia `pending` y `on-hold` pagados con `woo-mercado-pago-basic`.
  - Busca en Mercado Pago por `external_reference = <prefijo><id>`. Solo con **un** pago `approved`, en CLP (pago y pedido) y con monto igual al `total` de wc/v3 hace `PUT set_paid: true` con `transaction_id` y deja una nota privada. Si no coincide, devuelve el motivo (`amount_mismatch`, `currency_mismatch`, `multiple_approved`, `no_approved_payment`).
  - **DRY_RUN activado por defecto:** solo el valor exacto `false` activa la escritura.
  - `/api/reconcile` valida `order_key` y email; un pedido inexistente, una clave errónea y un email erróneo dan **la misma respuesta**. Al navegador solo sale un código corto (nunca montos ni motivos).
  - `/api/reconcile-pending` exige `Authorization: Bearer <RECONCILE_SECRET>` (comparación en tiempo constante). Sin la variable responde 503; con secreto incorrecto, 401.
  - Antes de escribir, relee el pedido: si el aviso real llegó mientras tanto, no escribe.
  - `OrderPage`: tras los 5 minutos de sondeo, con el pedido aún `pending`, llama **una vez** a `/api/reconcile` y vuelve a consultar el estado.
- **Probado (solo mocks, 27 tests):** ya pagado, completado, cancelado/reembolsado/fallido, otra pasarela, monto distinto, monto ×100, moneda distinta (pago y pedido), pago aprobado correcto (PUT y nota), dry-run, `DRY_RUN` (solo `false`), variables faltantes sin mostrar valores, prefijo, pedido inexistente, key o email incorrectos, entradas inválidas, varios pagos aprobados, sin pago aprobado, carrera con el aviso real, errores de Mercado Pago y de WooCommerce, nota fallida, barrido, autenticación del barrido y respuesta al navegador.
- **Variables:** `MP_ACCESS_TOKEN`, `WC_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `RECONCILE_SECRET`, `ORDER_REFERENCE_PREFIX` (opcional) y `DRY_RUN`. Documentadas en `docs/variables-entorno.md`.

### Tarea 2: textos configurables (`fce77f5`)
- **Hecho:** `src/config/site.ts` tiene `deliveryCopy` con dos bloques, `shipped` y `coordinated`, y `site.delivery`. Con `shipping.enabled=false` (por defecto) la pantalla de pago aprobado, la insignia y el texto del inicio, la descripción SEO y los Términos hablan de retiro o coordinación con el vendedor. `OrderPage` y `TermsPage` leen de ahí. `.figma/make/site.json` pasó a una descripción sin "Despacho a todo Chile".
- **Probado:** 5 tests comprueban que el bloque `coordinated` no menciona envío, despacho ni seguimiento y que la configuración por defecto lo usa.
- **Nota:** el bloque `shipped` sigue dentro del bundle (no se muestra con `enabled=false`).

### Tarea 3: regiones y comunas (`5a22254`)
- **Hecho:** las 16 regiones y las 346 comunas, con los 16 códigos de WooCommerce. Mismas exportaciones (`REGIONS`, `REGION_CODES`) que usan `CheckoutPage` y `createCheckout`. Los Ríos es `CL-LR` (Valdivia) y Los Lagos es `CL-LL`.
- **Probado:** 6 tests (16 regiones, 346 comunas, cantidad oficial por región, sin repetidas, los 16 códigos coinciden con los de `wc/v3/data/countries/CL`, Valdivia en Los Ríos y Osorno en Los Lagos). El formulario compila.
- **Dato a revisar:** las listas de comunas las escribí de memoria; los tests cuentan cantidades por región pero **no** validan cada nombre.

### Tarea 4: Vercel (`2a73205`)
- **Hecho:** un rewrite de `vercel.json` no lee variables de entorno, así que usé la **función equivalente**: `api/wc/[...path].ts` más `api/_lib/wc-proxy.ts`. Lee `WC_URL`; lista blanca de rutas y métodos; no reenvía cookies ni `Authorization`; añade parámetro único a los GET; cachea el catálogo 30 s en el borde; unifica los errores de `/order/{id}` en un 404 (cierra la fuga de enumeración del informe §7). `vercel.json` solo tiene el fallback de la SPA, sin la URL de la tienda y sin tapar `/api/*`. Las variables y pasos de Vercel están en `docs/variables-entorno.md`.
- **Probado:** 12 tests con mocks (rutas, métodos, traversal `..`, cabeceras, caché, 404 uniforme, `vercel.json`).

### Tarea 5: guía (`b8f037e`)
- **Hecho:** `docs/nueva-tienda.md` con 8 fases, quién hace cada paso y su tiempo, todo marcado como **estimado**. Marqué como hecho el punto 7b del checklist del informe.

## Qué falta probar con la tienda real

1. **Conciliación contra Mercado Pago real**, con `DRY_RUN` activo y después `DRY_RUN=false`. La respuesta real de `payments/search` y el efecto de `set_paid` (¿deja `processing`, descuenta stock y envía correos?) **se asumieron** de la documentación; el propio **#28** sigue siendo el caso de prueba.
2. **Despliegue en Vercel real:** proxy, funciones, `vercel.json` y retorno a una URL pública. **Riesgo:** las funciones importan con extensión `.ts` (necesario para `node --test`); si el empaquetado de Vercel no la resuelve hay que cambiar la forma de importar.
3. **Navegador:** sigo sin herramienta para ver las pantallas; los textos y la llamada a `/api/reconcile` desde `OrderPage` no se vieron renderizados.
4. `shipping.enabled=true` **no está conectado a `shipping_rates`**: usa tarifas de ejemplo. No se tocó.
5. Las comunas (nombres exactos) con una fuente oficial.

## Tareas saltadas o parciales

- **`.env.example`:** **no se pudo crear.** Tu regla `Edit(./.env*)` bloquea escribir ese archivo. Lo sustituye `docs/variables-entorno.md`, que describe cada variable sin valores. Si lo quieres, quita esa regla un momento o créalo tú con ese contenido; además `.gitignore` tiene `.env*`, así que haría falta una excepción `!.env.example`.

## Otros avisos

- El primer commit incluyó el cambio pendiente de `.gitignore` (`.claude/settings.local.json`), como pediste.
- En desarrollo local (`npm run dev`) `/api/reconcile*` no existe (el servidor responde el `index.html`); la página lo ignora. Para probarlas hace falta `vercel dev`.
- Tu `settings.local.json` ahora permite `shutdown /s /t 120`. Solo lo ejecuto al final si todo está commiteado y limpio, como indicaste.

## Commits

```
b8f037e Tarea 5: guía para montar una tienda nueva (docs/nueva-tienda.md)
2a73205 Tarea 4: producción en Vercel (proxy /api/wc y fallback de la SPA)
5a22254 Tarea 3: las 16 regiones y 346 comunas de Chile con códigos de WooCommerce
fce77f5 Tarea 2: textos de despacho y seguimiento configurables en site.ts
6c93f96 Tarea 1: conciliación de pedidos pagados sin aviso (/api/reconcile*)
```

Más el commit de este reporte.
