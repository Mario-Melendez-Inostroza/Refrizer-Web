# Montar una tienda nueva (plantilla React headless sobre WooCommerce)

Guía paso a paso, basada en el checklist y en la tabla de horas de `docs/fase0-informe.md` (§2 y §11).

**Cómo leer los tiempos:** **todos son ESTIMADOS**. Se calcularon en la Fase 0 pero **no se midieron en una segunda tienda**, y Mario no entregó el desglose de sus horas de la Fase 0. Se muestran como "est." Los pasos de Claude Code también son estimados. La única cifra *medida* de esta guía es la demora del aviso de pago (1 s a 2 min 4 s, mediana 45,5 s, 8 medidas).

**Quién:** **Cliente** (el dueño de la tienda), **Mario** (quien monta y vende el servicio) o **Claude Code** (el asistente de programación, en el repositorio).

**Arquitectura (desde 2026-10-11): todo en BenzaHosting (cPanel), sin Vercel.**

| Ruta en el dominio | Qué es | Carpeta en el hosting |
|---|---|---|
| `https://<dominio>/` | Tienda React compilada (`dist/`) | `public_html/` |
| `https://<dominio>/wp/` | WordPress + WooCommerce + plugin de Mercado Pago + plugin `tienda-conciliacion` | `public_html/wp/` |
| (sin URL) | Cron de conciliación por línea de comandos | `/home/USUARIO/tienda-cron/` |
| (sin URL) | `config.php` con el token de Mercado Pago | `/home/USUARIO/tienda-secretos/` |

**Estado (2026-10-29):** esta estructura está implementada y **ya se probó en el staging de BenzaHosting** (React en la raíz, WordPress en `/wp`, plugin y cron): compra completa, retorno a `/pedido/retorno`, conciliación de un pago sin aviso y pedido cancelado con pago aprobado. La prueba obligatoria 5.6 está **parcialmente hecha**; lo que falta está en `docs/ROADMAP.md` (secciones 3 y 6). Para una tienda nueva hay que repetirla entera en su dominio.

**Regla de oro:** las credenciales (token de Mercado Pago, secretos) viven solo en `config.php` fuera de `public_html` (servidor) o en `.env.local` (desarrollo). Nunca en el código, el chat, los commits ni los logs (`docs/variables-entorno.md`).

**Qué cuesta (informe §8):** hosting ~CLP 2.500/mes (cifra de Mario, **no verificada**); dominio `.cl` ~CLP 9.990/año (fuente de búsqueda, no la oficial); **Vercel ya no hace falta** (el plan Pro de US$20 por usuario al mes solo aplicaba a la arquitectura anterior); comisión de Mercado Pago a cargo del cliente, **3,80 % observado en una cuenta de prueba** (tarifa de terceros: 3,19 % + IVA al instante, 2,89 % + IVA a 10 días; **confirmar la tarifa real** en el Simulador de comisiones de la cuenta del cliente).

---

## Fase 0. Antes de empezar

| # | Paso | Quién | Tiempo (est.) | Nota |
|---|---|---|---|---|
| 0.1 | Contratar hosting con cPanel y dominio `.cl` **a nombre del cliente** | Cliente | 0,5 h | Mario le dice qué plan. El hosting debe tener WordPress, PHP 8.x y SSL. |
| 0.2 | Cuenta **vendedora** de Mercado Pago del cliente, verificada | Cliente | 0,5 h | Aquí sale el token de producción (paso 3.4). |
| 0.3 | Explicar la **comisión de Mercado Pago** y confirmarla en el Simulador de la cuenta | Mario + Cliente | 0,25 h | Antes de contratar (informe §8, checklist 10). |
| 0.4 | Reunir contenido: 10 a 25 productos (fotos, descripciones, precios con IVA, stock), categorías, textos legales, contacto | Cliente | est. variable | Lo carga Mario en 1.5. |
| 0.5 | Decidir **despacho o no**: con retiro/coordinación (`shipping.enabled=false`, lo normal) o con tarifas | Cliente + Mario | 0,25 h | Con `true` el selector usa tarifas de ejemplo hasta conectar `shipping_rates` (no probado). |

