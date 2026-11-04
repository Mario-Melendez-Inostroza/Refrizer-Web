@AGENTS.md


## Imágenes y despliegue en Vercel

**Convención:** las imágenes que muestra el sitio viven en `public/images/` (subcarpetas permitidas, p. ej. `products/`), con nombres en minúsculas, sin tildes ni espacios (kebab-case), y se referencian como `"/images/nombre.ext"`. Nunca `figma:asset`, nunca rutas relativas a `public/`. Imágenes de más de ~500 KB se convierten a `.webp`. Las fuentes originales y capturas de QA van en `reference/` (fuera de `public/`, no se despliegan).

**Por qué importa:** los proyectos exportados de Figma Make traen un `.gitattributes` que manda todo `*.png/*.jpg/*.webp` a **Git LFS**. En GitHub queda un puntero de texto (~130 bytes, `version https://git-lfs...`) y Vercel no descarga LFS: publica ese texto con `content-type: image/png` y el navegador muestra la imagen rota. El `.gitattributes` de este repo ya excluye `public/**` de LFS; no lo revierta.

**Checklist antes de subir a Vercel**
1. `grep -rn "figma:asset" src` no devuelve nada.
2. Todas las imágenes de `public/images/` tienen nombre en minúsculas, sin tildes ni espacios (Linux distingue mayúsculas): `find public -name "*[A-Z ]*" -o -name "*[áéíóúñ]*"` no devuelve nada.
3. Ninguna imagen de `public/` pasa por LFS: `git check-attr filter -- public/images/*` dice `unset` y `git lfs ls-files | grep public/` no devuelve nada.
4. Imágenes sin trackear o ignoradas: `git status --short` y `git ls-files --others --exclude-standard public` vacíos.
5. El blob commiteado es la imagen real y no un puntero: `git cat-file -s :public/images/logo.png` da cientos de KB, no ~130 bytes.
6. Build y preview limpios: `pnpm install --frozen-lockfile && pnpm build && pnpm preview`, y revisar en el navegador que carguen logo, hero, categorías, productos y banners (probar también a 375px).
7. Hacer push y esperar el deploy; verificar con curl que cada imagen clave responde `200` y `content-type: image/*` (no `text/html`, no ~130 bytes):
   `curl -sI https://<URL-de-Vercel-de-Refrizer>/images/logo.png | grep -iE "^HTTP|content-type|content-length"`
8. Confirmar que Vercel despliega la rama correcta (normalmente `main`): si el sitio muestra una versión vieja, falta hacer merge/push a esa rama.


---

<!-- motor-de-pagos -->
# Motor de pagos y tienda real (integración en este proyecto)

**Este proyecto YA tiene diseño propio y es la tienda real de Refrizer.** Se le está agregando un motor de pagos (WooCommerce + Mercado Pago + conciliación) que ya se probó en un staging. **No reescribas el diseño ni los componentes visuales; se conectan los datos y el pago por debajo.** Trabaja en la rama `integracion-motor` (créala si no existe); `main` no se toca sin que Mario lo apruebe. Las reglas de imágenes y Git LFS de arriba siguen vigentes.

**Lee primero `docs/playbook-tienda-real.md`, `docs/nueva-tienda.md` y `docs/ROADMAP.md`.** Aún no existe `docs/INTEGRACION.md` para Refrizer: tras leer el código del proyecto (rutas, productos, carrito, checkout), propón y escribe uno con el mismo esquema (estado actual, qué aporta el motor, decisiones y fases). El código de referencia del motor está en `docs/referencia-plantilla/` (para portar, no para copiar encima). El resto de lo que sigue es el briefing general de la tienda real.

Este proyecto es una **copia de la plantilla** que ya se probó entera en un staging (BenzaHosting, 2026-10-28 y 29). Tu trabajo es montar con ella la tienda real de **una clienta** y dejarla lista para vender. Todo lo aprendido está escrito: **no lo redescubras, léelo y síguelo.**

