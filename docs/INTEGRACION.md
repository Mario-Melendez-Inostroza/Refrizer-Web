# Integración del motor de pagos en Refrizer

Rama de trabajo: `integracion-motor`. `main` no se toca sin aprobación de Mario. El diseño no se reescribe: se conectan los datos y el pago por debajo.

## 1. Estado actual (2026-11-02)

- Tienda React (Vite + Tailwind v4 + React Router) con diseño propio, en la raíz del sitio.
- Todo corre sobre mocks: catálogo en `src/mocks/` detrás de `src/services/products.ts`; carrito en memoria (`src/lib/cart.tsx`) que guarda el producto completo.
- `src/pages/Checkout.tsx` valida el formulario (RUT, región y comuna) pero termina en un `TODO` que navega a `/pedido/retorno?status=pending`.
- `src/pages/PaymentReturn.tsx` decide el estado solo por el query `status` (lo controla el comprador).
- Rutas ya compatibles con el motor: `/productos`, `/producto/:slug`, `/carrito`, `/checkout`, `/pedido/retorno`.
- Sin variantes: `Product` es producto simple.
- Sin pruebas, sin `build:hosting` (se agregó en la fase 0), sin proxy a WordPress (agregado en la fase 0).

## 2. Qué aporta el motor

Código de referencia en `docs/referencia-plantilla/` (se porta, no se copia encima):

- Cliente de la Store API de WooCommerce (`/wp/wp-json/wc/store/v1`, mismo origen, `credentials: omit`, `Cart-Token`, parámetro único para esquivar la caché del hosting).
- Creación del pedido (`/checkout`, método `woo-mercado-pago-basic`) y redirección a Mercado Pago Checkout Pro.
- Estado del pedido con `order_key` + correo guardados en el navegador; sondeo en `/pedido/retorno`.
- Conciliación: `POST /wp/wp-json/tienda/v1/reconcile` + plugin `wordpress/tienda-conciliacion/` + cron de cPanel cada 5 min.

## 3. Decisiones (tomadas el 2026-11-02, criterio: lo ya probado en el staging)

| Tema | Decisión | Motivo |
|---|---|---|
| Variantes | Sin variantes: un producto de WooCommerce por modelo (p. ej. "Aire 9.000 BTU" y "12.000 BTU") | Es lo probado; no cambia el diseño ni agrega casos de precio y stock |
| Carrito | Del navegador (localStorage, solo `productId` + cantidad). El carrito de WooCommerce se crea al pagar | Patrón de la plantilla; sin cookies; WooCommerce calcula el total y `expected_total` evita cobros distintos |
| Rutas | Las actuales, sin cambios. React en `/`, WordPress en `/wp` | Ya coinciden con el motor |
| Despacho | `shipping.enabled=false` (entrega coordinada) | Coincide con el copy actual del sitio |
| Mocks | Se conservan solo para desarrollo local sin WordPress (`VITE_USE_MOCKS=true`) | Permite trabajar el diseño sin servidor |
| `vercel.json` | Se retira en un commit aparte al final | Especificación obsoleta |
| RUT | Va en la nota del pedido (`RUT: …`); región como código `CL-XX`, comuna como ciudad | Limitación conocida del motor |

## 4. Fases (una por vez: verificación + commit al final)

| Fase | Contenido | Verificación |
|---|---|---|
| 0 | Base: scripts `typecheck` y `build:hosting`, proxy `WC_URL`, este documento, commit de `docs/` y `wordpress/` | `tsc --noEmit` y `build:hosting` limpios; `.htaccess` en `dist/`; sin secretos |
| 1 | Catálogo real: cliente Store API y `products`/`categories` leyendo de WooCommerce con los mismos tipos; pruebas unitarias | `npm test`, `tsc`, catálogo visible contra un WordPress |
| 2 | Carrito de ids y cantidades; precios desde el catálogo vivo | Probar agregar, quitar, recargar |
| 3 | Checkout: pedido en Store API, redirección a Mercado Pago, guardar `order_key` y correo | Compra con credenciales de prueba |
| 4 | Retorno: estado real, conciliación, textos para pagado, pendiente, rechazado y sin pago | Casos P1, P8 y P11 del ROADMAP |
| 5 | Despliegue: `.htaccess`, imágenes y LFS, build, cabeceras | Checklist del CLAUDE.md y playbook §3 |

El servidor (WordPress, plugin, cron, pruebas P1–P11 y paso a producción) sigue `docs/ROADMAP.md` y el playbook; las fases 3 a 5 necesitan que Mario tenga WordPress listo (S1–S7).

## 5. Pendientes que dependen de Mario o la clienta

Dominio, hosting, carpeta del sitio en el servidor, cuenta vendedora de Mercado Pago, productos reales, textos legales y un buzón de correo del dominio. Ver `docs/DATOS-CLIENTA.md`.
