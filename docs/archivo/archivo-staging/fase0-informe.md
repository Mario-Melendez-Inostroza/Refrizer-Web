# Fase 0: prueba técnica WooCommerce headless (informe final)

Escrito para: Mario Melendez, decisor sobre ofrecer React headless sobre WooCommerce o WooCommerce tradicional con tema propio (tiendas de 10 a 25 productos, ~CLP $180.000).
Fecha de la prueba: 2026-10-06. Sitio de prueba: `tienda-prueba.gbike.cl`. Rama: `fase0-woocommerce`.

## 1. Veredicto: **B** (decidido por Mario)

**B: producto de tienda con red de seguridad** (verificación propia en un servidor que concilia pedidos pagados sin aviso). No se recomienda A a CLP 180.000, ni C.

- **Qué funciona (camino A):** el pago por Checkout Pro funciona **sin PHP propio**. La Store API con `Cart-Token` crea el pedido, devuelve el enlace de Mercado Pago y el aviso (IPN) lo confirma. De 11 pagos aprobados tras la reconfiguración, **10 tuvieron aviso** (1 s a 124 s, mediana 45,5 s).
- **Qué lo lleva a B:** el pedido **#28** se pagó en Mercado Pago (21:17) y **Mercado Pago no llamó al sitio** (registro de acceso del servidor, §10e): no hubo rechazo ni error 5xx. Sin aviso, el plugin no guarda los datos del pago, y **ni el cron real de cPanel ni el botón de sincronizar lo rescatan** (prueba del cron real, 22:49 a 23:08: #28, #27 y #24 siguen pendientes). Solo una verificación propia que consulte a Mercado Pago lo recupera (§6).
- **Limitaciones confirmadas del camino A:** el RUT viaja en `customer_note` (no es un campo estructurado y exigir uno requiere PHP); la cancelación automática de pedidos sin pagar **no opera en este sitio** (los pedidos abandonados se acumulan, sin afectar el stock: sigue en 14); la caché del hosting sirve estados atrasados de `/order/{id}` (corregido con parámetro único, §10b).
- **No probado:** la opción B (`order-pay`), un despliegue público en Vercel y el envío activo. La opción C solo está diseñada. *(Histórico: ver §6 para la arquitectura vigente en BenzaHosting.)*

## 1b. Tabla A / B / C

