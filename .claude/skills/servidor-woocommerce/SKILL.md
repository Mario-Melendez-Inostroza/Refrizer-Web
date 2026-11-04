---
name: servidor-woocommerce
description: "Montar o revisar el servidor de la tienda real: WordPress y WooCommerce en /wp, ajustes, PHP, config.php de secretos, plugin de conciliación, cron de cPanel y seguridad. Úsalo al preparar el hosting de una clienta o al tocar config.php / el cron."
---

# Servidor de la tienda (M hace los pasos de cPanel y WordPress; C verifica)

## 2. Servidor (M)

1. WordPress y WooCommerce en `public_html/wp/`; Dirección de WordPress **y** del sitio = `https://<dominio>/wp`. Enlaces permanentes distintos de "Simple". Sitio **Visible** (nunca "Próximamente": rompe el aviso de Mercado Pago con 502).
2. CLP sin decimales, precios con IVA, envío desactivado, "Mantener stock" en 60 min, **zona horaria `America/Santiago`** (viene en UTC+0).
3. PHP **8.3 o superior** en MultiPHP Manager. Comprobable sin entrar a cPanel: WooCommerce > Estado > Versión de PHP.

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
