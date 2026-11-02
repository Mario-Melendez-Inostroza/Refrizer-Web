# Playbook: montar la tienda real de una clienta

> **Nota (copia para una tienda nueva):** en este proyecto `ROADMAP.md` es el de la tienda NUEVA. El estado y las fechas del staging están en `archivo-staging/ROADMAP-staging.md`; los datos de la clienta, en `DATOS-CLIENTA.md`.

Solo lo que **se probó y funcionó** en el staging de BenzaHosting (2026-10-28 y 29). El estado vivo y los pendientes están en [ROADMAP.md](ROADMAP.md); la guía larga original, en [nueva-tienda.md](nueva-tienda.md).

**Quién:** **C** = Claude Code (repositorio y verificaciones de solo lectura en Chrome) · **M** = Mario (cPanel, WordPress, cuentas) · **Cliente** = la clienta.
**Lo que Claude no hace aunque se lo pidan:** crear cuentas o contraseñas, cambios de DNS y de seguridad del servidor, borrar archivos o usuarios, restaurar respaldos. Esos pasos son de M.

## 0. Lo que se reutiliza sin tocar

| Pieza | Dónde | Cambia por tienda |
|---|---|---|
| Tienda React | `src/`, `npm run build:hosting` | `src/config/site.ts` y `.figma/make/site.json` (marca, textos, contacto, prefijo `WC-`) |
| Plugin de conciliación | `wordpress/tienda-conciliacion/` | Nada |
| Cron | `wordpress/cron/tc-cron.php` | Solo la ruta del usuario y del dominio en el comando |
| `.htaccess` de la SPA y cabeceras | `public/.htaccess` | Nada (conservar el bloque PHP de cPanel del servidor) |
| Configuración secreta | `wordpress/config.example.php` | Token, ID de vendedor y prefijo de la clienta |

## 1. Lo que depende de la clienta (se pide el primer día, es lo que más demora)

- [ ] Hosting y dominio a nombre de ella; cuenta **vendedora** de Mercado Pago verificada (de ahí sale el Access Token de producción).
- [ ] Comisión de Mercado Pago explicada y confirmada en su Simulador de comisiones.
- [ ] Productos (10 a 25: fotos, descripción, precio con IVA, stock), textos legales (Términos, Cambios y devoluciones), datos de contacto.
- [ ] Un **buzón de correo de su propio dominio** para el remitente de la tienda (ver §5).
- [ ] Decidir despacho: sin despacho (`shipping.enabled=false`, lo normal) o con tarifas.

## 2. Servidor (M)

1. WordPress y WooCommerce en `public_html/wp/`; Dirección de WordPress **y** del sitio = `https://<dominio>/wp`. Enlaces permanentes distintos de "Simple". Sitio **Visible** (nunca "Próximamente": rompe el aviso de Mercado Pago con 502).
2. CLP sin decimales, precios con IVA, envío desactivado, "Mantener stock" en 60 min, **zona horaria `America/Santiago`** (viene en UTC+0).
3. PHP **8.3 o superior** en MultiPHP Manager. Comprobable sin entrar a cPanel: WooCommerce > Estado > Versión de PHP.
4. Plugin oficial de Mercado Pago: **Checkout Pro, modo Redirect**. Abrir las opciones avanzadas y **guardar**. Poner las **tres URLs de retorno** (éxito, rechazo, pendiente) en `https://<dominio>/pedido/retorno`. Sin esto el comprador vuelve a la página de WordPress. Debug apagado al entregar.
5. `config.php` **fuera de la web**, p. ej. `/home/USUARIO/tienda-secretos/config.php`, permisos **600**, cargado desde `wp-config.php` con `require_once` antes de `/* That's all, stop editing! */`:
   - `TC_MP_ACCESS_TOKEN`: el Access Token de producción.
   - `TC_MP_SELLER_ID`: el **ID de la cuenta vendedora**, que es el último grupo de números del Access Token (después del último guion). **No** es el *Client ID* ni el número de la aplicación.
   - `TC_DRY_RUN`: `true` hasta pasar las pruebas, después `false` (booleano, sin comillas).
   - `TC_MIN_AGE_SECONDS` = `300` y `TC_REFERENCE_PREFIX` = `'WC-'`.
