# Conciliación con Mercado Pago en BenzaHosting (plugin + cron)

Red de seguridad del veredicto B (`docs/fase0-informe.md` §1 y §6): rescata pedidos pagados en Mercado Pago Checkout Pro cuyo aviso (IPN) no llegó, como el #28. Reemplaza a `api/reconcile*.ts` (Vercel). Esos archivos quedan en el repositorio como **especificación** hasta que la prueba real pase.

**Estado (2026-10-29): probado en el staging real de BenzaHosting** (WordPress 7.1.3, WooCommerce 11.2.1, PHP 8.3.36, cron de cPanel con PHP CLI). Pasaron la conciliación de un pago sin aviso (IPN bloqueado a propósito, `too_recent` → `would_mark_paid` → `marked_paid`: pedido en `processing`, stock una sola vez, correos y nota), la idempotencia, el pedido cancelado con pago aprobado (solo avisa, una vez), la ruta REST y el cron por línea de comandos. **Sigue sin probar:** el IPN tardío tras conciliar, el pedido reembolsado, el monto distinto, `seller_mismatch`, dos crons a la vez y que `Cache-Control: no-store` lo respete la caché del hosting. El detalle y las fechas están en `docs/ROADMAP.md`. Las pruebas unitarias (`tests/decide-test.php`) cubren la lógica con dependencias simuladas.

Leyenda: **[C]** confirmado en el código · **[I]** indicio (documentación o conocimiento de WooCommerce, sin verificar aquí) · **[H]** hipótesis.

## Contenido

| Ruta | Qué es | Dónde va en el hosting |
|---|---|---|
| `tienda-conciliacion/` | Plugin de WordPress | `public_html/wp/wp-content/plugins/tienda-conciliacion/` |
| `tienda-conciliacion/includes/decide.php` | Decisiones puras (sin WordPress) | (dentro del plugin) |
| `tienda-conciliacion/includes/reconcile.php` | Orquestación: bloqueo, Mercado Pago, `payment_complete()`, avisos | (dentro del plugin) |
| `cron/tc-cron.php` | Barrido por línea de comandos | **Fuera de public_html**: `/home/USUARIO/tienda-cron/` |
| `config.example.php` | Plantilla de constantes, **sin valores** | La copia real: `/home/USUARIO/tienda-secretos/config.php` |
| `tests/decide-test.php` | Pruebas sin WordPress, sin red y sin PHPUnit | No se sube |

## 1. Instalación

1. **Configuración secreta** (fuera de `public_html`):
   - Crear `/home/USUARIO/tienda-secretos/config.php` a partir de `config.example.php`, con permisos **600**.
   - Poner el Access Token de **producción** de Mercado Pago en `TC_MP_ACCESS_TOKEN`.
   - Poner en `TC_MP_SELLER_ID` (de 1 a 20 dígitos, sin espacios ni saltos de línea; cualquier otra cosa es `seller_config_invalid` y bloquea todo) el ID numérico del vendedor dueño de ese token (el mismo que usa el plugin oficial de Mercado Pago en WooCommerce). Antes de cada barrido y de cada conciliación, el conciliador lo compara con `GET /users/me`; si no coincide, **no consulta pagos ni escribe nada** (`seller_mismatch`). Sin `TC_MP_SELLER_ID` solo corre en simulación; para escribir (`TC_DRY_RUN` en `false`) es obligatorio.
   - Dejar `TC_DRY_RUN` en `true`.
   - En `public_html/wp/wp-config.php`, antes de `/* That's all, stop editing! */`, añadir `require_once '/home/USUARIO/tienda-secretos/config.php';`.
   - El token nunca va al repositorio, al chat ni a los registros.
2. **Plugin:** comprimir `tienda-conciliacion/` en un zip, ir a *Plugins > Añadir nuevo > Subir plugin* y activarlo. Necesita WooCommerce activo.
3. **Comprobación sin pedidos:** `POST https://dominio/wp/wp-json/tienda/v1/reconcile` con cuerpo `{}` debe responder `{"ok":true,"result":"not_found"}`.
4. **Ya no hacen falta** la clave REST de lectura y escritura de WooCommerce ni `RECONCILE_SECRET`.

