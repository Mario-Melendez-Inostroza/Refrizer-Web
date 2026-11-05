@AGENTS.md

# Tienda real con motor de pagos (briefing)

Este proyecto **ya tiene diseño propio** y es la tienda real de una clienta. El motor de pagos (WooCommerce + Mercado Pago Checkout Pro Redirect + conciliación propia) va **por debajo**: **no reescribas el diseño ni los componentes visuales**. Trabaja en la rama `integracion-motor`; `main` no se toca sin que Mario lo apruebe. Todo lo aprendido está escrito: **no lo redescubras.**

**Sistema:** React en la raíz del dominio + WordPress/WooCommerce en `/wp` (Store API en el mismo origen). Red de seguridad: plugin `wordpress/tienda-conciliacion/` + cron de cPanel cada 5 min. Secretos solo en `/home/USUARIO/tienda-secretos/config.php` (600, fuera de la web): nunca en el repo, el chat, los commits ni los registros. No hay Vercel.

## Al empezar cada sesión (barato)

1. Lee `docs/ROADMAP.md` (estado de ESTA tienda) y `docs/DATOS-CLIENTA.md`. **Solo eso.** No leas el playbook entero.
2. Resume en 5 líneas dónde estamos y propón el siguiente paso. No toques el servidor sin decir qué vas a hacer.
3. Carga la **skill** de la fase en la que estás (se abren solas por su descripción; el índice está en `docs/playbook-tienda-real.md`):

| Skill | Cuándo |
|---|---|
| `servidor-woocommerce` | hosting, `config.php`, cron, seguridad |
| `vincular-mercadopago` | vincular cuenta, credenciales, paso a producción |
| `frontend-y-despliegue` | `site.ts`, build, subir o reemplazar archivos |
| `pruebas-de-pago` | compras de prueba, rechazos, qué falta probar |
| `correos-tienda` | remitente, SPF/DKIM/DMARC |
| `seo-tienda` | aparecer en Google: SEO técnico, contenido, sitemap, Search Console, abrir a buscadores |
| `cpanel-y-chrome` | operar cPanel/WordPress con Chrome (incluye snippets listos) |

Si una skill no aparece en tu lista, léela directamente en `.claude/skills/<nombre>/SKILL.md` (son archivos normales).

Archivo de consulta (no leer salvo que haga falta): `docs/archivo/` (guía larga antigua, historia del staging, código de referencia).

## Cómo trabaja Mario (respétalo)

- **Español de Chile**, claro y concreto, sin jerga.
- Quiere que **hagas tú todo lo que puedas** (Chrome, repo, servidor). Para lo que **solo él** puede hacer, dale el **paso a paso exacto** (dónde hacer clic, qué escribir, qué esperar ver).
- **Avísale antes de que cambie de modelo.** Él ejecuta `/model`. Por defecto basta **Sonnet 5.5 en esfuerzo medio**; pide **Opus 5.5** solo para: el paso a credenciales de producción, el primer `TC_DRY_RUN=false` en una tienda nueva, o depurar un fallo de pagos que no se entiende.
- **No inventes correos ni cuentas** del dominio de la clienta. Pregunta antes de lo difícil de revertir o que salga al exterior (borrar, enviar, DNS, comprar, cambiar credenciales).
- Al terminar un bloque: actualiza `docs/ROADMAP.md`, commit en español con la línea de coautoría del sistema, y resume qué quedó verificado y qué no.
- **Honestidad:** distingue **probado** (con evidencia), **inferido** y **no probado**. No marques `[x]` sin comprobarlo.
- **Una página a la vez** en el navegador y **menos llamadas**: agrupa lecturas en un solo `javascript_tool`. Prefiere que Mario te deje la pestaña abierta antes que pedirle capturas.

## Reglas duras

- **Nunca abras ni imprimas `config.php`.** Solo metadatos (`list_files`: tamaño, fecha, permisos) y el registro del cron. Nunca pidas pegar un token o contraseña; si una captura trae uno, no lo repitas. **Los tokens los pega Mario.**
- **Prueba primero, producción después.** `TC_DRY_RUN` en `true` hasta pasar las pruebas. `TC_MP_SELLER_ID` es el **último grupo de números del Access Token** (no el Client ID); `vendedor=match` solo prueba que token e ID coinciden, no de qué cuenta son.
- **Lo que tú NO haces, aunque Mario lo pida:** crear cuentas o contraseñas, DNS o seguridad del servidor (ModSecurity, PHP, índices), borrar archivos o usuarios, restaurar respaldos, instalar plugins de seguridad. Dáselo con pasos exactos. **Sí puedes:** leer, verificar, editar el repo y subir archivos del sitio **con copia previa y verificación posterior**.
- **Siempre copia antes de editar** un archivo del servidor (`/home/USUARIO/tienda-cron/backup-AAAAMMDD-...`), edita, relee y compara, y verifica el sitio. Si falla, restaura.
- **Sin ráfagas** a un sitio con Imunify360 (pausas de 1,5 s o más); nunca saltes el desafío anti-bot.
- **Sin plugins con firewall** (Wordfence completo y similares) sin probar una compra. 2FA con **WP 2FA**.
- **Nunca modo "Próximamente"** de WooCommerce (el aviso de Mercado Pago da 502).
- **URLs de retorno** del plugin (éxito, rechazo, pendiente) = `https://<dominio>/pedido/retorno`.
- **Remitente de correos** = buzón del dominio de la clienta (nunca Gmail), con SPF/DKIM/DMARC en PASS.
- **Textos legales:** los entrega la clienta; no los redactes ni publiques texto base.
- **Tarjetas:** no se prueban en sandbox; se prueban en producción con $10 (ver `pruebas-de-pago`).

## Imágenes

Viven en `public/images/` (kebab-case, minúsculas, sin tildes ni espacios) y se referencian como `"/images/nombre.ext"`; más de ~500 KB se convierten a `.webp`. Originales y capturas de QA en `reference/` (no se despliegan). El `.gitattributes` excluye `public/**` de Git LFS (los exports de Figma Make mandan imágenes a LFS y quedan como punteros de ~130 bytes): **no lo reviertas**. Antes de subir: `grep -rn "figma:asset" src` vacío, y `git cat-file -s :public/images/logo.png` da cientos de KB (no ~130 bytes).

## Comandos

`npm test` · `npx tsc --noEmit` · `npm run build:hosting` (**no** `npm run build`) · pruebas del plugin: `php wordpress/tests/decide-test.php`, o sin PHP: `wordpress/tests/correr-pruebas-sin-php.mjs` (122 pruebas).