## Fase 1. WordPress y WooCommerce (Mario)

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 1.1 | Instalar WordPress y WooCommerce en la subcarpeta **`public_html/wp/`** del dominio del cliente. En *Ajustes > Generales*, **Dirección de WordPress y Dirección del sitio ambas en `https://<dominio>/wp`**: si la del sitio apunta a la raíz, WordPress ocupa las rutas de la tienda React | Mario | 1,0 a 1,5 h (con 2.1) | `https://<dominio>/wp/` abre por HTTPS. **NO PROBADO** con esta estructura. |
| 1.1b | **Enlaces permanentes distintos de "Simple"** (*Ajustes > Enlaces permanentes*, p. ej. "Nombre de la entrada") y guardar. Con "Simple", las rutas `/wp/wp-json/...` no funcionan [indicio: comportamiento conocido de WordPress] | Mario | 0,05 h | `https://<dominio>/wp/wp-json/wc/store/v1/products` responde JSON con el catálogo. |
| 1.2 | Ajustes generales: país Chile, moneda **CLP sin decimales**, precios **con IVA incluido** (impuestos desactivados si ya lo incluyen) | Mario | incl. | `wc/v3` devuelve precios enteros. |
| 1.3 | **Visibilidad del sitio: Visible.** Con "Próximamente" el aviso de Mercado Pago falló con 502 en la Fase 0 | Mario | incl. | Abrir el sitio sin sesión. |
| 1.4 | **Envío:** si `shipping.enabled=false`, *WooCommerce > Ajustes > General > Ubicación(es) de envío > Desactivar envío y cálculos de envío* | Mario | incl. | `GET /wp-json/wc/store/v1/cart` con un producto: `needs_shipping: false`. |
| 1.5 | Cargar productos y categorías (fotos, descripción, stock, **destacados con estrella**) | Mario | 2,0 a 4,0 h | `GET /wp-json/wc/store/v1/products` los lista; `featured=true` devuelve los destacados. |
| 1.6 | Inventario: **Mantener stock (minutos)** mayor que el tiempo de conciliación | Mario | 0,1 h | La cancelación automática de pedidos sin pagar **no operó** en la tienda de prueba (causa abierta, informe §5); no depender de ella. |

## Fase 2. Plugin de Mercado Pago (Mario)

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 2.1 | Instalar el plugin oficial "Mercado Pago payments for WooCommerce" y vincular la cuenta del cliente | Mario | 0,5 h | Credenciales aceptadas por el plugin. |
| 2.2 | Activar **Checkout Pro** con método **Redirect** (no Modal, no Checkout API) | Mario | 0,1 h | Un `POST /checkout` devuelve `payment_result.redirect_url` de `mercadopago.cl`. |
| 2.3 | **Abrir las opciones avanzadas del plugin y GUARDAR.** En la Fase 0 así empezó a registrarse el aviso (IPN) | Mario | 0,1 h | Un pago de prueba cambia el pedido a `processing` en segundos. |
| 2.4 | Debug encendido **solo** durante las pruebas; **Rastreo de orden a 5 minutos** como respaldo | Mario | 0,1 h | El debug se apaga al entregar (paso 6.3). |
| 2.5 | Anotar el **prefijo de referencia** del plugin (`WC-` por defecto) | Mario | 0,05 h | Debe coincidir con `site.orders.referencePrefix` y con `ORDER_REFERENCE_PREFIX`. |
| 2.6 | No hace falta configurar Webhooks en el panel de desarrolladores (**inferido**: el plugin recibe IPN en `/wc-api/WC_WooMercadoPago_Basic_Gateway/`; con WordPress en `/wp`, en `https://<dominio>/wp/wc-api/...`, **NO PROBADO**) | Mario | 0 h | En la Fase 0 llegaron 11 avisos IPN por esa ruta (WordPress en la raíz del subdominio). |

