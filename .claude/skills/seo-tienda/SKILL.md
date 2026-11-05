---
name: seo-tienda
description: "SEO de la tienda para aparecer en Google: títulos, descripciones, canonical, datos estructurados, sitemap automático, robots.txt, noindex, páginas de servicio, cobertura, despacho, redirección de www y /wp/, velocidad, Search Console y Google Business Profile, y cómo abrir la tienda a los buscadores. Úsalo al preparar el SEO de una tienda nueva o el día de abrir a Google."
---

# SEO de la tienda (probado en Refrizer, 2026-11-05)

Plan y estado completos en `docs/SEO.md` y `docs/SEO-estado-y-abrir.md`; guía para la clienta en `docs/guia-clienta-seo.md`. **Nadie puede garantizar posiciones en Google**: esto es todo lo que sí se controla.

## Reglas de contenido (antes de escribir una sola página)
- **Pregunta primero dónde se hacen los servicios y dónde se entrega** (en Refrizer: servicios en todo Santiago; productos con despacho a Santiago y regiones o retiro en una comuna sin tienda física). El SEO apunta a la zona de **servicio**, no a la comuna de retiro. No presentar el punto de retiro como local ni dirección del negocio.
- **No inventar datos**: nada de garantías, plazos, precios, años de experiencia, certificaciones ni "todas las comunas" que la clienta no haya confirmado. Los textos son borradores que **la clienta aprueba**. Hay una prueba que falla si aparece "garantía", "mismo día", "24 horas", "24/7" o "años de experiencia".
- Los textos legales los entrega la clienta.

## Qué se construye (código reutilizable, ver `docs/referencia-plantilla/SEO-REFRIZER/`)
- `src/config/seo.ts`: datos puros (páginas, 5 servicios con preguntas frecuentes, comunas de cobertura, datos de la organización). Sin alias `@/`, para que lo lean las pruebas y el build.
- `src/lib/seo.ts` (+ pruebas): URL canónica, descripción truncada en palabra completa, JSON-LD (organización **sin dirección**, sitio web, servicio, preguntas, producto con precio CLP y disponibilidad, migas) y `robotsTxt()`.
- `src/lib/useSeo.ts`: aplica título, descripción, canonical, Open Graph y Twitter, **noindex solo en páginas privadas** (carrito, pago, 404, búsquedas internas; la etiqueta global del build no se toca en las demás) y el JSON-LD de cada página. Con `null` no cambia nada (mientras carga un producto).
- Páginas: `/servicios/:slug`, `/cobertura`, `/despacho-y-retiro`, categorías con URL propia `/categoria/:slug`. Rutas con carga diferida (JavaScript inicial 340 → 241 KB).
- `vite.config.ts` (plugin `seoBuild`): **`SITE_INDEXABLE=1`** abre el sitio (sin `<meta robots noindex>`, `robots.txt` abierto con `Sitemap:`); sin la variable, queda **bloqueado** (demo). `GOOGLE_SITE_VERIFICATION=<código>` agrega la etiqueta de Search Console. También emite `sitemap-paginas.json`.
- `wordpress/sitemap/sitemap.php` → en la **raíz** del sitio, con la regla `RewriteRule ^sitemap[.]xml$ /sitemap.php [L]` en el `.htaccess` (después de la regla de `wp`). Lee las rutas fijas de `sitemap-paginas.json` y los productos y categorías de WooCommerce, así que se actualiza solo. Probado con un WordPress simulado.
- `.htaccess` de la raíz: `www` → sin `www` (301, conservando ruta y parámetros); caché de 30 días para imágenes (`FilesMatch`, antes de la regla de `/assets`).
- `/wp/` redirige a la portada: `wordpress/redirect-wp-a-portada.htaccess.txt` (mirar `THE_REQUEST`, no `REQUEST_URI`; ver la skill `servidor-woocommerce`).

## robots.txt abierto: NO bloquear `/wp/wp-json/` ni `/wp/wp-content/`
La tienda carga el catálogo desde `/wp/wp-json/...` y las imágenes desde `/wp/wp-content/uploads/`; si Google no puede pedirlos, no ve los productos. Solo se bloquean `/carrito`, `/checkout`, `/pedido/` y `/wp/wp-admin/`.

## Abrir a Google (resumen; pasos completos en `docs/SEO-estado-y-abrir.md`)
Solo cuando estén los productos reales, borrados los de prueba, datos de contacto definitivos y textos aprobados: build con `SITE_INDEXABLE=1`; subir con copia previa (`index.html` y `robots.txt` al final); comprobar sin `noindex`, `robots.txt` abierto y `/sitemap.xml` con 200; Search Console (prefijo de URL, etiqueta HTML, enviar el sitemap, pedir indexación de las páginas principales); validar los datos estructurados; revisar a las 2 y 4 semanas.

## Lo que se midió y lo que quedó pendiente
- PageSpeed (Chrome, pagespeed.web.dev): escritorio 96; accesibilidad 96; prácticas 100; SEO 69 solo por el bloqueo de indexación. **Móvil:** Lighthouse dio `NO_LCP` y un desplazamiento de diseño causado por una sección de categorías vacía que colapsa (los productos de prueba no tenían categoría): **volver a medir con productos y categorías reales**.
- Logo de la marca: se convirtió a `webp` de 640 px (de 242 a 34 KB); el original queda en `reference/`.
- Falta por cliente: texto alternativo de imágenes con las fotos reales; contraste del botón naranja con texto blanco.

## Lecciones
- Pruebas que cuidan el contenido (largo de títulos, slugs únicos, sin promesas inventadas, cobertura coherente) detectaron títulos de 82 caracteres antes de publicar.
- Un script que reescribe archivos con `\\` en cadenas se corrompe con facilidad: usar `String.fromCharCode` o clases POSIX (`[.]`, `[[:space:]]`) en reglas y código generado.
- El zip + extracción con la API de cPanel (`json-api ... Fileman fileop extract/copy`) sube 25 archivos en tres llamadas; verificar tamaño de cada uno antes de cambiar `index.html`.