6. Subir el plugin (zip, Plugins > Subir plugin) y activarlo. Prueba: `POST /wp/wp-json/tienda/v1/reconcile` con `{}` → `{"ok":true,"result":"not_found"}`.
7. Copiar `tc-cron.php` a `/home/USUARIO/tienda-cron/` y crear el cron de cPanel **cada 5 min** (se creó con el formulario de Trabajos de Cron; la API de cron no existe en este cPanel):
   ```
   /opt/cpanel/ea-php83/root/usr/bin/php -q /home/USUARIO/tienda-cron/tc-cron.php /home/USUARIO/<carpeta-del-sitio>/wp/wp-load.php >> /home/USUARIO/tienda-cron/registro.txt 2>&1
   ```
   Ojo: la carpeta del sitio es la que muestra WooCommerce > Estado (en el staging fue `/home/visionar/staging.visionaryenterprises.cl/`, no `public_html`). Verificación: cada 5 minutos aparece una línea `barrido dry_run=… vendedor=match`. `vendedor=unconfigured` = falta `TC_MP_SELLER_ID`. El registro está en UTC (restar 3 horas).
8. Seguridad (todo verificado en el staging; cada ítem con su comprobación):
   - **PHP 8.3 o superior** (WooCommerce > Estado) y **ModSecurity** activo (cPanel > ModSecurity: "En" para cada dominio).
   - **`session.upload_progress.enabled = Off`**: cPanel > MultiPHP INI Editor > Editor Mode > dominio > agregar la línea > Guardar. Se verifica leyendo `.user.ini` y `php.ini` del sitio.
   - **Sin listado de carpetas**: cPanel > Índices > carpeta del sitio (la raíz del dominio, p. ej. `/home/USUARIO/<dominio>/`) > **Sin índice**; las subcarpetas heredan. Comprobar que `/wp/wp-content/uploads/` da 403. No usar `Options -Indexes` en `.htaccess` (puede dar 500).
   - **Administrador nuevo** con un nombre distinto del usuario de cPanel, y borrar el de instalación atribuyendo su contenido. Si WordPress dice que el usuario no existe, casi seguro falló la creación por **correo duplicado**: usar otra dirección (`correo+adm@gmail.com` llega a la misma bandeja).
   - **2FA**: plugin **WP 2FA** (solo hace 2FA). Método: app de autenticación; desmarcar el código por correo (los correos pueden ir a spam); activar los **códigos de respaldo** y guardarlos; obligatorio para todos; **exigir de inmediato**; no instalar el plugin extra que ofrece al final. Probar en ventana de incógnito antes de cerrar la sesión.
   - **No instalar plugins de seguridad con firewall** (Wordfence completo y similares) sin probar una compra: pueden bloquear el aviso de Mercado Pago.
   - Borrar plugins sin usar (Akismet, Hello Dolly), mantener respaldos (Softaculous > Respaldos) y revisar el escáner de Imunify360 (malware y defensa proactiva).
   - **Plugin de Mercado Pago**: instalar la versión vigente al montar la tienda y **repetir una compra completa** después de cada actualización (el 8.9.6 → 8.9.7 se probó y conservó las URLs de retorno).

## 3. Frontend (C + M)

