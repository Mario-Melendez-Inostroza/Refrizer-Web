# Roadmap: tienda real de la clienta

- **Leyenda:** `[ ]` pendiente · `[x]` hecho (con evidencia) · `[~]` en curso · `[!]` bloqueado · `[-]` no se hará, por decisión
- **Quién:** **M** = Mario (cuentas, cPanel, WordPress, pagos) · **C** = Claude Code (repositorio y verificaciones) · **Cliente** = la clienta
- **Clienta / dominio / hosting:** _(completar)_ · **Última revisión:** _(fecha)_
- Receta completa: [playbook-tienda-real.md](playbook-tienda-real.md). Datos de la clienta: [DATOS-CLIENTA.md](DATOS-CLIENTA.md). Historia del staging: [archivo-staging/](archivo-staging/).
- **Regla:** no se marca `[x]` sin evidencia (una lectura, un registro, una captura). Cada tarea lleva fecha y qué se verificó.

## 1. Lo que depende de la clienta (se pide el primer día)

- [ ] **K1** (Cliente) Hosting y dominio **a su nombre**
- [ ] **K2** (Cliente) Cuenta **vendedora** de Mercado Pago verificada; comisión explicada y confirmada en su Simulador
- [ ] **K3** (Cliente) Productos (10 a 25: fotos, descripción, precio con IVA, stock) y categorías
- [ ] **K4** (Cliente) Textos legales (Términos, Cambios y devoluciones) y datos de contacto
- [ ] **K5** (Cliente) Un **buzón de correo de su dominio** para el remitente de la tienda
- [ ] **K6** (Cliente+M) Despacho: sin despacho (`shipping.enabled=false`) o con tarifas
- [ ] **K7** (M) Integración de Mercado Pago creada (credenciales de **prueba** primero) y cuenta compradora de prueba

## 2. Servidor (playbook §2)

