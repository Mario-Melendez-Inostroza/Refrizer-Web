# Variables de entorno y configuración secreta

Sustituye al `.env.example` (no se pudo crear: la configuración local de permisos bloquea editar archivos `.env*`). **Aquí no hay valores**, solo nombres y para qué sirven.

**Arquitectura vigente (desde 2026-10-11): todo en BenzaHosting (cPanel).** React compilado en la raíz del dominio (`public_html/`), WordPress y WooCommerce en `public_html/wp/`, la conciliación como plugin de WordPress (`wordpress/tienda-conciliacion`) y un cron de cPanel por línea de comandos (`wordpress/cron/tc-cron.php`). **Vercel ya no se usa**: lo que se refiere a Vercel está al final, marcado como obsoleto.

**Estado:** nada de esto se ha probado todavía en el hosting real. Está **NO PROBADO** hasta pasar la prueba obligatoria de `docs/nueva-tienda.md` (paso 5.6).

## 1. Frontend (React)

En producción el frontend **no tiene variables**: es un sitio estático que llama a WordPress en el mismo dominio (`/wp/wp-json/...`). Nada de lo que hay aquí llega al navegador.

| Variable | Dónde | Quién la usa | Descripción |
|---|---|---|---|
| `WC_URL` | `.env.local` (solo desarrollo) | `vite.config.ts` (proxy de desarrollo) | URL base de un WordPress de prueba, sin barra final. El proxy traduce `/wp/wp-json/*` a `WC_URL/wp-json/*`. No entra al bundle (sin prefijo `VITE_`). |

- **En local:** archivo `.env.local` en la raíz (Git lo ignora por la regla `.env*`). `npm run dev` sirve el catálogo y el checkout por el proxy. La conciliación (`/wp/wp-json/tienda/v1/reconcile`) también pasa por el proxy, pero la tienda de prueba no tiene el plugin: responde con error y la página lo ignora (el pedido queda con el texto "te avisaremos por correo").
- **Compilar para el hosting:** `npm run build:hosting`, no `npm run build`. El modo `hosting` fija la base en `/` aunque el entorno tenga `FIGMA_PUBLIC_URL` (variable de la vista previa de Figma Make).

## 2. Plugin de conciliación (constantes PHP)

Van en un archivo **fuera de `public_html`**, por ejemplo `/home/USUARIO/tienda-secretos/config.php`, con permisos **600**. Se carga desde `public_html/wp/wp-config.php` con `require_once '/home/USUARIO/tienda-secretos/config.php';`, antes de la línea `/* That's all, stop editing! */`. La plantilla sin valores es `wordpress/config.example.php`.

| Constante | Obligatoria | Descripción |
|---|---|---|
| `TC_MP_ACCESS_TOKEN` | Sí | Access Token de **producción** de la cuenta vendedora de Mercado Pago del cliente. Sin él, la ruta REST y el cron responden `not_configured` sin consultar nada. |
| `TC_MP_SELLER_ID` | **Sí para escribir** (con `TC_DRY_RUN` en `false`); recomendada siempre | ID numérico (1 a 20 dígitos, sin espacios ni saltos de línea; texto o entero) del vendedor de Mercado Pago dueño del token: el mismo que usa el plugin oficial de Mercado Pago en WooCommerce. Antes de cada barrido, y de cada conciliación suelta (ruta REST), el conciliador lo compara con `GET /users/me`; si no coincide, el token es rechazado o la constante es inválida, **no consulta pagos ni escribe nada** (`seller_mismatch`, `seller_unauthorized`, `seller_check_failed`, `seller_config_invalid`). Sin ella solo corre en simulación (`vendedor=unconfigured` en el registro) y con `TC_DRY_RUN=false` se niega a escribir (`seller_not_configured`). **Aunque esté vacía, cada barrido consulta `GET /users/me`** (una vez por barrido) para detectar un token rechazado: si el token funciona, el estado es `unconfigured` y la simulación sigue; si el token es rechazado o no se puede verificar, el barrido **se detiene también en simulación** (`seller_unauthorized`, `seller_check_failed`). Así un token caducado no se confunde con «no hay pagos». Una constante con formato inválido se rechaza antes, sin gastar esa petición (`seller_config_invalid`). Es un ID, no un secreto, pero no lo pegues en el chat junto al token. |
| `TC_DRY_RUN` | No (por defecto `true`) | **Modo simulación:** informa lo que haría y no escribe nada (ni pagos, ni notas, ni correos). Solo el booleano `false`, sin comillas, permite escribir. **Queda en `true` hasta que pase la prueba real.** |
| `TC_MIN_AGE_SECONDS` | No (por defecto `300`) | Segundos que un pago debe llevar aprobado en Mercado Pago antes de que la conciliación escriba. Da tiempo al aviso real (IPN; el más lento medido tardó 124 s) y **reduce, sin eliminar,** la carrera con él. Entero ≥ 0; `0` la desactiva (no recomendado). |
| `TC_REFERENCE_PREFIX` | No (por defecto `WC-`) | "Prefijo de referencia" del plugin de Mercado Pago. Debe coincidir con `site.orders.referencePrefix` en `src/config/site.ts`. |