1. C: editar `site.ts` y `site.json`; `npm test`; `npm run build:hosting`; buscar secretos en `dist/`.
2. M: **antes de subir**, abrir el `.htaccess` del sitio en el servidor y conservar su bloque de cPanel (`# php -- BEGIN cPanel-generated handler`); subir **solo el contenido de `dist/`**, sin tocar `wp/`.
2b. **Actualizar solo el JS** (cambios chicos, como el de P18): copia de `index.html` fuera de la web; subir el `index-<hash>.js` nuevo a `assets/` con cPanel > Administrador de archivos > Cargar (`upload-ajax.html?dir=<assets>`; el CSS y las imágenes con el mismo nombre ya están); cambiar en `index.html` solo la referencia al JS; comprobar `/` y `/pedido/retorno`.
3. Comprobar (C, solo lectura): `/pedido/retorno` y `/producto/x` devuelven la tienda (no 404); `index.html` con `no-cache`; `/assets/*` con `immutable`; cabeceras HSTS, `X-Frame-Options`, `Referrer-Policy`, `nosniff` en `/`, la Store API y `wp-login`.

## 4. Pruebas mínimas antes de abrir (las que pasaron en el staging)

1. **Compra completa en la tienda React** con la cuenta compradora de prueba: vuelve a `/pedido/retorno`, pasa de "pendiente" a "Pagado" (~1 min) y WooCommerce queda en "Procesando" con stock -1.
2. **Aviso perdido** (el caso que justifica el plugin): bloquear a propósito el aviso con una regla en `wp/.htaccess` que devuelva 403 a `wc-api/WC_WooMercadoPago_Basic_Gateway` (las dos formas: ruta y `?wc-api=`), con copia del archivo antes. Pagar un pedido → sigue "Pendiente" → barrido: `pending / too_recent` y a los 5 min `would_mark_paid`.
3. **Escritura real:** `TC_DRY_RUN` en `false` → `marked_paid`: "Procesando", stock una sola vez, un correo al cliente y uno a la tienda, nota de conciliación. Las pasadas siguientes no repiten nada.
4. **Pago sobre pedido cancelado:** pagar con el aviso bloqueado y cancelar a mano en menos de 5 min → `approved_payment_on_cancelled`, no se reactiva, un solo correo de revisión al administrador.
5. **Quitar el bloqueo** (restaurar el `.htaccess` desde la copia) y verificar que el aviso vuelve a dar 400 a un GET, no 403.
6. Ruta REST: clave o correo erróneos y pedido inexistente dan la misma respuesta (`not_found`); repetir antes de 60 s da `try_later`.
7. **Correos a la bandeja de entrada**, no a spam: ver §5.

## 4b. Paso a credenciales reales (dinero real)

Las pruebas de la sección 4 se hacen **primero con credenciales y cuentas de prueba** de Mercado Pago. Solo cuando pasan se cambia a las credenciales reales de la clienta:

1. Poner el Access Token de **producción** de la clienta en el plugin de Mercado Pago y en `config.php` (`TC_MP_ACCESS_TOKEN`), y su **ID de vendedor** en `TC_MP_SELLER_ID` (último grupo de números del token). Dejar `TC_DRY_RUN = true`. Comprobar `vendedor=match` en el registro del cron.
2. **Una compra real de monto mínimo** (el producto más barato) con una cuenta o tarjeta **distinta** de la vendedora (Mercado Pago no deja que una cuenta se compre a sí misma, hasta donde sé). Verificar: retorno a `/pedido/retorno`, "Procesando", stock -1, correos y que el barrido en simulación lee el pago real (`pending / too_recent`, luego `would_mark_paid` solo si el aviso se hubiera perdido).
3. **Devolver ese pago** desde el panel de Mercado Pago. Puede que la comisión no se reintegre: es el costo de la prueba, hay que avisarle a la clienta. El caso `refunded` de la conciliación no está probado en vivo.
4. Recién entonces `TC_DRY_RUN = false`.
5. Ajustes de producción: debug del plugin apagado, rastreo a 5 min, y **no** dejar productos de prueba ni pedidos de prueba en la tienda (borrarlos antes de abrir).