## 2. Cron de cPanel (entorno confirmado; el barrido, NO PROBADO)

**No se afirma que el barrido funcione.** Lo que ya está comprobado y lo que falta:

- **Versión de PHP:** la asignada al dominio en **MultiPHP Manager** de cPanel (**PHP 8.3 o superior**, mínimo exigido por BenzaHosting desde sus parches de seguridad; la misma que usa WordPress).
- **Ruta del binario:** en cPanel con EasyApache suele ser `/opt/cpanel/ea-phpXX/root/usr/bin/php`, donde `XX` es la versión. **Confirmada en BenzaHosting:** `/opt/cpanel/ea-php83/root/usr/bin/php`. Un Cron Job de diagnóstico devolvió `PHP 8.3.35`, SAPI `cli` y las extensiones `curl`, `json`, `posix`, `hash` y `openssl`. En otro hosting hay que confirmarla igual, con un cron de prueba que ejecute `.../php -v >> /home/USUARIO/tienda-cron/version.txt`.
- **PHP por línea de comandos desde el cron: confirmado en BenzaHosting** (es como se obtuvo el dato anterior). En otro hosting sigue siendo una incógnita **[H]**.
- **Falta por probar:** que `tc-cron.php` cargue WordPress y complete el barrido desde ese contexto (últimas viñetas de esta sección).

Comando (cada 5 minutos), con la ruta del hosting en lugar de `ea-phpXX` (en BenzaHosting, `ea-php83`):

```
/opt/cpanel/ea-phpXX/root/usr/bin/php -q /home/USUARIO/tienda-cron/tc-cron.php /home/USUARIO/public_html/wp/wp-load.php >> /home/USUARIO/tienda-cron/registro.txt 2>&1
```

- El script se niega a correr si no es por línea de comandos y usa `flock` para que dos pasadas no se solapen [C]. **Fuera de la CLI (por ejemplo, si el cron apunta a `php-cgi` en vez de al binario `php` de línea de comandos, o si alguien lo abre por la web) termina con un 404 y NO escribe nada en `registro.txt`** [C]: desde el registro se ve igual que un cron que no corre. Comprobar el binario con `.../php -v` y, en el registro, que cada 5 minutos aparece la línea de cabecera.
- El registro solo guarda fecha, id del pedido, resultado y motivo; nunca emails, nombres, montos ni tokens [C].
- Cada pasada correcta escribe una línea de cabecera aunque no haya pedidos: `barrido dry_run=si vendedor=match pedidos=N silenciados=K`. **Si no aparece ninguna línea nueva cada 5 minutos, el cron no está corriendo o termina sin escribir** (binario que no es CLI, ver arriba). `vendedor=` es el estado de la comprobación (`match`, `unconfigured`), nunca el id. `pedidos` cuenta todos los revisados; `silenciados` son los cerrados que no tuvieron línea propia porque ya estaban avisados (`already_alerted`) o revisados hace poco (`recently_checked`): se repetirían cada 5 minutos durante días. Todo lo demás (incluidos avisos nuevos y errores) sí tiene su línea. Si el vendedor no coincide o no se puede verificar, la pasada termina con `error: seller_mismatch` (o `seller_unauthorized`, `seller_check_failed`, `seller_not_configured`, `seller_config_invalid`) y código de salida 4.
- Las excepciones y los errores de Mercado Pago van al registro de errores de PHP con el id del pedido y un código (clase de la excepción, o `stale_order`/`order_missing`); nunca el mensaje libre, el token ni ids de vendedor [C]. En CLI ese registro sale por la salida de error, que el comando de arriba redirige a `registro.txt` (2>&1) [I].
- **No probado:** que WordPress cargue bien por línea de comandos con los plugins del sitio (algunos plugins de caché o seguridad esperan `HTTP_HOST`), y que WooCommerce envíe los correos desde ese contexto [I: los correos se disparan con el cambio de estado, sea cual sea el contexto].
- Si el hosting no permite PHP por línea de comandos, el plan B (no implementado) es programar el barrido con Action Scheduler dentro del plugin.