## Fase 3. Configuración secreta

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 3.1 | **Ya no se crea la clave REST de lectura y escritura** de WooCommerce: el plugin `tienda-conciliacion` usa funciones internas de WooCommerce. *(Obsoleto: la versión de Vercel la necesitaba para `PUT set_paid`.)* Si quedó alguna clave de pruebas, se revoca | Mario | 0 h | *Ajustes > Avanzado > API REST* sin claves de escritura activas. |
| 3.2 | **Ya no se genera `RECONCILE_SECRET`**: el cron corre por línea de comandos y no tiene URL. *(Obsoleto con Vercel.)* | Mario | 0 h | |
| 3.3 | Crear `/home/USUARIO/tienda-secretos/config.php` **fuera de `public_html`**, a partir de `wordpress/config.example.php`, con **permisos 600** (Administrador de archivos de cPanel > Permisos) | Mario | 0,2 h | El archivo no se puede abrir desde el navegador (está fuera de `public_html`). |
| 3.4 | El cliente entrega el **Access Token de producción** de Mercado Pago por un medio seguro; va directo a `TC_MP_ACCESS_TOKEN` en ese `config.php` | Cliente + Mario | 0,1 h | Nunca en el chat, en un correo sin cifrar ni en el repositorio. |
| 3.5 | En ese `config.php`: `TC_DRY_RUN` en **`true`** (queda así hasta pasar la prueba 5.6), `TC_MIN_AGE_SECONDS` en `300` (segundos que el pago debe llevar aprobado antes de escribir), `TC_REFERENCE_PREFIX` igual al prefijo de 2.5 y **`TC_MP_SELLER_ID`** con el ID numérico del vendedor dueño del token (el mismo que usa el plugin oficial de Mercado Pago en WooCommerce). **`TC_MP_SELLER_ID` es obligatorio antes de poner `TC_DRY_RUN` en `false`**: sin él el conciliador solo corre en simulación y se niega a escribir (`seller_not_configured`) | Mario | incl. | Significado de cada constante en `docs/variables-entorno.md` §2. Con el ID bien puesto, la cabecera del registro dice `vendedor=match`; con uno equivocado, `error: seller_mismatch` y no consulta ni escribe nada. |
| 3.6 | Cargar el archivo desde `public_html/wp/wp-config.php`: añadir `require_once '/home/USUARIO/tienda-secretos/config.php';` **antes** de la línea `/* That's all, stop editing! */` | Mario | 0,1 h | El sitio sigue cargando (un error de ruta deja WordPress en blanco: revisar la ruta). |
| 3.7 | Solo para desarrollo local: `.env.local` con `WC_URL` de un WordPress de prueba (proxy de Vite) | Claude Code | 0,05 h | `npm run dev` lista el catálogo. |

## Fase 4. Frontend en el hosting

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 4.1 | Copiar la plantilla y editar `src/config/site.ts`: nombre, contacto, razón social, banner, `shipping.enabled`, `deliveryCopy` (dos bloques de textos), prefijo de referencia | Claude Code | 0,5 h | `npm test` (los textos "coordinated" no mencionan envío). |
| 4.2 | Editar `.figma/make/site.json` (título y descripción): es un archivo aparte, no sale de `site.ts` | Claude Code | 0,1 h | Sin "Despacho a todo Chile" si no despacha. |
| 4.3 | Revisar las páginas estáticas de la marca (Términos, Cambios y devoluciones, Contacto) | Claude Code + Cliente | est. variable | Los textos de despacho dependen de `site.delivery`. |
| 4.4 | Compilar con **`npm run build:hosting`** (**no** `npm run build`: el modo `hosting` deja la base en `/` aunque exista `FIGMA_PUBLIC_URL`) | Claude Code | 0,1 h | `dist/` contiene `index.html`, `assets/` y `.htaccess`; `index.html` referencia `/assets/...`. Búsqueda de secretos en `dist/` sin coincidencias. |
| 4.5 | **Antes de subir:** abrir el `public_html/.htaccess` que ya exista en el hosting. Si tiene un bloque generado por cPanel (p. ej. `# php -- BEGIN cPanel-generated handler`, que fija la versión de PHP desde MultiPHP Manager), **copiarlo al principio** del `.htaccess` nuevo en lugar de perderlo. **[Hipótesis]** Si se pierde, `/wp` podría quedar con otra versión de PHP | Mario | 0,1 h | El bloque de cPanel sigue presente tras subir. |
| 4.6 | Subir **solo el contenido de `dist/`** a `public_html/` (Administrador de archivos con "mostrar archivos ocultos" para ver `.htaccess`, o FTP). **Nunca** subir `.git`, `.env*`, `.tmp-*`, logs, `node_modules`, `src` ni `wordpress/`. No borrar ni pisar `public_html/wp/` | Mario | 0,25 h | En `public_html/` solo `index.html`, `assets/`, `.htaccess`, `wp/` (y lo que ya tuviera el hosting, p. ej. `cgi-bin`). |
| 4.7 | Dominio del cliente apuntando a BenzaHosting (DNS) y certificado SSL (AutoSSL de cPanel) | Mario + Cliente | 0,25 h | HTTPS válido en `https://<dominio>/` y `https://<dominio>/wp/`. |
| 4.8 | En el plugin de Mercado Pago, `success_url`, `failure_url` y `pending_url` = `https://<dominio>/pedido/retorno` | Mario | 0,1 h | Mercado Pago vuelve con `external_reference=<prefijo><id>`. |
| 4.9 | **Comprobaciones del mismo origen (NO PROBADAS en el hosting):** (a) `https://<dominio>/wp/wp-json/wc/store/v1/products` devuelve el catálogo; (b) recargar directamente `https://<dominio>/pedido/retorno` y `https://<dominio>/producto/<slug>` muestra la tienda, no un 404 (`.htaccess`); (c) `https://<dominio>/wp/wp-admin/` sigue funcionando; (d) las cabeceras de `/assets/*.js` traen `Cache-Control: public, max-age=31536000, immutable` y `index.html` trae `no-cache` | Mario + Claude Code | 0,25 h | Si (b) falla, el hosting no está leyendo `.htaccess` (posible nginx sin Apache detrás): **parar** y consultar a soporte antes de seguir. |