## Lo primero que haces en cada sesión

1. Lee `docs/playbook-tienda-real.md` (la receta: orden de montaje, pruebas mínimas, errores ya cometidos).
2. Lee `docs/ROADMAP.md` (el estado de ESTA tienda: qué está hecho, qué falta, quién lo hace) y `docs/DATOS-CLIENTA.md` (datos de la clienta, sin credenciales).
3. Si algo de pagos o del plugin te genera dudas: `wordpress/README.md` y `docs/variables-entorno.md`.
4. Historia del staging, solo si hace falta: `docs/archivo-staging/` (no es la fuente de verdad; el playbook sí).
5. Resume en 5 líneas dónde estamos y propón el siguiente paso. No empieces cambios en el servidor sin decir qué vas a hacer.

## Qué es el sistema (en breve)

- **React en la raíz** del dominio (`public_html/` o la carpeta del sitio) y **WordPress + WooCommerce en `/wp`**. Catálogo y checkout por la Store API de WooCommerce, en el mismo origen. Pago con **Mercado Pago Checkout Pro (Redirect)**.
- **Red de seguridad propia:** plugin `wordpress/tienda-conciliacion/` + cron de cPanel (`wordpress/cron/tc-cron.php`, cada 5 min, PHP CLI). Si el aviso (IPN) de un pago no llega, el cron consulta a Mercado Pago y marca el pedido pagado con `payment_complete()`. Modo simulación hasta pasar las pruebas (`TC_DRY_RUN`).
- Secretos solo en `/home/USUARIO/tienda-secretos/config.php` (permisos 600, fuera de la web). Nunca en el repo, el chat, los commits ni los registros.

- **`api/` y `vercel.json` son una especificación obsoleta** (la versión en TypeScript para Vercel, que ya no se usa). No se despliegan ni se configuran; la conciliación real es el plugin de WordPress. Se pueden retirar en un commit aparte.

## Cómo trabaja Mario (respétalo)

- Habla **español de Chile**. Respuestas claras y concretas; sin jerga innecesaria.
- Quiere que **hagas tú todo lo que puedas** (con Chrome, el repo y el servidor). Para lo que **solo él** puede hacer, dale el **paso a paso exacto** (dónde hacer clic, qué escribir, qué esperar ver), no una lista de tareas vaga.
- **Avísale antes de que cambie de modelo o de esfuerzo.** Él ejecuta `/model`; tú no puedes. Por defecto basta **Sonnet 5.5 en esfuerzo medio** (en Refrizer Sonnet bastó incluso para cambiar el plugin de conciliación y depurar el retorno de pagos; Opus se usó solo en el paso a credenciales). Pídele **Opus 5.5** solo en: (a) el momento de poner `TC_DRY_RUN = false` por primera vez y la primera conciliación real, (b) el paso a credenciales de producción, (c) depurar un fallo de pagos que no se entiende.
- **No inventes direcciones de correo ni cuentas** en el dominio de la clienta. Si hace falta un buzón, se le pide a ella o se le indica a Mario cómo crearlo.
- Pregunta antes de cualquier acción difícil de revertir o que salga al exterior (borrar, enviar un mensaje, tocar DNS, comprar, cambiar credenciales).
- Cuando termines un bloque: actualiza `docs/ROADMAP.md`, haz el commit (mensaje en español, con la línea de coautoría que indique el sistema) y resume qué quedó verificado y qué no.
- Honestidad: distingue siempre **probado** (con evidencia), **inferido** y **no probado**. No marques `[x]` sin haberlo comprobado.

## Reglas duras