## 3. Qué hace con cada pedido

| Estado del pedido | Consulta a Mercado Pago | Resultado |
|---|---|---|
| `processing`, `completed` | No | `already_paid` |
| Otro método de pago | No | `skipped / not_mercado_pago` |
| `pending`, `on-hold` | Sí | Ninguno aprobado → `pending`. Exactamente uno aprobado, en CLP (pago y pedido), con el monto igual al total del pedido y sin devoluciones → `would_mark_paid` (o `marked_paid` si `TC_DRY_RUN === false`). Varios aprobados, otra moneda, otro monto o con devolución parcial → `review` + aviso |
| `cancelled`, `refunded`, `failed` | Depende (ver «Pedidos cerrados» abajo): no si ya hubo aviso o se revisó hace poco; si no, sí | **Nunca se marca**, ni siquiera si el pago se aprobó días después. Ya avisado → `skipped / already_alerted` (sin consultar). Revisado sin pago aprobado hace menos del intervalo → `skipped / recently_checked` (sin consultar). Consultado y sin pago aprobado → `skipped / status_not_payable` (y se anota la hora). Con pago aprobado → `skipped / approved_payment_on_<estado>` + aviso (una sola vez) |
| Cualquier otro (p. ej. `checkout-draft`) | No | `skipped / status_not_payable` |

**Qué revisa el barrido:** `pending` y `on-hold` de Mercado Pago de los últimos 14 días (máximo 50) y, en una consulta aparte, `cancelled` y `failed` de los últimos 14 días (máximo 25). Los cerrados existen porque WooCommerce cancela solo los pedidos sin pagar y el cliente puede pagar después: el conciliador no los reactiva, solo deja una nota privada y un correo al administrador. Los `refunded` no se barren (un pago aprobado en un pedido reembolsado es lo normal; sí pasan por la ruta del navegador). Si el pedido se cierra mientras se consulta a Mercado Pago, la relectura previa a escribir lo detecta y también avisa en vez de completarlo.

**Pedidos cerrados: cuándo se consultan (decisión).** Un cancelado o fallido que nunca se pagó es el caso común. Consultarlo en cada pasada serían 4.032 consultas por pedido en los 14 días (288 al día) y 7.200 al día con el tope de 25, todas para no encontrar nada. Se evaluó (a) consultar siempre, (b) un intervalo fijo de una hora y (c) un intervalo según la edad del pedido. Se implementó (c) (`tc_closed_recheck_due`):
- Si el último chequeo no encontró pago aprobado, no se vuelve a consultar hasta pasados **15 min** si el pedido tiene menos de 24 h, o **6 h** si tiene más. En 14 días son unas 148 consultas por pedido (alrededor de un 96 % menos) [C: cuenta aritmética sobre las constantes `TC_CLOSED_RECHECK_FRESH`, `TC_CLOSED_RECHECK_OLD` y `TC_CLOSED_FRESH_WINDOW` de `decide.php`].
- Un pago tardío **no se pierde**: dentro de los 14 días se detecta como máximo ~15 min después (más los 5 del cron) el primer día y ~6 h después a partir del segundo. Una espera de horas es aceptable porque el resultado es un aviso a una persona, no una escritura automática. Los pagos con efectivo o transferencia, que tardan días, son el motivo de mantener la reconsulta en vez de revisar una sola vez.
- La hora se guarda en el meta `_tc_closed_checked` **solo cuando Mercado Pago respondió y no había pago aprobado** (`status_not_payable`). Los errores de Mercado Pago no dejan marca (se reintenta en la pasada siguiente) y un pedido avisado deja de consultarse del todo (`_tc_alerted`).
- Una marca ausente, no positiva o en el futuro se ignora (siempre se consulta). Los pedidos pendientes y en espera no se espacian.
- **En simulación (`TC_DRY_RUN=true`) no se guarda la marca**, porque no se escribe nada: la simulación consulta los cerrados en cada pasada hasta que exista una marca de una pasada real. Si se quiere medir el espaciado hay que hacerlo con escritura activada en la prueba real.
- Los intervalos son constantes del código, no de `config.php`: cambiarlos exige editar `decide.php`. Que Mercado Pago admita el volumen restante, o el actual, no está medido [H].
- Si un pedido se restaura y se vuelve a cancelar, una marca vieja puede retrasar su primera consulta como máximo un intervalo [I].