**Ya no hacen falta:**
- **Clave REST de WooCommerce:** el plugin usa funciones internas (`wc_get_order`, `payment_complete`).
- **Secreto del cron:** el cron corre por línea de comandos y no tiene URL.

La clave REST de lectura y escritura de la Fase 0 se revoca igual (informe §10.3).

## 3. Obsoleto: Vercel (se conserva como referencia)

Estas variables solo las lee el código de `api/` (`api/reconcile.ts`, `api/reconcile-pending.ts`, `api/wc/[...path].ts`) y `vercel.json`. El frontend ya no llama a esas rutas desde el bloque 2 (`e602eed`). **`api/` y `vercel.json` siguen en el repositorio como especificación** (sus tests corren con `npm test`). **Se retirarán solo después de que la prueba real del plugin pase.**

| Variable | Usada por | Sustituto en BenzaHosting |
|---|---|---|
| `WC_URL` | `api/wc/*`, `api/reconcile*` | No hace falta (mismo origen); en local sigue sirviendo al proxy de Vite |
| `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET` | `api/reconcile*` (hacía `PUT` con `set_paid`) | Ninguno: `payment_complete()` dentro de WordPress |
| `MP_ACCESS_TOKEN` | `api/reconcile*` | `TC_MP_ACCESS_TOKEN` en `config.php` |
| `RECONCILE_SECRET` | `api/reconcile-pending` (cabecera `Authorization: Bearer`) | Ninguno: cron por línea de comandos sin URL |
| `ORDER_REFERENCE_PREFIX` | `api/reconcile*` | `TC_REFERENCE_PREFIX` |
| `DRY_RUN` (texto `false` para escribir) | `api/reconcile*` | `TC_DRY_RUN` (booleano `false` para escribir) |

**Descripción original, ya obsoleta** (nunca se probó en Vercel real):
- `vercel.json` hacía el fallback de la SPA. **Hoy lo hace `public/.htaccess`.**
- `api/wc/[...path].ts` era el proxy de la Store API, con lista blanca, sin cookies, 404 uniforme en `/order/{id}` y 30 s de caché del catálogo en el borde. **Hoy:**
  - el navegador llama a `/wp/wp-json/wc/store/v1` con `credentials: 'omit'`;
  - el catálogo usa un parámetro que cambia cada 30 s;
  - el plugin unifica el 404 y añade `no-store` a `/order` y `/cart`.
- Vercel exigía el plan Pro para uso comercial (US$20 por usuario al mes; informe §8). **Ya no aplica.**
- Riesgo que nunca se comprobó: las importaciones con extensión `.ts` en el empaquetado de Vercel.

Pasos originales en Vercel (**obsoletos**; se conservan como registro):
1. Importar el repositorio. *Framework Preset:* Vite; *Build Command:* `npm run build`; *Output Directory:* `dist`.
2. En *Settings > Environment Variables* crear, para **Production** y **Preview**: `WC_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `MP_ACCESS_TOKEN`, `RECONCILE_SECRET` y, si cambia, `ORDER_REFERENCE_PREFIX`.
3. **No** crear `DRY_RUN` al principio (queda en modo simulación). Cuando una prueba real confirme que la conciliación hace lo esperado, crear `DRY_RUN=false`.
4. En el plugin de Mercado Pago, poner `success_url`, `failure_url` y `pending_url` en `https://<dominio>/pedido/retorno`. (Esto **sigue vigente** en BenzaHosting: `docs/nueva-tienda.md` 4.8.)
5. Probar: `GET https://<dominio>/api/wc/products` debe devolver el catálogo; `POST /api/reconcile-pending` sin cabecera debe dar 401.

## Reglas

- Nunca pegues valores reales en el chat, en commits, en logs ni en mensajes de error.
- `config.php` con el token **nunca** dentro de `public_html` ni en el repositorio.
- Rota `TC_MP_ACCESS_TOKEN` si alguna vez se filtra (y revoca las claves REST que queden de pruebas).
- Para una tienda nueva, ver `docs/nueva-tienda.md` (Fases 3 a 5).