- **Nunca abras ni imprimas `config.php`** (tiene el Access Token). Sobre ese archivo solo metadatos (`Fileman/list_files`: tamaño, fecha, permisos) y el registro del cron. Nunca pidas a Mario que pegue un token o una contraseña; si manda una captura con uno visible, no lo repitas.
- **Credenciales de prueba primero, producción después.** Mientras no pasen las pruebas de la sección 4 del playbook, la tienda usa credenciales y cuentas de prueba de Mercado Pago. El paso a producción es la sección 4b (compra real de monto mínimo y devolución). `TC_DRY_RUN` queda en `true` hasta entonces.
- **`TC_MP_SELLER_ID` es el último grupo de números del Access Token**, no el Client ID ni el número de la aplicación. Con credenciales de prueba es el del usuario vendedor de prueba; en producción es otro. Se verifica con `vendedor=match` en el registro del cron.
- **Lo que tú NO haces, aunque Mario lo pida** (te lo bloquea el sistema de permisos y es correcto): crear cuentas o contraseñas, cambios de DNS o de seguridad del servidor (ModSecurity, PHP, índices), borrar archivos o usuarios, restaurar respaldos, instalar plugins de seguridad. Se los dejas a Mario con pasos exactos. Lo que sí puedes: leer, verificar, editar archivos del repo y subir archivos del sitio **con copia previa y verificación posterior**.
- **Siempre copia antes de editar** un archivo del servidor (a `/home/USUARIO/tienda-cron/backup-AAAAMMDD-...`), edita, relee y compara, y verifica el sitio justo después. Si falla, restaura la copia.
- **No hagas ráfagas de peticiones** a un sitio con Imunify360 (aparece el desafío anti-bot). Una página a la vez, con pausas de 1,5 s o más. Nunca intentes saltar el desafío.
- **Los plugins con firewall** (Wordfence completo y similares) no se instalan sin probar una compra: pueden bloquear el aviso de Mercado Pago. Para 2FA se usó **WP 2FA**.
- **No uses el modo "Próximamente"** de WooCommerce: hace que el aviso de Mercado Pago dé 502.
- **Las URLs de retorno** del plugin de Mercado Pago (éxito, rechazo y pendiente) deben ser `https://<dominio>/pedido/retorno`. Sin eso el comprador vuelve a la página de WordPress.
- **El remitente de correos** de WooCommerce nunca es un Gmail: debe ser un buzón del dominio de la clienta, con SPF, DKIM y DMARC en PASS (se verifica con "Mostrar original" en Gmail). Si no, todo va a spam.

## Lo aprendido en la primera tienda real (Refrizer, 2026-11) — aplícalo desde el día 1

- **Los textos legales los entrega la clienta.** No los redactes ni publiques "texto base": en Refrizer se hizo y Mario pidió quitarlos. Se avisa a la clienta y se publican cuando ella los entregue.
- **Vincular la cuenta de Mercado Pago:** en el plugin no hay formulario suelto de producción. Es *Modificar cuenta > país > "En la cuenta de otra persona"* y pide **4 credenciales de la MISMA aplicación y cuenta** (producción y prueba). Mezclar cuentas da "No fue posible vincular". **Pega los tokens Mario**, nunca tú. Detalle en el playbook §2 (4b).
- **Las tarjetas no se prueban en sandbox** (siempre rechazan). Se prueban **en producción con $10**, en incógnito, **sin iniciar sesión en Mercado Pago** y con un correo distinto al de la cuenta (playbook §4d). Mario puede usar su propia cuenta como vendedora temporal y luego **volver a vincular la de la clienta antes de abrir**.
- **`vendedor=match` no prueba que el token sea de la cuenta correcta**, solo que token e ID coinciden. Se confirma viendo el pago en el panel de esa cuenta.
- **Pedido rechazado = "Pendiente de pago" y sin ninguna señal en WooCommerce.** El cliente preguntará cómo distinguirlo: el plugin deja una nota privada "pago rechazado (motivo)" (solo con `TC_DRY_RUN=false`). Solo se despacha lo que está en **Procesando**. `/pedido/retorno` con `status=rejected` debe decir "Tu pago fue rechazado": el query solo elige el texto, el estado sale del servidor.
- **Reemplazar archivos del servidor:** copia previa leyendo/guardando en `tienda-cron`, subir con confirmación "Overwrite File? Yes", y comprobar el tamaño exacto (playbook §3, 2c). Con archivos PHP que dependen entre sí, sube primero el que define las funciones.
- **Sin PHP en el equipo:** `wordpress/tests/correr-pruebas-sin-php.mjs` corre las pruebas del plugin con PHP en WebAssembly (instrucciones en el archivo). Tras cambiar el plugin, **compara `git diff`** y confirma que solo hay líneas añadidas en las pruebas existentes.
- **Contacto real y sin redes falsas:** teléfono/WhatsApp/correo reales; quita iconos y enlaces de redes que la clienta no tenga; el buzón del remitente se crea en el cPanel de la clienta.
- **Pedidos y productos de prueba:** a $10, con "(borrar)" en el nombre; se borran en R5 antes de abrir.