**Búsqueda sin resultados:** una lista vacía da `pending / no_payments_found` (distinto de `no_approved_payment`, que significa que hay pagos pero ninguno aprobado). **[H]** Con el token de otra cuenta la búsqueda vuelve vacía sin error (consistente con lo observado en staging, no demostrado); por eso existe la comprobación de `TC_MP_SELLER_ID`.

**Antigüedad mínima:** solo se escribe si el pago lleva al menos `TC_MIN_AGE_SECONDS` aprobado en Mercado Pago (campo `date_approved` [I]; por defecto 300 s). Si no, el resultado es `pending / too_recent` (o `missing_date_approved` si falta la fecha), sin escribir, y la siguiente pasada del cron lo reintenta [C]. El IPN más lento medido tardó 124 s (informe §10d), así que con 5 min quedan ~3 min de margen. Coincide con el sondeo de `/pedido/retorno`, que llama a la ruta tras 5 min. Los avisos de revisión no esperan este plazo (no escriben el pago).

**Para marcar un pedido pagado** (todo dentro del bloqueo):
1. Relee el estado **desde la base de datos**.
2. Comprueba que el objeto en memoria no esté atrasado.
3. Llama a `payment_complete(<id del pago>)`.
4. Vuelve a leer el estado. Solo `processing` o `completed` cuentan como éxito (`completed` es para pedidos solo con productos virtuales o descargables) [C].
5. Con éxito: guarda la meta `_tc_reconciled_payment` y una nota privada.
6. Cualquier otro estado da `error / unexpected_status_after_payment`, va al registro de errores de PHP y **no** se informa éxito [C].

**Avisos** (nota privada + correo a `admin_email`):
- La marca `_tc_alerted` se guarda **antes** de enviar [C]. Si el envío falla, ese aviso se pierde (queda la nota en el pedido), pero nunca se envían dos.
- **No hay garantía de entrega exactamente una vez:** como máximo uno por pedido, y puede ser cero si falla el correo.
- En modo simulación no se envía nada (`alert: would_send`).

**Ruta del navegador** `POST /wp-json/tienda/v1/reconcile`:
- Valida `orderId`, `orderKey` y email con `hash_equals` [C].
- Si el pedido no existe, o la key o el email no coinciden, responde igual (`not_found`) [C].
- Al navegador solo llega uno de estos códigos: `not_found`, `already_paid`, `marked_paid`, `pending` o `try_later`. Nunca montos ni motivos [C].
- Admite una petición por pedido cada 60 s. El límite se aplica **antes** de validar, para no revelar si el pedido existe [C]. Efecto secundario: un tercero que conozca un id puede gastar ese turno de 60 s; el cron sigue cubriendo el pedido.

**Filtro de la Store API** (`rest_post_dispatch`):
- En `/wc/store/v1/order/{id}`, convierte 401, 403 y 404 en un único 404 con el mismo cuerpo. Repone la protección del proxy de Vercel (informe §7c) [C].
- Añade `Cache-Control: no-store` a `/order`, `/cart` y `/checkout` [C]. **[H]** No se sabe si la caché del hosting respeta esa cabecera (informe §10b): se mide en la prueba real.

## 4. Diferencias con `api/_lib/reconcile.ts`

