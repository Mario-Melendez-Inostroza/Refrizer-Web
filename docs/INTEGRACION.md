# Integraci贸n del motor de pagos en Refrizer

Rama de trabajo: `integracion-motor`. `main` no se toca sin aprobaci贸n de Mario. El dise帽o no se reescribe: se conectan los datos y el pago por debajo.

## 1. Estado actual (2026-11-02)

- Tienda React (Vite + Tailwind v4 + React Router) con dise帽o propio, en la ra铆z del sitio.
- Todo corre sobre mocks: cat谩logo en `src/mocks/` detr谩s de `src/services/products.ts`; carrito en memoria (`src/lib/cart.tsx`) que guarda el producto completo.
- `src/pages/Checkout.tsx` valida el formulario (RUT, regi贸n y comuna) pero termina en un `TODO` que navega a `/pedido/retorno?status=pending`.
- `src/pages/PaymentReturn.tsx` decide el estado solo por el query `status` (lo controla el comprador).
- Rutas ya compatibles con el motor: `/productos`, `/producto/:slug`, `/carrito`, `/checkout`, `/pedido/retorno`.
- Sin variantes: `Product` es producto simple.
- Sin pruebas, sin `build:hosting` (se agreg贸 en la fase 0), sin proxy a WordPress (agregado en la fase 0).

## 2. Qu茅 aporta el motor

C贸digo de referencia en `docs/referencia-plantilla/` (se porta, no se copia encima):

- Cliente de la Store API de WooCommerce (`/wp/wp-json/wc/store/v1`, mismo origen, `credentials: omit`, `Cart-Token`, par谩metro 煤nico para esquivar la cach茅 del hosting).
- Creaci贸n del pedido (`/checkout`, m茅todo `woo-mercado-pago-basic`) y redirecci贸n a Mercado Pago Checkout Pro.
- Estado del pedido con `order_key` + correo guardados en el navegador; sondeo en `/pedido/retorno`.
- Conciliaci贸n: `POST /wp/wp-json/tienda/v1/reconcile` + plugin `wordpress/tienda-conciliacion/` + cron de cPanel cada 5 min.

## 3. Decisiones (tomadas el 2026-11-02, criterio: lo ya probado en el staging)

| Tema | Decisi贸n | Motivo |
|---|---|---|
| Variantes | Sin variantes: un producto de WooCommerce por modelo (p. ej. "Aire 9.000 BTU" y "12.000 BTU") | Es lo probado; no cambia el dise帽o ni agrega casos de precio y stock |
| Carrito | Del navegador (localStorage, solo `productId` + cantidad). El carrito de WooCommerce se crea al pagar | Patr贸n de la plantilla; sin cookies; WooCommerce calcula el total y `expected_total` evita cobros distintos |
| Rutas | Las actuales, sin cambios. React en `/`, WordPress en `/wp` | Ya coinciden con el motor |
| Despacho | `shipping.enabled=false` (entrega coordinada) | Coincide con el copy actual del sitio |
| Mocks | Se conservan solo para desarrollo local sin WordPress (`VITE_USE_MOCKS=true`) | Permite trabajar el dise帽o sin servidor |
| `vercel.json` | Se retira en un commit aparte al final | Especificaci贸n obsoleta |
| RUT | Va en la nota del pedido (`RUT: 鈥); regi贸n como c贸digo `CL-XX`, comuna como ciudad | Limitaci贸n conocida del motor |

## 4. Fases (una por vez: verificaci贸n + commit al final)

| Fase | Contenido | Verificaci贸n |
|---|---|---|
| 0 | Base: scripts `typecheck` y `build:hosting`, proxy `WC_URL`, este documento, commit de `docs/` y `wordpress/` | `tsc --noEmit` y `build:hosting` limpios; `.htaccess` en `dist/`; sin secretos |
| 1 | Cat谩logo real: cliente Store API y `products`/`categories` leyendo de WooCommerce con los mismos tipos; pruebas unitarias | `npm test`, `tsc`, cat谩logo visible contra un WordPress |
| 2 | Carrito de ids y cantidades; precios desde el cat谩logo vivo | Probar agregar, quitar, recargar |
| 3 | Checkout: pedido en Store API, redirecci贸n a Mercado Pago, guardar `order_key` y correo | Compra con credenciales de prueba |
| 4 | Retorno: estado real, conciliaci贸n, textos para pagado, pendiente, rechazado y sin pago | Casos P1, P8 y P11 del ROADMAP |
| 5 | Despliegue: `.htaccess`, im谩genes y LFS, build, cabeceras | Checklist del CLAUDE.md y playbook 搂3 |

El servidor (WordPress, plugin, cron, pruebas P1鈥揚11 y paso a producci贸n) sigue `docs/ROADMAP.md` y el playbook; las fases 3 a 5 necesitan que Mario tenga WordPress listo (S1鈥揝7).

## 5. Pendientes que dependen de Mario o la clienta

Dominio, hosting, carpeta del sitio en el servidor, cuenta vendedora de Mercado Pago, productos reales, textos legales y un buz贸n de correo del dominio. Ver `docs/DATOS-CLIENTA.md`.

## 6. Avance

- **Fase 0** (hecha, 2026-11-02): base, scripts, proxy, este documento.
- **Fase 1** (c贸digo hecho, 2026-11-02): `src/services/client.ts` (Store API, mismo origen), `woocommerce.ts` (mapeo + sanitizado del HTML de descripciones) y `products.ts` leyendo de WooCommerce. Verificado con `npm test` (14 pruebas), `tsc` y `build:hosting`. **No probado en vivo** contra WordPress: falta un WooCommerce con productos.
  - Desarrollo con datos de ejemplo: `VITE_USE_MOCKS=true` en `.env.local`.
  - Desarrollo contra un WordPress real: `WC_URL=https://<dominio>` en `.env.local` (el proxy de Vite traduce `/wp/wp-json` a `WC_URL/wp-json`).
- **Fase 2** (hecha, 2026-11-02): el carrito guarda solo `{ productId, quantity }` en localStorage (`refrizer.cart.v1`) y reconstruye nombre, imagen y precio desde el cat醠ogo en cada visita (`src/lib/cart.tsx`, `cartStorage.ts`); descarta productos que ya no existen. Verificado con `npm test` (16 pruebas), `tsc` y en el navegador con mocks (agregar, recargar, cantidad 2 = 25.980, id inexistente descartado). **No probado** con WooCommerce real.
- **Fase 3** (c骴igo hecho, 2026-11-02): `src/services/checkout.ts` crea el carrito en la Store API por Cart-Token, env韆 el pedido con `woo-mercado-pago-basic` y redirige a Mercado Pago (solo https); guarda `order_key` y correo para consultar el pedido. El Checkout valida nombre y apellido (se separan para WooCommerce), usa las 16 regiones y 346 comunas con c骴igos `CL-XX`, muestra errores y bloquea el bot髇 al enviar. RUT en la nota del pedido. Verificado con `npm test` (34 pruebas, la secuencia de la Store API con un doble), `tsc`, `build:hosting` y en el navegador con mocks (validaciones, listas de regi髇 y comuna, mensaje de error sin WordPress). **No probado:** una compra real; falta WordPress, WooCommerce y Mercado Pago.