- [x] **S1** (C+M, 2026-11-02: WordPress 7.1.4 en /wp, direcciones https://refrizer.cl/wp, enlaces permanentes «Día y nombre», sitio «Visible» (se quitó «Próximamente»); AutoSSL/Let's Encrypt válido hasta 2027-01-31) WordPress + WooCommerce en `/wp`; direcciones del sitio = `https://<dominio>/wp`; enlaces permanentes distintos de "Simple"; sitio **Visible** (nunca "Próximamente")
- [x] **S2** (C, 2026-11-02: CLP sin decimales, envío desactivado, mantener stock 60 min, zona horaria America/Santiago; impuestos de WooCommerce desactivados, así que los precios se ingresan con IVA) CLP sin decimales, precios con IVA, envío desactivado, "Mantener stock" 60 min, **zona horaria `America/Santiago`**
- [x] **S3** (C, 2026-11-02: WooCommerce > Estado muestra PHP 8.3.36) PHP 8.3 o superior (verificar en WooCommerce > Estado)
- [~] **S4** (C instaló y activó el plugin de Mercado Pago 8.9.7, sin vincular; falta que M lo vincule con el token de prueba, Checkout Pro Redirect, las tres URLs de retorno y guardar) Plugin de Mercado Pago: Checkout Pro **Redirect**, opciones avanzadas guardadas, **las tres URLs de retorno** = `https://<dominio>/pedido/retorno`, debug apagado al entregar
- [~] **S5** (C, 2026-11-02: `tienda-secretos/config.php` creado SIN token, permisos 0600, `require_once` añadido en wp-config.php con copia en `tienda-cron/backup-20261102-wp-config.php`; falta que M pegue el token de PRUEBA y el `TC_MP_SELLER_ID`) `config.php` en `tienda-secretos/` (600), cargado desde `wp-config.php`; `TC_MP_ACCESS_TOKEN`, `TC_MP_SELLER_ID` (último grupo del token), `TC_DRY_RUN=true`, `TC_MIN_AGE_SECONDS=300`, `TC_REFERENCE_PREFIX`
- [x] **S6** (C, 2026-11-02: plugin subido y activo; `POST /wp/wp-json/tienda/v1/reconcile {}` → `not_found`) Plugin `tienda-conciliacion` subido y activo; `POST /wp/wp-json/tienda/v1/reconcile {}` → `not_found`
- [ ] **S7** (C+M) Cron de cPanel cada 5 min; el registro muestra `vendedor=match` (ruta del sitio según WooCommerce > Estado)
- [ ] **S8** (M) Seguridad: ModSecurity activo, `session.upload_progress` apagado, "Sin índice" en cPanel > Índices, administrador con nombre distinto del de cPanel, 2FA (WP 2FA, con códigos de respaldo), plugins sin usar borrados, respaldos revisados, escáner de Imunify360 limpio
- [ ] **S9** (M) Entregabilidad del correo: SPF, DKIM y DMARC en "Valid" para el dominio

## 3. Frontend (playbook §3)

- [ ] **F1** (C) `src/config/site.ts` y `.figma/make/site.json` con la marca, el contacto, el despacho y el prefijo; `npm test`; `npm run build:hosting`; sin secretos en `dist/`
- [ ] **F2** (M) Antes de subir: conservar el bloque PHP de cPanel del `.htaccess` del servidor; subir solo el contenido de `dist/`; no tocar `wp/`
- [ ] **F3** (C) Verificar: `/pedido/retorno` y `/producto/x` sin 404, cabeceras de caché y de seguridad, Store API y conciliación en 200

## 4. Pruebas con credenciales de PRUEBA (playbook §4)

- [ ] **P1** (M+C) Compra completa en la tienda React → vuelve a `/pedido/retorno` → "Pagado"; WooCommerce "Procesando", stock -1, correos
- [ ] **P2** (M+C) **Aviso perdido:** IPN bloqueado con 403 (copia del `.htaccess` antes) → `too_recent` → `would_mark_paid`
- [ ] **P3** (M+C) `TC_DRY_RUN=false` → `marked_paid` (Procesando, stock una vez, correos, nota). **Cambiar a Opus 5.5 antes de este paso**
- [ ] **P4** (M+C) Idempotencia: pasadas siguientes sin cambios; ruta REST `already_paid`
- [ ] **P5** (M+C) Pago sobre pedido cancelado → no se reactiva, un solo correo de revisión
- [ ] **P6** (M) **Quitar el bloqueo del IPN** y verificar 400 (no 403) en `/wp/wc-api/WC_WooMercadoPago_Basic_Gateway/`
- [ ] **P7** (C) Ruta REST: clave o correo erróneos y pedido inexistente dan `not_found`; repetir antes de 60 s → `try_later`
- [ ] **P8** (M+C) **Pago con tarjeta de prueba aprobada** (titular `APRO`) y **pago rechazado** (`FUND` u `OTHE`): qué muestra `/pedido/retorno`, estado y stock del pedido, la conciliación no lo toca. Tarjetas y titulares: documentación de Mercado Pago (Checkout Pro > Realizar compras de prueba), en ventana de incógnito
- [ ] **P9** (M+C) **Correos a la bandeja de entrada**: Gmail > Mostrar original con SPF, DKIM y DMARC en PASS
- [ ] **P10** (C) Cancelación automática de pedidos sin pagar: crear un pedido, no pagarlo y comprobar que pasa a "Cancelado" (puede tardar 1 a 2 horas)
- [ ] **P11** (C) Retorno sin pagar: la dirección con `status=null` muestra "Todavía no registramos tu pago"

## 5. Paso a producción (playbook §4b) — dinero real

- [ ] **R1** (M) Access Token de **producción** de la clienta en el plugin y en `config.php`; `TC_MP_SELLER_ID` nuevo; `TC_DRY_RUN=true`; `vendedor=match`. **Cambiar a Opus 5.5**
- [ ] **R2** (M) **Una compra real de monto mínimo** con una cuenta o tarjeta distinta de la vendedora; verificar retorno, stock, correos y que el cron lee el pago real
- [ ] **R3** (M) **Devolver ese pago** desde el panel de Mercado Pago (avisar a la clienta que la comisión podría no reintegrarse)
- [ ] **R4** (M+C) `TC_DRY_RUN=false`
- [ ] **R5** (M) Borrar productos y pedidos de prueba; debug del plugin apagado; rastreo a 5 min
- [ ] **R6** (M+Cliente) Decidir qué hacer con la tienda de WordPress pública en `/wp/` (redirigir sin tocar `wp-json`, `wc-api`, `wp-admin` ni `wp-login.php`)

## 6. Entrega

- [ ] **E1** (M) Accesos entregados; la clienta sabe de la comisión y de sus límites
- [ ] **E2** (M) Revisión semanal: pedidos "Pendiente de pago" cuyo pago figure aprobado en el panel de Mercado Pago; atender los correos de "revisar pago de Mercado Pago"
- [ ] **E3** (C) Actualizar el playbook con lo que haya cambiado respecto de esta receta