| Tema | TypeScript (Vercel) | PHP (plugin) | Motivo |
|---|---|---|---|
| Cómo marca pagado | `PUT wc/v3/orders/{id}` con `set_paid` y `transaction_id` | `$order->payment_complete($payment_id)` | No necesita clave REST. [I] En la API REST, `set_paid` solo completa el pago si `needs_payment()` lo permite (`pending`/`failed`), así que no servía para `on-hold` |
| Credenciales | Token de MP + clave REST de lectura y escritura + `RECONCILE_SECRET` | Solo el token de MP | Menos secretos |
| Estados del barrido | Solo `status=pending` (**defecto**: la lógica aceptaba `on-hold`) | `pending` y `on-hold`; además `cancelled` y `failed` solo para avisar (nunca se marcan) | Coherencia y pagos tardíos |
| Identidad del vendedor | No existía | `GET /users/me` contra `TC_MP_SELLER_ID` antes de consultar o escribir | Un token de otra cuenta devuelve búsquedas vacías sin error |
| Estados cerrados | `skipped` sin consultar a MP y sin aviso | Consulta a MP; con un pago aprobado, `skipped / approved_payment_on_<estado>` + aviso | Pedido de Mario: no se tocan, pero alguien se entera |
| Avisos a una persona | Ninguno (solo el JSON del barrido) | Nota + correo, como máximo uno por pedido | Antes los casos `review` se perdían |
| Éxito tras escribir | Supone `processing` tras el `PUT` | Relee el pedido; solo `processing` o `completed` cuentan como éxito; otro estado da error y se registra | `payment_complete()` no garantiza el cambio de estado |
| Antigüedad mínima del pago | No había | `TC_MIN_AGE_SECONDS` (300 s por defecto) desde `date_approved` antes de escribir | Decisión de Mario: reduce la carrera con el IPN |
| Concurrencia | Relectura sin bloqueo | `GET_LOCK` por pedido (nombre con hash de base de datos y prefijo, porque MySQL es compartido) + estado leído de la base de datos + comprobación de objeto atrasado | Ver §5 |
| Devolución parcial en MP | No considerada | `review / refunded_in_mp` | Evita una conciliación dudosa. Los campos `transaction_amount_refunded` y `status_detail` son [I] |
| Modo simulación | `DRY_RUN` con el texto `false` | `TC_DRY_RUN` con el booleano `false`. En simulación tampoco escribe notas ni envía correos | |
| Lo que ve el navegador | Devolvía el resultado interno (p. ej. `review`, prueba TS 27) | Solo `not_found`, `already_paid`, `marked_paid`, `pending` o `try_later` | Menos información expuesta |
| Límite de frecuencia | No tenía | 60 s por pedido | La ruta llama a MP |
| Error de WooCommerce | `wc_error` (HTTP) | `unexpected` (excepción interna) | Sin HTTP hacia WooCommerce |
| Metadatos | Ninguno | `_tc_reconciled_payment`, `_tc_alerted` | Trazabilidad y aviso único |
| Pruebas TS 25 y 26 | Autenticación del barrido por `RECONCILE_SECRET` | No aplican (cron por línea de comandos sin URL); se sustituyen por comprobaciones del registro y de la guarda de CLI | |

Sin cambios: la búsqueda por `external_reference` exacta, la regla de un solo pago aprobado, CLP en el pago y en el pedido, el monto contra el total del pedido (nunca contra `totals.total_price` de la Store API, que sale ×100: informe §10c) y la relectura antes de escribir.

## 5. Límites conocidos (no se ocultan)