*Obsoleto (arquitectura anterior):* crear el proyecto en Vercel Pro con sus variables y apuntar el DNS a Vercel; las verificaciones `GET /api/wc/products` y `POST /api/reconcile-pending` sin cabecera = 401. `api/` y `vercel.json` siguen en el repositorio como especificación y se retirarán solo después de que pase la prueba 5.6.

## Fase 5. Respaldo ante avisos perdidos (conciliación)

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 5.1 | Comprobar la **caché del hosting** sobre la Store API (informe §10b): repetir la misma URL de `/wp/wp-json/wc/store/v1/order/{id}` y una con parámetro único; ~600 ms frente a ~30 ms indica caché | Claude Code + Mario | 0,25 h | El frontend ya usa parámetro único y `no-store` en `/order`, y en el catálogo un parámetro que cambia cada 30 s. El plugin añade `Cache-Control: no-store` a `/order` y `/cart`; **NO PROBADO** que la caché del hosting lo respete. Si el hosting ignora los parámetros, excluir `/wp/wp-json/` de su caché. |
| 5.2 | Comprobar el **total ×100** de `/order/{id}` (CLP): con un pedido de prueba, `totals.total_price` frente al total del pedido en WooCommerce | Claude Code | 0,1 h | **No** usar nunca ese total para cobrar ni conciliar (el plugin usa el total del pedido). |
| 5.3 | Instalar el plugin **`tienda-conciliacion`**: comprimir `wordpress/tienda-conciliacion/` en zip, *Plugins > Añadir nuevo > Subir plugin*, activar (necesita WooCommerce activo y el `config.php` de la Fase 3) | Mario | 0,2 h | `POST https://<dominio>/wp/wp-json/tienda/v1/reconcile` con cuerpo `{}` responde `{"ok":true,"result":"not_found"}`. **NO PROBADO.** |
| 5.4 | **Versión de PHP:** en cPanel > **MultiPHP Manager**, anotar la versión asignada al dominio (**8.3 o superior**, mínimo exigido por BenzaHosting; la misma que usa WordPress). **Ruta del binario para el cron:** suele ser `/opt/cpanel/ea-phpXX/root/usr/bin/php` (`XX` = versión). **Confirmada en BenzaHosting:** `/opt/cpanel/ea-php83/root/usr/bin/php`, con `PHP 8.3.35`, SAPI `cli` y las extensiones `curl`, `json`, `posix`, `hash` y `openssl`, comprobado con un Cron Job de diagnóstico. En otro hosting, confírmala con soporte o con un cron de prueba que ejecute `<ruta>/php -v >> /home/USUARIO/tienda-cron/version.txt` | Mario | 0,25 h | `version.txt` muestra la misma versión que MultiPHP Manager. Si el plan no permite PHP por línea de comandos en el cron, **parar**: el plan B (Action Scheduler) no está implementado. |
| 5.5 | Copiar `wordpress/cron/tc-cron.php` a `/home/USUARIO/tienda-cron/` (**fuera de `public_html`**) y crear el cron de cPanel **cada 5 minutos**: `<ruta-confirmada>/php -q /home/USUARIO/tienda-cron/tc-cron.php /home/USUARIO/public_html/wp/wp-load.php >> /home/USUARIO/tienda-cron/registro.txt 2>&1` | Mario | 0,25 h | `registro.txt` muestra `barrido dry_run=si vendedor=<estado> pedidos=N silenciados=K` cada 5 min, y una línea por pedido (id, resultado, motivo; sin datos personales) salvo los cerrados ya avisados o revisados hace poco, que solo se cuentan en `silenciados`. Si no aparece ninguna línea nueva, el cron no está corriendo (o corre con un binario que no es CLI y termina sin escribir). **NO PROBADO.** |
| 5.5b | Cron de cPanel sobre `wp-cron.php` (opcional), ahora en `https://<dominio>/wp/wp-cron.php` | Mario | 0,25 h | WP-Cron corrió bien en la tienda de prueba (informe §10e); es un respaldo del rastreo. **No** rescata un pago sin aviso (probado). |
| 5.6 | **PRUEBA REAL OBLIGATORIA ANTES DE ENTREGAR A UN CLIENTE** (lista de abajo). Solo si todo pasa: `TC_DRY_RUN` en `false` para la operación normal | Mario + Claude Code | est. 1,5 a 2,5 h (sin medir) | Cada punto de la lista con su resultado anotado. Lo que no se pueda forzar (p. ej. el reintento del IPN) se anota como **no probado**, no como aprobado. |