| Camino | Umbral (tu regla) | Lo medido | ¿Aplica? |
|---|---|---|---|
| **A** (recomendado para $180.000) | El pago funciona sin PHP propio **y** tus horas por tienda nueva ≤ 8 | El pago funciona sin PHP, pero un pago sin aviso (#28) solo se recupera con verificación propia. Horas repetibles por tienda: **sin medir** (estimación 6 a 11 h) | **No** |
| **B** (solo producto premium) | Horas por tienda entre 8 y 15, **o exige un webhook o verificación propia** | **Exige verificación propia** (conciliación, §6). Estimación 6 a 11 h por tienda con ella incluida | **Sí: veredicto** |
| **C** (no recomendado) | El pago no funciona en un día, o horas por tienda > 15 | El pago funcionó el primer día (#25, 20:50). No hay indicio de más de 15 h | No |

**Nota sobre las horas:** las horas que deciden el umbral son las **repetibles por tienda** (§2). Mario aportó un total de ~10 h para toda la Fase 0 (mezcla aprendizaje único y trabajo repetible) sin desglose; con ese dato **no se puede** fijar la cifra repetible, por eso el umbral por horas queda sin medir y el veredicto se apoya en la cláusula "exige verificación propia".

## 2. Horas

**Mías (Claude Code), tiempo de reloj:** de 20:19 a 23:13, **2 h 55 min** (175 min), incluidas las esperas de pagos y de lecturas programadas. Más ~35 min de investigación inicial **anteriores a las 20:19, que son una estimación mía**.
**Tuyas (manuales), según Mario:** **~10 h en total** (estimadas por Mario, no cronometradas). **Desglose NO informado:** Mario dejó en blanco los minutos por tipo (WordPress y WooCommerce, Mercado Pago, pruebas de pago, logs y lecturas, hosting y cPanel incluido el cron, otros).

### (a) Aprendizaje único de la Fase 0 (no se repite)
Descubrir la Store API y el CORS, el proxy, `createCheckout`, el retorno con `external_reference`, el diagnóstico del IPN (hallazgo 4) y del #28.

### (b) Horas repetibles por tienda nueva (**ESTIMACIÓN**, no medida en una segunda tienda)
| # | Paso del checklist por tienda | Tus horas |
|---|---|---|
| 1 | Subdominio, WordPress, WooCommerce, plugin de Mercado Pago, vincular cuenta | 1,0 a 1,5 |
| 2 | **Guardar las opciones avanzadas del plugin**; debug encendido; Rastreo a 5 min; moneda CLP; envío desactivado; "Mantener stock" | 0,5 a 1,0 |
| 3 | Cargar 10 a 25 productos (fotos, descripciones, stock, destacados) | 2,0 a 4,0 |
| 4 | Claves REST, variables de entorno, deploy del frontend | 0,5 a 1,0 |
| 5 | `success_url`, `failure_url`, `pending_url` hacia `/pedido/retorno`; `site.ts` (textos, prefijo) | 0,5 |
| 6 | Dos pagos de prueba y verificación de estado y stock | 1,0 a 1,5 |
| 7 | Cron real de cPanel sobre `wp-cron.php` | 0,25 |
| 8 | **Red de seguridad** (token de Mercado Pago, variables, disparador) | 0,5 a 1,0 |
| | **Total** | **6,25 a 10,75 (≈ 8 a 9 h típico)** |

Estas horas son una **estimación mía**, no una medición en una segunda tienda; con el desglose real de Mario (§2) se reemplaza. El veredicto B no depende de ellas: se apoya en que un pago sin aviso exige verificación propia (§1).

## 3. Qué funcionó y qué no (con evidencia)

| Hallazgo | Estado | Evidencia |
|---|---|---|
| 1. #20 a #22 quedaron pendientes pese al pago | **INFERIDO**: notificaciones mal registradas; se arregló al guardar la configuración avanzada | Lo dedujiste de logs; no probado |
| 2. `CPP_NT_0602004 … KVS getValue not found` | **INFERIDO**: Mercado Pago no tenía aviso registrado para ese pago | Coherente con falta de IPN |
| 3. Simulador: 502 con "Próximamente", 200 con sitio Visible | **CONFIRMADO** el comportamiento; **INFERIDO** la causa. El servidor responde `nginx` (cabecera `Server`), probablemente un proxy frente a PHP; un 502 es un error del proxy hacia PHP, no del plugin. No hay logs del servidor para probarlo | Cabecera + tus pruebas |
| 4. ¿Rastreo o aviso real? | **CONFIRMADO: aviso real (IPN)**, con Rastreo apagado | Logs del plugin: #25 pago creado 20:50:08, IPN procesada 20:50:23, 15 s después `pending` a `processing`. Las notas de wc/v3 dan 20:50:23 |
| 5. Stock | **CONFIRMADO**: baja **al pagar**, no al crear. Al crear solo hay reserva de 60 min | #25: 7→6 a 20:50:23; #26: 6→5 a 21:07:43; #29: 5→4 a 21:19:49; nota "Mantenimiento en inventario durante 60 minutos" |
| 6. Retorno | **CONFIRMADO**: Mercado Pago vuelve con `external_reference=WC-26`, `payment_id`, `status`, `collection_id`, `merchant_order_id`, `preference_id`. El contador vacío es **INFERIDO** el nombre del vendedor | Pago real del #26 (lo viste tú) |
| IPN perdido (#28) | **CONFIRMADO**: pago aprobado 21:17, ningún IPN en `abstractnotification`; sin caja de estado ni botón sync | Tus logs; wc/v3: `pending` sin `date_paid` a las 21:28 |
| El rastreo (y el cron real) tampoco rescata un pedido sin aviso | **CONFIRMADO** por la prueba del cron real (Mario, 22:49 a 23:08: cron de cPanel cada 5 min sobre `wp-cron.php`) | #28, #27 y #24 siguen "Pendiente de pago"; el registro de acceso confirma que Mercado Pago no llamó por el #28 |
| **#31: "Pago pendiente" en `/pedido/retorno` a las 21:44 aunque pagó a las 21:41:24** | **CAUSA MÁS PROBABLE (INFERIDA con evidencia fuerte): caché del servidor sobre `/order/{id}`**. El IPN sí llegó (21:42:12) y WooCommerce lo marcó `processing` a las 21:42:13 (wc/v3 y Store API hoy lo confirman) | URL única cada vez: 627 a 674 ms; misma URL repetida: 11 a 51 ms; sin cabeceras `Cache-Control`/`ETag`/`Last-Modified`. Pidiendo la misma URL cada 5 s durante 238 s hubo **47 aciertos seguidos y ningún expiró**, más que la ventana de 2 min del sondeo. `GET /cart` **no** está cacheado (6 `Cart-Token` distintos en 6 peticiones, ~600 ms): no hay mezcla de carritos |

Otros hechos confirmados con wc/v3 y la Store API:
- Opción A funciona: `POST /checkout` 200, `payment_result.redirect_url` = `www.mercadopago.cl/checkout/v1/redirect?pref_id=…`.
- `expected_total` existe y debe ser **texto** (con número da 400).
- No exigió código postal ni otros campos con envío desactivado.
- `/order/{id}` exige `order_key` **y** email (401 si falta cualquiera).

**No probado:** opción B (`order-pay`) y opción C (solo diseño); el retorno hacia `localhost` o hacia un dominio público (hay que cambiar `success_url`); producción en Vercel (el proxy actual es solo de desarrollo) *(Histórico: ver §6 para la arquitectura vigente en BenzaHosting.)*; envío activo (`shipping.enabled=true` usa tarifas de ejemplo); navegador real (no tuve herramienta, la interfaz la probaste tú).

## 4. Chile (paso 7)
- **RUT:** viaja en `customer_note` como `RUT: 11.111.111-1` (confirmado en el #26). **Limitación:** no es un campo estructurado, no se puede filtrar ni exportar. Un campo propio exige PHP (`woocommerce_register_additional_checkout_field`), por lo que afecta el umbral "sin PHP propio".
- **Región y comuna:** llegan como estado `CL-LL` y ciudad `Osorno` (confirmado en #26).
- **Retiro vs domicilio:** no probado; el envío está desactivado por decisión.
- El formulario solo tiene 6 regiones de ejemplo y falta Los Ríos (Valdivia).

## 5. Lecturas de control (#24, #27, #28) y resultado de la prueba del cron
- **#24** (control, creado 20:41:56): primera lectura a las 21:42:32, **ya pasados los 60 min de reserva**: sigue `pending`, stock 4, sin nota de cancelación. Se repitió a las 21:44:33 y a las 21:46:35 (unos 4,5 min tras vencer la reserva): **sigue `pending` en las tres lecturas**. WooCommerce cancela pendientes con una tarea programada (WP-Cron), que no corre en el segundo exacto; el plazo real de cancelación queda por medir.
- **#27 y #28** (reserva de 60 min vencida a las 22:15 y 22:16): lecturas a las 22:18:20 y 22:21:22. **Siguen `pending`, sin nota de cancelación.** El #28 (pagado en Mercado Pago a las 21:17) sigue sin `date_paid` ni notas de pago.
- **Resultado de la prueba del cron real (Mario, revisado a las 23:08; mis lecturas wc/v3 a las 23:10 coinciden):** el cron de cPanel cada 5 min, creado a las 22:49, **no cambió nada**: #28, #27 y #24 siguen "Pendiente de pago".
  1. **CONFIRMADO:** el cron real **no rescata** un pedido sin aviso; sin aviso el plugin no guarda los datos del pago.
  2. **Limitación confirmada:** aunque WP-Cron funciona (§10e), **la cancelación automática de pedidos sin pagar no opera en este sitio**; los pedidos abandonados se acumulan. **No afecta el stock** (sigue en 14, sin descuento por pedidos pendientes). La causa sigue abierta (¿ajuste o filtro que la desactiva?).
  3. **CONFIRMADO** con el registro de acceso: Mercado Pago no llamó por el #28 y no hubo errores 5xx en el día.
- **#24 a las 22:21:28:** `pending` a los **100 min** de crearse, **40 min después de vencer su reserva**. **#27** también sigue `pending` a las 22:21:22 (6 min después de vencer su reserva, creado 21:15:23). **Hecho confirmado:** la cancelación automática de pedidos sin pagar **no se vio** en esa ventana.
  - **Hipótesis "WP-Cron no corre bien": RETIRADA.** El registro de acceso del servidor muestra `wp-cron.php` 353 veces en el día, todas con 200, en 102 de los 116 minutos entre 21:10 y 23:05 (hueco máximo 117 s); 345 las lanza WordPress mismo (ver §10e). Coincide con la pantalla de Acciones programadas (71 acciones, ninguna atrasada).
  - **PREGUNTA ABIERTA, aparte y sin relación con el veredicto:** por qué #24 y #27 no se cancelaron. Lo que esperaría la documentación: desde WooCommerce 10.6.0 los pedidos de la Store API (`created_via = store-api`) se cancelan al vencer "Mantener stock" (filtro `woocommerce_cancel_unpaid_order`; el sitio tiene 11.1.2). Lo que se sabe: no aparece ninguna acción de cancelación de pedidos sin pagar en Acciones programadas y no se sabe si esa cancelación está activa en este sitio. Sin comprobar.
  - **Observado, sin interpretar:** los pedidos pendientes quedan sin cancelar al menos 40 min tras vencer la reserva, y el #28 no se canceló. No se probó qué pasa pasado más tiempo.

## 6. Opción C reducida: función de conciliación (diseño original; implementada como plugin PHP, NO PROBADA en el hosting)

> **Actualización 2026-10-11: traslado a BenzaHosting, sin Vercel.**
> - **Implementación vigente:** plugin de WordPress `wordpress/tienda-conciliacion` + cron de cPanel por línea de comandos `wordpress/cron/tc-cron.php` (commit `d895efc`). El frontend la llama en el mismo origen, `POST /wp/wp-json/tienda/v1/reconcile` (commit `e602eed`). Instalación y pruebas: `wordpress/README.md` y `docs/nueva-tienda.md` (Fases 3 a 5).
> - **Obsoleto en el diseño de abajo** (se deja como registro):
>   - la ejecución en Vercel y el plan Pro;
>   - el disparador por `curl` con `RECONCILE_SECRET` o Vercel Cron;
>   - el `PUT wc/v3` con `set_paid` del paso 4;
>   - las credenciales `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET` y `RECONCILE_SECRET`;
>   - "0 PHP".
>   La versión TypeScript (`api/reconcile*.ts`) y `vercel.json` siguen en el repositorio como especificación y **se retirarán solo después de que pase la prueba real** (`docs/nueva-tienda.md` 5.6).
> - **Sigue vigente:**
>   - qué es y por qué (rescatar pagos sin aviso como el #28);
>   - la búsqueda por `external_reference`;
>   - un solo pago aprobado, en CLP, con el monto igual al total del pedido (nunca contra `totals.total_price` ×100);
>   - no tocar pedidos cancelados;
>   - las reglas de seguridad;
>   - la comparación con el cron real (que no rescata el #28).
> - **Cambios respecto del diseño:**
>   - concilia `pending` y `on-hold`;
>   - marca con `payment_complete()` y solo informa éxito si el pedido queda en `processing` o `completed`;
>   - espera que el pago lleve `TC_MIN_AGE_SECONDS` (300 s) aprobado antes de escribir. Reduce, sin eliminar, la carrera con el IPN (el más lento medido tardó 124 s, §10d);
>   - bloqueo por pedido con `GET_LOCK`;
>   - los cancelados, reembolsados o fallidos con pago aprobado no se marcan, pero se avisa al administrador (nota + correo, como máximo una vez);
>   - un pago con devolución parcial va a revisión.
> - **Efecto sobre el veredicto: ninguno.** B ya se apoyaba en que hace falta una verificación propia (§1). Ahora esa verificación es PHP propio (un plugin pequeño con pruebas) en vez de TypeScript, y desaparece el costo de Vercel Pro.
> - **Estado:** 117 pruebas sin WordPress ni red (`php wordpress/tests/decide-test.php`, 0 fallidas con PHP 8.3.35; eran 58 al escribir esta nota y 71 al abrir la rama `fix/conciliacion-c1-c3`). Parte de ellas usan dobles mínimos de WordPress y WooCommerce: comprueban qué llama nuestro código, no lo que WooCommerce hace por dentro. **NO PROBADO** en un WordPress real ni en el hosting: el comportamiento real de `payment_complete()` (stock una sola vez, correos), el IPN tardío, los posibles correos duplicados y el cron por línea de comandos (ruta `ea-phpXX` según MultiPHP Manager). La primera prueba real sigue pendiente; el #28 era el caso natural en la tienda de prueba.

**Qué es:** una función de servidor que, dado un pedido pendiente, **pregunta a Mercado Pago** si ya está pagado y, si lo está, lo marca pagado en WooCommerce. No crea pedidos ni preferencias y no reemplaza el aviso del plugin: es la red de seguridad para casos como el #28.

**Dónde se ejecuta:** ~~función serverless en Vercel (Hono opcional), en el mismo proyecto que el frontend, con dos rutas: `POST /api/reconcile` (un pedido) y `POST /api/reconcile-pending` (barrido). Una tienda comercial exige el plan Pro (§8).~~ **Obsoleto (2026-10-11):** hoy es un plugin de WordPress en el mismo hosting, con la ruta `POST /wp/wp-json/tienda/v1/reconcile` (un pedido) y el barrido `tc-cron.php` por línea de comandos. Sigue siendo código de servidor: **ninguna credencial llega al navegador**.

**Disparadores:**
1. **Desde `/pedido/retorno`**, cuando el sondeo de 5 minutos se agota y el pedido sigue pendiente: llama a la conciliación (hoy `/wp/wp-json/tienda/v1/reconcile`; antes `/api/reconcile`) con `orderId`, `order_key` y email. La función **valida key + email** antes de hacer nada y responde igual haya o no pedido (no permite enumerar). Hoy además limita a una consulta por pedido cada 60 s, y al navegador solo devuelve `not_found`, `already_paid`, `marked_paid`, `pending` o `try_later`.
2. **Barrido periódico cada 5 a 10 min:** ~~un cron de cPanel con `curl` y la cabecera `Authorization: Bearer <RECONCILE_SECRET>` (o Vercel Cron en plan Pro)~~ **(obsoleto)**. Hoy es un cron de cPanel que ejecuta `php tc-cron.php` por línea de comandos, sin URL ni secreto, cada 5 min. Lista pedidos `pending` y `on-hold` de los últimos 14 días pagados con `woo-mercado-pago-basic`. **NO PROBADO** en el hosting.

**Algoritmo (idempotente):**
1. `GET wc/v3/orders/{id}`. Continuar solo si el estado es `pending` y el método es `woo-mercado-pago-basic`. Si ya está `processing` (llegó el aviso) no hacer nada.
2. Buscar en Mercado Pago por `external_reference = WC-<id>` (`GET /v1/payments/search?external_reference=…`, con `Authorization: Bearer MP_ACCESS_TOKEN`; la búsqueda por `external_reference` figura en la documentación de Mercado Pago).
3. Quedarse con los pagos `approved`. Exigir `currency_id = CLP` y que `transaction_amount` sea **igual al `total` de wc/v3** (entero CLP). **No** comparar con `totals.total_price` de la Store API, que sale ×100 (§10c). Si hay más de un pago aprobado, o el monto no coincide, **no marcar nada**: dejar una nota y avisar a una persona.
4. Marcar pagado: ~~`PUT wc/v3/orders/{id}` con `set_paid: true` y `transaction_id = <id del pago>`~~ **(obsoleto: en la REST API, `set_paid` solo completa pedidos que `needs_payment()` admite, y no servía para `on-hold`; indicio, no verificado).** Hoy: `$order->payment_complete(<id del pago>)` dentro de WordPress, solo si el pago lleva al menos `TC_MIN_AGE_SECONDS` (300 s) aprobado y el estado releído de la base de datos sigue siendo `pending` u `on-hold`. Después se relee el estado y solo `processing` o `completed` cuentan como éxito; cualquier otro queda registrado como error. Se espera que deje el pedido en `processing`, descuente stock una vez y dispare los correos como el aviso; **a confirmar en la primera prueba** (sigue sin probar). Añadir una nota "Conciliado por la función propia: pago <id>, monto <n>".
5. Si el pedido está `cancelled`, **no tocarlo** y avisar (el stock ya se repuso: riesgo de sobreventa si se reabre). Hoy aplica también a `refunded` y `failed`. El aviso es una nota privada más un correo al administrador, como máximo uno por pedido: la marca se guarda antes de enviar, así que si el correo falla se pierde ese aviso y no se envían dos.

**Credenciales (diseño original, obsoleto).** Hoy solo hace falta `TC_MP_ACCESS_TOKEN`, en un `config.php` fuera de `public_html` cargado desde `wp-config.php`, sin clave REST ni secreto del cron (`docs/variables-entorno.md`). El diseño original era (todas variables de entorno del servidor, sin prefijo `VITE_`):
- `MP_ACCESS_TOKEN`: token de producción de la cuenta vendedora de Mercado Pago del cliente.
- `WC_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`: ya existen en `.env.local`; la conciliación necesita la clave de **lectura y escritura** (hace `PUT`).
- `RECONCILE_SECRET`: secreto para el barrido, comparado en tiempo constante.

**Código y horas (estimación original, para la versión de Vercel):** unas 80 a 120 líneas de TypeScript, 0 PHP. *Hoy:* el plugin PHP tiene ~600 líneas más ~500 de pruebas, y por tienda nueva se instala el plugin, se crea `config.php` y se programa el cron (`docs/nueva-tienda.md` Fases 3 a 5), además de la prueba obligatoria 5.6. Horas sin medir. **Mías, una sola vez** (plantilla): ~2 a 3 h. **Por tienda nueva:** ~0,5 a 1 h de Mario (token de Mercado Pago, 4 variables en Vercel, cron de cPanel y una prueba de punta a punta). *Estimaciones, no medidas.* La primera prueba real es el propio **#28**, que sigue pagado y sin aviso.

**Mantenimiento que exige:**
- Vigilar cambios de la API de búsqueda de Mercado Pago y de `wc/v3` (un cambio en la respuesta rompe la conciliación sin aviso).
- **Rotar y custodiar** `MP_ACCESS_TOKEN` y las claves de WooCommerce.
- Revisar las alertas de conciliación manual (montos distintos, pagos duplicados, pedidos cancelados).
- ~~Pagar y mantener el despliegue (Vercel Pro) y actualizar dependencias.~~ **Obsoleto.** Hoy: mantener el plugin compatible con las actualizaciones de WooCommerce y del plugin de Mercado Pago, y revisar el registro del cron.
- **No cubre:** pagos parciales, reembolsos y contracargos; son casos aparte.

**Seguridad:** nada del navegador cuenta como prueba de pago (ni `status` ni `payment_id` del query); la verdad es la API de Mercado Pago más el monto de wc/v3; los registros no incluyen tokens ni claves; las respuestas son uniformes.

**Comparación con el cron real de cPanel:**

| | Cron real de cPanel | Función de conciliación |
|---|---|---|
| PHP / código | 0 | ~~0 PHP, ~100 líneas de TypeScript~~ Hoy: plugin PHP pequeño (+ cron por línea de comandos) |
| Horas por tienda | ~0,25 | ~0,5 a 1 (más ~2 a 3 h mías una vez) |
| **Rescata el #28 (pagado sin aviso)** | **No: CONFIRMADO** por la prueba del 22:49 a 23:08 | **Sí, por diseño** (consulta a Mercado Pago); sin probar |
| Corrige retrasos de WP-Cron | No hacen falta: WP-Cron corre (§10e) | No |
| Mantenimiento | Casi nulo | Token, API de Mercado Pago, despliegue |

Recomendación única: la **función de conciliación** como parte obligatoria de cada tienda con B. El cron real de cPanel no sustituye ese rescate; solo queda como respaldo del rastreo.

## 7. Seguridad (solo lecturas, repetidas a las 23:11 con un build nuevo)

- **(a) El navegador no puede cambiar precios ni marcar un pedido como pagado.**
  - Argumentos de escritura de la Store API (esquema real por `OPTIONS`): `cart/add-item` solo `id`, `quantity`, `variation`; `cart/update-item` solo `key`, `quantity`; `cart/update-customer` solo direcciones; `checkout` acepta direcciones, método de pago, `payment_data`, `customer_note`, `expected_total` (texto) y extensiones. **Ninguno es precio, total ni estado.** `/order/{id}` solo admite GET.
  - `wc/v3` responde **401 sin credenciales** (probado en `orders`, `orders/36`, `products/17` y `customers`); el proxy local tampoco añade credenciales.
  - **Límite:** lo deduje de esquemas y de GET; **no hice una escritura real** (regla de solo lecturas).
- **(b) Las claves no están en el bundle.** `dist` tiene 3 archivos y **0 coincidencias** con: `consumer_key`, `consumer_secret`, `WC_CONSUMER`, `WC_URL`, el dominio real, los valores de las dos claves, `MP_ACCESS`, `APP_USR`, `Authorization`, `pref_id=` y `mercadopago.cl`.
- **(c) `/pedido/:id` no se puede leer ni adivinar, pero la existencia sí se distingue.**
  - El **contenido** exige `order_key` **y** email del comprador: sin key ni email → 401; key correcta con email ajeno → 401; key ajena con email correcto → 401; ambos correctos → 200.
  - **Fuga parcial:** sin key, los ids dan códigos distintos: ids 1 a 18 y 37 a 40 → 404; 19 a 23 → 403; 24 a 36 → 401. Un atacante puede saber qué ids de pedido existen, **no sus datos**.
  - **Mitigación (sin PHP):** en producción, una función que exija key + email antes de reenviar y responda siempre lo mismo (se incluye en la conciliación, §6).
- **Navegador:** la `order_key` y el email se guardan en `localStorage` solo para el pedido propio; un XSS expondría solo esos pedidos.

## 8. Costos (cerrados por Mario; no se investigan más)
- **Hosting (BenzaHosting):** ~**CLP 2.500 al mes**, **cifra de Mario, no verificada**, contratado **a nombre del cliente**. (Un agregador de terceros lista planes "Professional" de CLP 3.990 a 6.990 al mes; no se usa, solo consta la diferencia.)
- **Dominio .cl (NIC Chile):** ~CLP 9.990 al año (tarifa vigente desde 2023-11; fuente de búsqueda, no la página oficial).
- **Vercel (vercel.com/pricing):** Hobby solo uso personal no comercial; **Pro US$20 por usuario al mes**. Una tienda comercial exige Pro. *Inferido:* un solo asiento Pro cubre varios proyectos. **Obsoleto desde 2026-10-11:** con todo en BenzaHosting (React en la raíz, WordPress en `/wp`, plugin y cron de cPanel), Vercel no se usa y este costo desaparece. Queda solo el hosting de arriba (cifra de Mario, no verificada), que debe permitir `.htaccess`, cron con PHP por línea de comandos y MultiPHP Manager. **NO PROBADO.**
- **Mercado Pago (comisión):** la asume el cliente y Mario se la explica antes de contratar.
  - **Fuente: TERCEROS, no oficial.** Un blog de terceros (Wise), aportado por Mario y **no verificado por mí**, da para Checkout Pro en Chile: **3,19 % + IVA con dinero al instante (≈ 3,80 % efectivo)** y **2,89 % + IVA con dinero a 10 días (≈ 3,44 %)**.
  - **Consistente con el log de pruebas:** el log `abstractnotification` del pedido **#31** (`charges_details`) muestra un cargo de **$342 sobre $8.990 = 3,80 %**. Es un cálculo de Mario, de una cuenta de prueba con dinero en cuenta; **no es tarifa oficial**.
  - **Matices:** las cuotas sin interés tienen un cargo adicional, y los vendedores nuevos pueden tener una tasa promocional.
  - **Paso del checklist por cliente:** confirmar la tarifa real en el **Simulador de comisiones de la cuenta** de Mercado Pago de cada cliente antes de contratar.

## 9. Mantenimiento por camino
- **A (plugin + Store API):** actualizar WooCommerce y el plugin de Mercado Pago (un cambio en `process_payment` o en los avisos rompe el flujo sin avisar); revisar semanalmente pedidos pendientes con pago aprobado.
- **A + función de conciliación:** además mantener el token, la API de búsqueda y el despliegue.
- **B (`order-pay`):** no probada; mismo plugin y misma exposición al IPN.
- **C (función propia con webhook, HMAC, idempotencia):** solo diseñada; el mayor mantenimiento (firma, reintentos, secretos).

## 10. Limpieza al terminar

**En WordPress y servicios (lo hace Mario):**
1. Subdominio y base de datos de `tienda-prueba.gbike.cl`.
2. Aplicación `Tienda Prueba_56` de Mercado Pago y su webhook (URL `https://tienda-prueba.gbike.cl/`).
3. **Revocar** la clave REST de lectura/escritura que está en `.env.local`.
4. Pedidos de prueba #19 a #36 (incluido el borrador #30) y los productos de prueba.
5. **El cron de cPanel** que Mario añadió en la cuenta de hosting de `gbike.cl` (cada 5 min, `tienda-prueba.gbike.cl/wp-cron.php`): Mario indicó que ya lo está borrando; **confirmar**. Está en la cuenta de un cliente.
6. **Avisar al dueño de `gbike.cl`** (subdominio de prueba, cron y registro de acceso descargado).

**En este equipo (hecho o por hacer):**
7. **Hecho:** la copia descomprimida del registro de acceso (con IPs de visitantes) se borró de la carpeta temporal; no quedó ningún `.log` ni `.gz` en el repositorio. El original sigue en `Downloads` (de Mario).
8. Los archivos locales `.tmp-pago-pedido-*.txt` (ignorados por Git) con enlaces de pago de prueba.
9. `.env.local` y `dist/` (ignorados por Git).
10. Los scripts temporales de la sesión (carpeta temporal, fuera del repositorio).
11. Las copias de seguridad de `gbike.cl` que están en `Downloads` **no se abrieron ni se tocaron**; Mario decide qué hacer con ellas.

## 10b. Caché del hosting en `/order/{id}` (hallazgo del #31)
- **Efecto:** el sondeo de `/pedido/retorno` pide siempre la misma URL y recibe la copia vieja "pendiente" aunque WooCommerce ya marcó el pedido como pagado. Un recargo de la página también la recibe.
- **Evidencia adicional (GET desde el servidor, 21:55 a 21:57):** el navegador recibía `pending` a las 21:52 (la última consulta automática fue ~21:43:28), así que la copia vieja duró **≥ 8 a 10 minutos** tras el cambio a `processing` (21:42:13). Mis consultas con una `Accept-Encoding` distinta no reproducen la copia vieja: `Vary: Accept-Encoding, Origin` indica que la clave de caché incluye el `Origin` y la codificación.
- **Qué evita la caché (probado):**
  | Variante de la petición | Latencia |
  |---|---|
  | Parámetro único `&_=<timestamp>` | **612 a 624 ms: ejecuta PHP** |
  | `Cache-Control: no-cache` | 13 ms (sigue en caché) |
  | `Pragma: no-cache` | 18 ms (sigue en caché) |
  | `Cache-Control: no-store` | 29 ms (sigue en caché) |
  Los encabezados de la petición **no sirven**; el parámetro único **sí**.
- **Causa más probable (INFERIDA):** caché de respuesta completa del hosting (nginx u otra capa delante de PHP). Por qué no es caché de objetos de WordPress: esa solo ahorra consultas a la base de datos y no baja una respuesta REST de ~630 ms a ~12 ms. Por qué no es el endpoint: la Store API calcula cada respuesta y no devuelve `Cache-Control`. No hay cabeceras `x-cache`, `x-litespeed-cache` ni `age`, así que la capa no se identifica desde fuera.
- **Corrección mínima (propuesta, sin aplicar):** parámetro único `_=<timestamp>` en cada consulta de estado (`src/services/orders.ts`), una línea; verificado contra el servidor. **Opcional por tienda:** excluir `/wp-json/` de la caché desde el panel del hosting, o que el hosting envíe `Cache-Control: no-store` en esa ruta; un encabezado desde WordPress exige PHP.
- **Corrección aplicada (commit `d234e08`):** `src/services/orders.ts` añade `_=<timestamp>` y `cache: 'no-store'` a cada consulta de estado, incluida la del botón "Actualizar estado". Verificado ejecutando `getOrderStatus` real contra el proxy para el #31: tres llamadas, 672 a 742 ms cada una (PHP se ejecuta, no hay copia), las tres devuelven `paid`. El hosting **no ignora** el parámetro: la URL con parámetro único devolvió `processing` y la URL repetida sin él dio 11 ms.
- **Duración medida (GET, 21:58 a 22:10):** una URL sin tocar durante 10 minutos **seguía en caché** (44 ms); otra consultada cada 20 s durante 12 minutos tuvo 36 aciertos seguidos y **no expiró**. Entonces la copia vive **al menos 12 minutos** (y no hace falta consultarla para mantenerla). **Sin determinar:** el TTL exacto y si se renueva con cada consulta; habría que esperar más de 12 minutos. Para el riesgo basta saber que es mucho mayor que los 2 a 5 minutos de sondeo.
- **RIESGO por tienda: el catálogo (`/products`) no tiene la corrección.** No se tocó por instrucción. `/products` envía `Last-Modified` y el catálogo pasa por la misma caché del hosting: tras una compra el stock o un precio cambiado pueden mostrarse viejos durante minutos (navegador por `Last-Modified`, hosting por la caché de respuesta). No medido para `/products` en el servidor; sí se vio el `Last-Modified` (00:42:13 GMT = hora del último cambio de stock). Medida por tienda: medir la caché y, si afecta, **excluir `/wp-json/wc/store/v1/` de la caché del hosting desde su panel**.

## 10c. `totals.total_price` ×100 en `/order/{id}` (CLP)
- **Observado (GET, #31):** para un pedido de **$8.990**, `/order/31` devuelve `totals.total_price = "899000"` y `total_items = "899000"` aunque `currency_minor_unit = 0`. Las líneas del mismo pedido sí vienen bien (`price`/`line_total` = `"8990"`). wc/v3 da `total = "8990"`.
- **No ocurre en el carrito:** `GET /cart` del #17 ($100) devolvió `total_price = "100"`.
- **Causa (INFERIDA):** la Store API convierte los totales del **pedido** a unidades menores como si la moneda tuviera 2 decimales. No se probó en otra tienda ni versión de WooCommerce.
- **Efecto sobre `expected_total`: ninguno comprobado.** `expected_total` se valida contra el total del **carrito** en `POST /checkout`, que usa unidades correctas (`"100"`). Prueba: el #26 y los siguientes pasaron con `expected_total = "100"`. El frontend no lee `totals` de `/order`.
- **Riesgo si alguien lo usa:** cualquier cálculo con `/order/{id}.totals.total_price` (mostrar el total, la función de conciliación, comparar con Mercado Pago) sería 100 veces mayor. La conciliación debe comparar el monto de Mercado Pago con `wc/v3 order.total`, no con la Store API.

## 10d. Demora del IPN y sondeo de `/pedido/retorno`

**Fuente:** log `abstractnotification` del 2026-10-07 (hora de Chile), comparando el pago en Mercado Pago con la hora del aviso. Datos aportados por Mario; wc/v3 confirma las horas de procesamiento de WooCommerce.

| Pedido | Demora pago → IPN | Payment ID |
|---|---|---|
| #26 | 1 s | 181786820705 |
| #29 | 1 s | 182801297028 |
| #31 | 48 s | 181792564799 |
| #32 | 2 min 4 s (124 s) | 182808694996 |
| #33 | 1 min 35 s (95 s) | 182809778170 |
| #34 | 43 s | 182809778248 |
| #35 | 1 min 14 s (74 s) | 182809666422 |
| #36 | 9 s | 182808013922 |
| **#28** | **nunca llegó** | 181787923271 (operación) |

- **8 medidas ordenadas:** 1, 1, 9, 43, 48, 74, 95, 124 s. **Mediana 45,5 s. Máximo 124 s.** (Los #25 y #31 se habían medido antes en otro log: #25, 15 s.)
- **Tasa de pérdida:** **11 pagos aprobados tras la reconfiguración del plugin** (#23, #25, #26, #28, #29, #31, #32, #33, #34, #35 y #36): **10 con IPN y 1 sin (#28)**, ≈ 9 % de pérdida. Muestra pequeña, sin valor estadístico.
- **Agrupación:** los avisos de #32, #33 y #34 llegaron casi juntos, y los de #35 y #36 también. **Posible envío en lotes, NO probado.** Si es así, la demora depende del lote de Mercado Pago y no del sitio.
- **Contraste con la hora de creación:** el tiempo "creado → procesado" de wc/v3 (19 a 258 s) incluye lo que tarda el comprador en pagar y **no** mide el IPN.
- **Todos los pagos de #32 a #36 terminaron en "Pagado"** en el frontend, ya con la corrección de caché (`d234e08`): evidencia de uso real de que funciona. El ~1 minuto en "pendiente" era el retraso real del IPN.
- **Pagos aprobados sin IPN conocidos:** solo el **#28**. Un pago que el plugin nunca recibió no deja rastro en WordPress; para cerrar la cifra hay que contrastar en el panel de Mercado Pago los pagos aprobados del día con los Payment ID de la tabla.
- **Stock de la Prensa francesa:** 14 (22:21). **INFERIDO:** repuesto a 19 antes de las compras de #32 a #36; sin confirmar.

### Sondeo implementado (commit `9830089`)
- Consulta **cada 4 s durante el primer minuto y cada 10 s hasta completar 5 minutos** desde la primera respuesta pendiente: **38 consultas** (15 en el primer minuto y 23 después; la última a los 290 s). Siempre con el parámetro único `_=<timestamp>` y `cache: 'no-store'`.
- A los 5 minutos deja de consultar y muestra "Tu pago está siendo confirmado, te avisaremos por correo." con el botón "Actualizar estado" disponible.
- Texto mientras está pendiente: "Mercado Pago aún no confirma tu pago. Puede tardar un par de minutos; no cierres esta página."
- Cobertura frente a los datos: el IPN más lento medido (124 s) cae dentro de la ventana de 5 minutos con margen de 176 s. Un reintento tardío (~54 min en el #21) o un IPN que no llega (#28) **no** se cubren: solo los corrige la conciliación del §6.
- **No probado en el navegador** (sin herramienta de navegador en esta sesión): el cálculo de los intervalos se comprobó con una réplica de la lógica y `tsc`/`build`; el flujo en pantalla lo ejecuta Mario.

## 10e. Registro de acceso del servidor: ¿llamó Mercado Pago por el #28?

**Fuente:** cPanel > Acceso sin procesar, `tienda-prueba.gbike.cl` (SSL), 2026-10-06, 8.236 líneas de 16:57:21 a 23:06:32. **Zona horaria del registro: -0300** en todas las líneas, igual a la hora de Chile usada en este informe (sin ajuste). Solo se leyó una copia descomprimida fuera del repositorio; las IPs se enmascaran (`35.186.x.x`). No se abrió ninguna otra copia de seguridad.

**Avisos del día (POST de Mercado Pago a `/wc-api/WC_WooMercadoPago_Basic_Gateway/?source_news=ipn`):** **11**, todos **200** de 33 B, agente "Mercado Pago PP Core 1.64.1 merchant_order", IPs 35.186.x.x. **Ninguno con código distinto de 200** (no hay 4xx ni 5xx de avisos).

| Hora del POST | Pedido que coincide (misma hora de `date_paid`) |
|---|---|
| 20:03:56 | #23 (según el log en UTC de Mario) |
| 20:15:21 | #21, aviso tardío (según el log en UTC de Mario) |
| 20:50:24 | #25 |
| 21:07:44 | #26 |
| **21:19:49** | **#29** |
| 21:42:14 | #31 |
| 22:06:18 / 22:06:20 / 22:06:38 | #34 / #32 / #33 |
| 22:07:16 / 22:07:18 | #35 / #36 |

- **Ventana 21:10 a 22:10:** 7 avisos (21:19:49, 21:42:14 y los cinco de la tanda #32 a #36). **Ninguno para el #28.**
- **El #28 (pagado 21:17):** no hay ningún aviso entre el de las 21:07:44 (#26) y el de las 21:19:49 (#29), ni uno posterior para él hasta el final del registro (23:06:32). Un reintento tardío, como el del #21, no apareció. **CONFIRMADO (con este registro): Mercado Pago no llamó al sitio por el #28; no fue un rechazo del servidor.** Límite: el registro solo muestra lo que llegó al servidor web; una petición cortada antes (firewall) no aparecería, pero tampoco hay ningún 4xx/5xx de avisos.
- **Comparación con los que sí tuvieron aviso:** el POST del #29 (21:19:49) y los de la tanda #32 a #36 (22:06:18 a 22:07:18) tienen la misma ruta, agente, bloque de IP y tamaño que cualquier otro. No hay diferencia de formato que explique la falta del #28.
- **Retraso:** la hora del POST coincide con el segundo en que WooCommerce marcó el pedido como pagado: el servidor procesó cada aviso **al instante**. Por tanto el retraso de 1 s a 124 s entre el pago y el aviso ocurre **antes de llegar al sitio** (del lado de Mercado Pago). INFERIDO por esa coincidencia.
- **Otras líneas relevantes:** 2 POST a `/` (200, agente `restclient-node/5.5.0`) a las 19:39:26 y 19:53:12, antes de la reconfiguración (probablemente las pruebas de Webhooks del panel; inferido); ninguno el día del #28. 1 GET a `WC_WooMercadoPago_Integration_Webhook` (302) a las 18:07:35 desde un navegador: un paso de configuración, no un aviso.
- **WP-Cron:** `wp-cron.php` recibió 353 peticiones en el día, todas 200 (345 de WordPress mismo, 4 de WordPress 7.1.2 y 4 de `Wget`, el cron de cPanel desde las 22:49); entre 21:10 y 23:05 hubo al menos una en 102 de 116 minutos, máximo 3 por minuto y hueco máximo de 117 s. **WP-Cron corre.** La hipótesis de que no corriera bien está **retirada** (§5).
- **Ruido sin relación:** un escaneo de bots a rutas inexistentes (404) entre las 21:22 y las 21:23 desde una sola IP, y un POST 499 a `admin-ajax.php?action=as_async_request_queue_runner` a las 21:16:47 (el ejecutor asíncrono de Action Scheduler que WordPress se llama a sí mismo; sin efecto observado). Una línea con un `nonce` de WordPress apareció en mi salida; es de un solo uso y de corta vida, no una credencial.

## 11. Checklist por tienda nueva
0. **Riesgo por tienda: caché del servidor.** Repetir la misma URL de `/order/{id}` y compararla con una URL única; ~600 ms contra ~30 ms indica caché y un estado atrasado. Mantener el parámetro único en cada consulta; si el hosting ignora los parámetros, excluir `/wp-json/` de su caché.
0a. **Riesgo por tienda: catálogo con stock o precio viejo.** Cambiar un stock en WooCommerce y consultar `/products` con la misma URL durante unos minutos; si devuelve el valor viejo, excluir `/wp-json/wc/store/v1/` de la caché del hosting (panel).
0b. **Riesgo por tienda: `total_price` ×100 en `/order/{id}` (CLP).** Comprobar una vez con un pedido de prueba (`total_price` frente a `wc/v3 total`) y no usar nunca esos totales para cobrar ni conciliar.
1. Instalar y vincular el plugin y **guardar las opciones avanzadas** (clave para que registre el IPN).
2. Debug encendido en pruebas, apagado en producción.
3. Rastreo de orden a 5 minutos como respaldo; cron real de cPanel (el rastreo depende de WP-Cron).
4. "Mantener stock" a un valor mayor al tiempo de conciliación.
5. Envío desactivado (`shipping.enabled=false`) salvo cliente con tarifas.
6. `success_url`, `failure_url` y `pending_url` apuntando a `https://<frontend>/pedido/retorno`.
7. Revisar `site.ts`: textos de despacho, insignia, descripción SEO, Términos, prefijo de referencia (`WC-`).
7b. **Texto de la pantalla de pago aprobado: HECHO** (commit `fce77f5`). "En camino" y "seguimiento" ya viven en `src/config/site.ts` (`deliveryCopy`) y con `shipping.enabled=false` no aparece nada de envío ni de seguimiento. Cada tienda edita ambos bloques de textos y `.figma/make/site.json`.
8. Dos pagos de prueba; leer estado y stock.
9. ~~Variables de entorno en Vercel (plan Pro) y la función de conciliación.~~ **(Obsoleto, 2026-10-11.)** Hoy:
   - frontend compilado con `npm run build:hosting` y solo el contenido de `dist/` en `public_html/`;
   - WordPress en `/wp` con enlaces permanentes distintos de "Simple";
   - `config.php` con `TC_MP_ACCESS_TOKEN` fuera de `public_html` (permisos 600), cargado desde `wp-config.php`, con `TC_DRY_RUN` activo hasta pasar la prueba real y `TC_MIN_AGE_SECONDS`;
   - plugin `tienda-conciliacion`;
   - cron de cPanel por línea de comandos con la ruta `ea-phpXX` de la versión asignada en MultiPHP Manager;
   - **prueba real obligatoria antes de entregar a un cliente**.
   Detalle en `docs/nueva-tienda.md`, Fases 3 a 5 y 5.6. **NO PROBADO** en el hosting. `api/` y `vercel.json` se retirarán solo después de que esa prueba pase.
10. **Comisión de Mercado Pago:** confirmar la tarifa real del cliente en el Simulador de comisiones de su cuenta (ver §8) y explicársela antes de contratar.
