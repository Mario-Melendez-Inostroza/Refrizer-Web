# SEO de Refrizer: estado y cómo abrir a Google

Complementa [SEO.md](SEO.md) (el plan). Última actualización: 2026-11-05.

## Estado (todo publicado en refrizer.cl, **todavía bloqueado para Google a propósito**)

| Tarea del plan | Estado | Cómo se comprobó |
|---|---|---|
| T2 `robots.txt` | **Hecho** (2 versiones: bloqueada hoy; abierta con `SITE_INDEXABLE=1`, que no bloquea `wp-json` ni `wp-content`) | prueba unitaria y `dist/robots.txt` de ambas versiones |
| T3 `sitemap.xml` automático | **Hecho y en vivo** (14 URL: páginas fijas, servicios y productos) | `/sitemap.xml` responde 200 con XML válido; probado con un WordPress simulado (omite ocultos y "Sin categorizar") |
| T4 título y descripción por página | **Hecho** (títulos de 65 caracteres o menos y descripciones de 70 a 165, con prueba) | en vivo, 12 rutas |
| T5 canonical | **Hecho** (sin parámetros ni barra final) | en vivo |
| T6 datos estructurados | **Hecho**: organización (sin dirección), sitio web, servicio, preguntas frecuentes, producto (precio CLP y disponibilidad) y migas | en vivo; falta validarlos en la herramienta de resultados enriquecidos de Google **cuando el sitio esté abierto** |
| T7 vista previa al compartir | **Hecho** (Open Graph y Twitter por página; imagen del producto) | en vivo |
| T8 `noindex` en carrito, pago y 404 | **Hecho** (también búsquedas internas) | en vivo; la etiqueta global se restaura al salir |
| T9 contenido sin JavaScript | **Parcial**: `<noscript>` con descripción y enlaces. **No se hizo pre-render**: Google ejecuta JavaScript; se revisa con Search Console tras abrir | — |
| T10 velocidad | **Parcial**: escritorio **96**; el JavaScript inicial bajó de 340 a 241 KB; el logo de 242 a 34 KB; caché de imágenes de 30 días. **Móvil:** Lighthouse da error `NO_LCP` y marca un desplazamiento causado por las categorías vacías: **volver a medir con productos y categorías reales** | PageSpeed Insights (Chrome) |
| T11 texto alternativo de imágenes | **Pendiente** de revisar una por una cuando estén las fotos reales | — |
| T12 URL propia por categoría | **Hecho** (`/categoria/<slug>`; `?categoria=` sigue funcionando) | en vivo (sin categorías todavía) |
| T13 un solo dominio | **Hecho**: `www.refrizer.cl` → `refrizer.cl` (301) y `http` → `https`, conservando ruta y parámetros | en vivo |
| T14 sin contenido duplicado | **Hecho**: `/wp/` redirige a la portada | en vivo (9 rutas) |
| C2 5 páginas de servicio, C2b cobertura, C3 despacho y retiro | **Hecho**, **a falta de que la clienta apruebe los textos** y confirme la lista de comunas | en vivo |
| C1, C4 a C6, L1 a L5, M1 y M2 | **Pendientes** (necesitan datos o acciones de la clienta, o que el sitio esté abierto) | ver [guia-clienta-seo.md](guia-clienta-seo.md) |

Accesibilidad 96 y prácticas recomendadas 100 (PageSpeed, móvil). El único fallo de SEO que informa Google es "se ha bloqueado la indexación", esperado mientras el sitio está en demo. Pendiente menor de accesibilidad: el contraste del botón naranja con texto blanco.

## Cómo abrir a Google (el día de abrir; lo hace C, con copia previa)

**Antes** (condiciones, no se abre sin ellas):
1. Productos reales cargados y los 2 de prueba borrados, junto con los pedidos de prueba (R5).
2. Teléfono, horario y datos de contacto definitivos; la clienta aprobó los textos de servicios, cobertura y despacho, y confirmó las comunas.
3. Prueba con tarjeta de crédito de la clienta hecha.

**Pasos:**
1. `SITE_INDEXABLE=1 npm run build:hosting` (genera `index.html` **sin** la etiqueta `noindex` y un `robots.txt` abierto con la línea `Sitemap:`).
2. Subir con la rutina de la skill `frontend-y-despliegue` (zip a `tienda-cron`, extraer en una carpeta de preparación, copiar los archivos nuevos con tamaño verificado). `index.html` y `robots.txt` **al final**, con copia previa.
3. Comprobar en vivo: `index.html` sin `noindex`; `https://refrizer.cl/robots.txt` con `Allow: /` y `Sitemap:`; `/sitemap.xml` con 200; el carrito y el checkout con `noindex` (lo pone la propia página).
4. La clienta (o M) hace **Search Console** y la ficha de **Google Business Profile** ([guia-clienta-seo.md](guia-clienta-seo.md)). En Search Console: enviar `https://refrizer.cl/sitemap.xml` y pedir la indexación de la portada, `/servicios`, `/cobertura` y `/despacho-y-retiro`.
5. Validar los datos estructurados con la herramienta de resultados enriquecidos de Google (portada, un servicio y un producto).
6. Línea base (M1) y revisión a las 2 y 4 semanas (M2).

**Volver a bloquear** (si hiciera falta): `npm run build:hosting` sin la variable y repetir el paso 2.