**Qué se usó en el staging (aclarado por Mario, 2026-10-29):** una integración creada en su cuenta real de Mercado Pago y sus **credenciales de prueba**, con una cuenta compradora de prueba. Es decir, todo el dinero fue de prueba. Consecuencias para la tienda real:
- El `TC_MP_SELLER_ID` del staging es el del **usuario vendedor de prueba**. En la tienda real es otro número: el del Access Token de **producción** de la clienta.
- Todas las compras del staging fueron con **saldo de Mercado Pago** (`payment_type=account_money` en la dirección de retorno). **Sin probar:** pago con tarjeta (crédito y débito), pago **rechazado** (retorno con `status=rejected`: ¿qué muestra `/pedido/retorno`?), y pagos **pendientes o en proceso**. Antes de abrir, probar al menos un pago con **tarjeta de prueba aprobada** y uno **rechazado**, con las credenciales de prueba de la clienta.
- La conciliación solo actúa sobre pagos `approved`; los pendientes o rechazados no los toca (comportamiento esperado, no probado en vivo).

## 5. Correos (el problema que más tiempo costó)

- El remitente de WooCommerce **nunca** debe ser un Gmail: Gmail lo trata como suplantación (DMARC FAIL) y manda todo a spam. Debe ser un buzón del dominio de la clienta, creado en su cPanel.
- cPanel > Entregabilidad del correo: SPF, DKIM y DMARC en "Valid" (M instala los registros sugeridos; el DMARC `p=none` es el más suave).
- Verificación: en Gmail, "Mostrar original" del correo de una compra de prueba: **SPF, DKIM y DMARC en PASS**. Un dominio nuevo puede seguir en spam un tiempo aunque pase todo.

## 6. Errores que ya pasaron (no repetir)

- Usar el *Client ID* o el número de aplicación como `TC_MP_SELLER_ID`.
- Olvidar las URLs de retorno: el comprador cae en la página de WordPress.
- Subir `config.php` o el token al repositorio, al chat o a un registro.
- Actualizar el plugin de Mercado Pago justo antes de abrir: se actualiza **antes** de las pruebas, o se repiten.
- Hacer ráfagas de peticiones a un sitio con Imunify360: aparece el desafío "Espere mientras se verifica su solicitud…". Una página a la vez.
- La zona horaria de WordPress en UTC+0 (notas y correos con 3 o 4 horas de diferencia).
- La tienda de WordPress con su tema queda pública en `/wp/` y se puede comprar ahí; decidir si se redirige (sin tocar `wp-json`, `wc-api`, `wp-admin` ni `wp-login.php`).

## 6b. Cómo verificar rápido con Chrome (para Claude)

- Claude solo ve las pestañas de su propio grupo de Chrome: si "no hay grupo", abrir uno nuevo y que M arrastre las pestañas que haga falta. **Una página a la vez**: ráfagas de peticiones activan el anti-bot.
- En cPanel, la API de archivos funciona por GET/POST con la sesión abierta: `/cpsessXXXX/execute/Fileman/get_file_content`, `save_file_content` y `list_files` (la API de cron **no existe**; usar el formulario). `config.php` no se abre nunca: solo metadatos con `list_files`.
- Lo que Claude **no** hace aunque se lo pidan: cambios de DNS, crear cuentas o contraseñas, borrar archivos o usuarios, restaurar respaldos, activar ajustes de seguridad del servidor. Esos pasos los hace M siguiendo esta guía.

## 7. Lo que sigue sin probar

IPN tardío tras conciliar, pedido reembolsado, monto distinto, `seller_mismatch`, dos crons a la vez, y que la caché del hosting respete `no-store` en `/order`. **Mario decidió no probar** el IPN tardío, el monto distinto, `seller_mismatch` ni los dos crons a la vez (2026-10-29): están cubiertos solo por las pruebas unitarias con dobles. Si alguna tienda mueve mucho dinero, conviene hacerlas antes de abrir. Detalle y fechas en [ROADMAP.md](ROADMAP.md).