## Cómo verificar con Chrome (herramientas `mcp__claude-in-chrome__*`)

- Carga las herramientas en **una sola** llamada a ToolSearch (navigate, tabs_context_mcp, tabs_create_mcp, javascript_tool, get_page_text, find, form_input, computer, file_upload, tabs_close_mcp).
- Solo ves las pestañas de **tu propio grupo**. Si `tabs_context_mcp` dice que no hay grupo, usa `createIfEmpty: true`; si necesitas una pestaña de Mario (WooCommerce, cPanel), pídele que la arrastre al grupo. Cierra siempre las pestañas que abras tú.
- En `javascript_tool` no uses `return` al nivel superior (usa una expresión o `await`). La salida que parezca datos de cookies o de consulta se **bloquea**: reemplaza `=` por `~` o muestra solo lo necesario.
- **cPanel:** la sesión lleva un `cpsessNNNN` en la URL (cambia por sesión; lo ves en las pestañas). La API de archivos funciona con `fetch` desde una pestaña de cPanel: `/cpsessNNNN/execute/Fileman/get_file_content`, `save_file_content` (POST), `list_files`. **La API de cron no existe**: se crea con el formulario de Trabajos de Cron (`find` + `form_input` + clic). Subir archivos binarios o grandes: `file_upload` sobre `.../filemanager/upload-ajax.html?dir=<carpeta>`.
- **WordPress:** requiere sesión de Mario (con 2FA); no inicies sesión tú. Lee páginas de administración con `get_page_text` o `javascript_tool` (por ejemplo WooCommerce > Pedidos, Estado, Acciones programadas).
- Lectura de pedidos, stock y notas: abre la pantalla de edición del pedido y lee `ul.order_notes`; el stock sale de `/wp/wp-json/wc/store/v1/products?per_page=1&_x<timestamp>`.

## Caché del hosting

El hosting cachea los GET por URL durante minutos. Para leer algo fresco agrega un parámetro único. El frontend ya lo hace (`_` = bloque de 30 s en el catálogo; marca de tiempo en `/order`).

## Qué NO se probó en el staging (y por qué)

El IPN tardío tras conciliar, `seller_mismatch`, monto distinto y dos crons a la vez: **decisión de Mario de no probarlos** (casos raros, cubiertos por pruebas unitarias). **Ya probado en producción (Refrizer, 2026-11-03, con la cuenta de Mario como vendedora temporal):** pago con tarjeta de crédito y de débito aprobado, pago rechazado y qué muestra `/pedido/retorno` en cada caso. **Sigue sin probarse:** la **devolución**, el pago **pendiente/en proceso** (efectivo u otros medios) y que la nota de rechazo no se repita en el servidor. En cada tienda nueva hay que repetir una compra mínima con la cuenta real de la clienta.

## Comandos del proyecto

`npm test` · `npx tsc --noEmit` · `npm run build:hosting` (no `npm run build`) · `php wordpress/tests/decide-test.php` (en el equipo de Mario no hay PHP: usar `wordpress/tests/correr-pruebas-sin-php.mjs`, 122 pruebas).