- **Carrera con el IPN (reducida, NO eliminada):** el plugin de Mercado Pago no usa el bloqueo de este plugin. Se combinan dos medidas: la antigüedad mínima de 5 min (`TC_MIN_AGE_SECONDS`) evita el caso común (IPN de 1 s a 124 s), y la relectura del estado bajo el bloqueo deja una ventana de milisegundos. Un IPN muy tardío (el del #21 llegó a los ~54 min) sigue dependiendo solo de esa relectura. Si coinciden en ese instante, **[H]** podrían duplicarse el descuento de stock o los correos. Se mide en la prueba real (paso 6).
- **Comportamiento real de `payment_complete()` [I, sin probar]:** cambia a `processing`/`completed`, guarda `date_paid` y `transaction_id`, descuenta stock una vez (meta `_order_stock_reduced`) y envía los correos de la transición `pending→processing`.
- **IPN que llega después de conciliar [H]:** se espera que el plugin de MP no repita stock ni correos porque no hay transición de estado. No verificado: no tenemos el código del plugin.
- **Pedidos conciliados sin los metadatos del plugin de MP [I]:** el cuadro de pago y el reembolso desde WooCommerce podrían no funcionar; reembolsar desde el panel de Mercado Pago.
- **Errores no relacionados:** la cancelación automática de pedidos sin pagar no operó en la tienda de prueba (informe §5).

## 6. Pruebas

**Unitarias:** `php wordpress/tests/decide-test.php` (PHP 8.3+ por línea de comandos, sin dependencias). Salida `N pruebas, 0 fallidas` y código 0. Actualmente 117 con PHP 8.3.35.

La última sección del archivo prueba el orquestador y la capa `tc_wp_*` con **dobles mínimos** de WordPress y WooCommerce (`WC_Order`, `wp_remote_get`, `wc_get_orders`, `wp_mail`, `$wpdb`; token ficticio, sin red, ningún pedido real). Comprueban qué llama nuestro código y en qué orden (por ejemplo, que la marca `_tc_alerted` se guarda antes del correo y que `payment_complete` nunca se invoca en un pedido cerrado). **No sustituyen la prueba real en WordPress:** no demuestran lo que WooCommerce hace por dentro (stock, correos de transición, cachés de objetos, HPOS) ni que el cron o Mercado Pago se comporten como se supone.

**Prueba real obligatoria antes de entregar a un cliente** (tienda de prueba propia, estructura `dominio/` + `dominio/wp/`, nunca gbike.cl):
1. Producto con stock conocido (p. ej. 10), `TC_DRY_RUN` en `true` y acceso a los correos del administrador y del comprador.
2. Bloquear el IPN a propósito: en `public_html/wp/.htaccess`, devolver 403 a `wc-api/WC_WooMercadoPago_Basic_Gateway`. Pagar un pedido y confirmar en el registro de acceso que el IPN fue rechazado.
3. Ejecutar el cron → el registro muestra `would_mark_paid` solo para ese pedido. Stock y correos sin cambios.
4. Con `TC_DRY_RUN` en `false`, ejecutar el cron → pedido en `processing`, `date_paid` y `transaction_id` = id del pago, nota de conciliación, **stock 10→9**, **un** correo al comprador y **uno** a la tienda.
5. Ejecutar el cron dos veces más y llamar a la ruta REST → `already_paid`. Stock en 9, sin correos nuevos.
6. Quitar el bloqueo del IPN y esperar o forzar el reintento de MP → sigue en `processing`, stock 9, sin correos duplicados. Si MP no reintenta, anotarlo como no probado.
7. Pedido pagado con el IPN bloqueado y luego cancelado a mano → el cron no lo marca: deja una nota y envía un correo al administrador (el barrido ahora incluye `cancelled` y `failed`). Al repetir el cron, no hay un segundo correo y el pedido deja de consultarse (`already_alerted`; en el registro solo se cuenta en `silenciados`). Con un cancelado que nunca se pagó, la primera pasada real anota `_tc_closed_checked` y las siguientes dicen `recently_checked` (silenciado) hasta que venza el intervalo. **NO PROBADO en un WordPress real.**
7b. Con `TC_MP_SELLER_ID` distinto del vendedor del token → el cron termina con `error: seller_mismatch` y no lista pedidos. Con el correcto → la cabecera dice `vendedor=match`. **NO PROBADO en el hosting.**
8. Monto distinto (editar el total de un pedido pendiente ya pagado) → `review`, nota y un correo; no se marca.
9. Ruta REST con key o email incorrectos y con un pedido inexistente → la misma respuesta; una segunda llamada antes de 60 s → `try_later`.
10. Dos ejecuciones del cron a la vez → una dice "otra ejecución en curso".
11. Medir si el hosting respeta `Cache-Control: no-store` en `/wp/wp-json/wc/store/v1/order/{id}` (misma URL repetida: ~600 ms = PHP, ~30 ms = caché).