### 5.6 Prueba real obligatoria (antes de entregar a un cliente)

En una **tienda de prueba propia** con la estructura definitiva (`https://<dominio>/` + `https://<dominio>/wp/`), nunca en `gbike.cl` ni en la tienda de un cliente con ventas reales.

1. **Preparación:** WordPress en `/wp`, plugin de Mercado Pago en modo prueba, producto con stock conocido (p. ej. 10), acceso al correo del administrador y del comprador, `TC_DRY_RUN` en `true` y `TC_MP_SELLER_ID` configurado (la cabecera del registro debe decir `vendedor=match`; con `unconfigured` o `seller_mismatch` no se puede pasar al paso 4).
2. **Caso "aviso perdido":** bloquear el IPN a propósito con una regla en `public_html/wp/.htaccess` que devuelva 403 a `wc-api/WC_WooMercadoPago_Basic_Gateway`. Pagar un pedido y confirmar en el registro de acceso de cPanel que el IPN fue rechazado.
3. **Simulación:** pasados 5 min desde el pago, ejecutar el cron → el registro dice `would_mark_paid` **solo** para ese pedido. Stock y correos sin cambios. (Antes de 5 min debe decir `pending` con motivo `too_recent`.)
4. **Escritura:** comprobar antes que `TC_MP_SELLER_ID` está configurado y da `vendedor=match` (sin él, `TC_DRY_RUN=false` no escribe: `seller_not_configured`); luego `TC_DRY_RUN` en `false` y ejecutar el cron. Resultado esperado: pedido en `processing` (o `completed` si es solo virtual), `date_paid` y `transaction_id` = id del pago, nota "Conciliado por la función propia", **stock 10→9**, **un** correo al comprador y **uno** a la tienda.
5. **Idempotencia:** ejecutar el cron dos veces más y llamar a la ruta REST → `already_paid`. Stock sigue en 9 y no hay correos nuevos.
6. **IPN tardío:** quitar el bloqueo de 2 y esperar (o forzar desde el panel de Mercado Pago, si lo permite) el reintento → el pedido sigue en `processing`, stock 9, sin correos duplicados. Si Mercado Pago no reintenta, anotarlo como **no probado**.
7. **Cancelado o reembolsado:** un pedido pagado con el IPN bloqueado y luego cancelado a mano → el cron **no** lo marca. Deja una nota y envía **un** correo al administrador; al repetir el cron no llega un segundo correo. El stock repuesto no se vuelve a descontar. Repetir con uno `refunded`.
8. **Monto distinto:** editar el total de un pedido pendiente ya pagado → `review`, nota y un correo; no se marca.
9. **Ruta REST:** key o email incorrectos y pedido inexistente → la misma respuesta (`not_found`); una segunda llamada antes de 60 s → `try_later`.
10. **Concurrencia:** dos ejecuciones del cron a la vez → una dice "otra ejecución en curso".
11. **Frontend completo en el navegador:**
    - compra en `https://<dominio>/` y retorno a `/pedido/retorno`;
    - recarga directa de `/pedido/retorno` y `/producto/<slug>` (`.htaccess`);
    - estado "Pagado";
    - caché de `/order` (URL repetida frente a URL única, informe §11.0);
    - caché de `/products` tras cambiar un stock: debe verse en ≤ 30 s más lo que tarde la caché del navegador;
    - `Cache-Control: no-store` en `/wp/wp-json/wc/store/v1/order/{id}`.

**Cuando la prueba pase:** dejar `TC_DRY_RUN` en `false`. En el repositorio, retirar `api/` y `vercel.json` (Claude Code, en un commit aparte).

## Fase 6. Pruebas y entrega

| # | Paso | Quién | Tiempo (est.) | Verificación |
|---|---|---|---|---|
| 6.1 | **Dos pagos de prueba** de un producto barato desde el sitio, con Mario pagando | Mario | 1,0 a 1,5 h | Estado `processing`, **stock baja al pagar** (no al crear el pedido), `/pedido/retorno` muestra "Pagado". En la Fase 0 el aviso tardó 1 s a 124 s. |
| 6.2 | Verificar datos de Chile en el pedido de prueba: RUT en la nota (`RUT: …`), región como código `CL-XX`, comuna como ciudad | Mario | incl. | El RUT **no** es un campo estructurado (limitación, informe §4). |
| 6.3 | Apagar el **modo debug** del plugin y dejar el **Rastreo en 5 min** | Mario | 0,1 h | |
| 6.4 | Explicar la comisión y las limitaciones (pedidos abandonados que no se cancelan solos) al cliente; entregar accesos | Mario + Cliente | 0,5 h | |
| 6.5 | Revisión semanal: pedidos pendientes que figuren **aprobados** en el panel de Mercado Pago | Mario | est. 0,25 h/semana | Un pago sin aviso (como el #28) solo lo recupera la conciliación. |

## Fase 7. Limpieza de la tienda de pruebas (si la hubo)

Subdominio y base de datos de prueba, aplicación de pruebas de Mercado Pago y su webhook, **revocar** las claves REST temporales, borrar pedidos y productos de prueba, borrar crons de cPanel temporales y **avisar al dueño del hosting**. Detalle en `docs/fase0-informe.md` §10.

---

## Total estimado (de las horas de Mario)

Alrededor de **6 a 11 h** por tienda nueva, según la tabla del informe §2(b), **sin medir** en una segunda tienda. La carga de productos (1.5) es la parte más variable. **No incluye la prueba real obligatoria 5.6** (est. 1,5 a 2,5 h, sin medir), que se añadió con el traslado a BenzaHosting. Con el desglose real de las horas de la Fase 0 (que Mario aún no entregó) se corrige esta cifra.

## Lo que sigue SIN probar (tenerlo presente)

Probado en el staging de BenzaHosting el 2026-10-28 y 29 (detalle en `docs/ROADMAP.md`): estructura `/` + `/wp`, `.htaccess` de la SPA, Store API en el mismo origen, plugin `tienda-conciliacion`, cron de cPanel con PHP CLI, `payment_complete()` real (estado, `date_paid`, stock una vez, correos), búsqueda real en Mercado Pago, retorno a `/pedido/retorno` y cabeceras de seguridad.

- **Aún sin probar de la conciliación:** el IPN tardío después de conciliar (¿duplica stock o correos?), el pedido `refunded`, el monto distinto, `seller_mismatch`, dos crons a la vez (`GET_LOCK`) y el campo `transaction_amount_refunded` de Mercado Pago.
- **Caché del hosting:** que respete `Cache-Control: no-store` en `/order` (el catálogo ya no depende de ella: la URL cambia cada 30 s).
- **Correos:** llegan, pero a spam, porque el remitente de WooCommerce era una cuenta de Gmail (DMARC falla). En la tienda real el remitente debe ser del dominio de la clienta, con SPF, DKIM y DMARC en PASS.
- **Envío activo** (`shipping.enabled=true`): usa tarifas de ejemplo.
- La opción B (`order-pay`) y la opción C completa (webhook propio con HMAC).
- *Obsoleto, ya no se probará:* el despliegue en Vercel real (proxy `/api/wc`, funciones `api/*`, importaciones con extensión `.ts`).
