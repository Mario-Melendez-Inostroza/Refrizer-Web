# Plan de SEO de Refrizer

**Objetivo:** que Refrizer aparezca en Google cuando la gente busque lo que ofrece (instalación, mantención y reparación de aire acondicionado, refrigeración y electricidad; venta de productos) en Peñaflor, Santiago y regiones.

**Honestidad:** nadie puede garantizar una posición en Google. Aquí está todo lo que **sí se controla** (técnico, contenido y local). El SEO local suele tardar entre semanas y meses en dar resultados.

**Quién:** **C** = Claude (código, servidor, redacción de borradores) · **M** = Mario · **Cliente** = la clienta.
**Estado inicial (2026-11-05):** el sitio está bloqueado para Google a propósito (`noindex` y `Disallow: /`); títulos por página hechos; `/wp/` ya redirige a la portada.

## Lo que mostró Google (búsquedas "instalación aire acondicionado Peñaflor" y "reparación refrigeración y electricidad Peñaflor Talagante")

- Los primeros resultados son **anuncios y el mapa con fichas de Google Business Profile**; el SEO local depende mucho de tener esa ficha bien hecha y con reseñas.
- Los que posicionan en la web tienen **una página por servicio y comuna** ("Aire acondicionado en Peñaflor", "Reparación de refrigeradores Peñaflor"), con teléfono o WhatsApp visible.
- Las búsquedas relacionadas incluyen "Talagante", "Malloco", "El Monte" y "Maipú": esas comunas son parte de lo que hay que cubrir.

## A. Técnico (lo hago yo; sale el día de abrir)

| # | Tarea | Quién |
|---|---|---|
| T1 | **Quitar el bloqueo a Google el día de abrir**: `noindex` de `index.html`, `Disallow: /` de `robots.txt`, `robots.index` de `site.json` (ROADMAP L1) | C |
| T2 | **`robots.txt` correcto**: permitir todo salvo carrito, checkout, `/pedido/` y `/wp/`; con la línea `Sitemap:` | C |
| T3 | **`sitemap.xml` automático** (PHP que lee los productos de WooCommerce): portada, páginas, servicios, productos. Se actualiza solo al agregar productos | C |
| T4 | **Título y descripción únicos por página** (títulos ya hechos; faltan las descripciones, y para productos incluir el precio) | C |
| T5 | **Canonical** en cada página, sin parámetros de seguimiento | C |
| T6 | **Datos estructurados (JSON-LD):** negocio con área de servicio (Santiago y regiones, retiro en Peñaflor), sitio web, **producto con precio en CLP y disponibilidad**, migas de pan y preguntas frecuentes si hay reales | C |
| T7 | **Open Graph y Twitter por página** (al compartir en WhatsApp y redes se ve la foto y el nombre del producto) | C |
| T8 | **`noindex` en páginas sin valor** (carrito, checkout, retorno de pago, 404) y evitar la "404 suave" (hoy una página inexistente responde 200) | C |
| T9 | **Contenido visible sin JavaScript** (`<noscript>` con descripción y enlaces) y evaluar **pre-renderizar** las páginas principales para que Google las lea de inmediato | C |
| T10 | **Velocidad (Core Web Vitals)**: medir con PageSpeed Insights en móvil; cargar rutas por separado, precargar la imagen principal, revisar tamaños de imagen | C |
| T11 | **Imágenes**: texto alternativo descriptivo y dimensiones (ya tienen `webp`, `width` y `height`); revisar una por una | C |
| T12 | **Enlaces internos reales** y **URL propia por categoría** (`/categoria/...`) para que cada categoría sea indexable | C |
| T13 | **Un solo dominio**: `www` → sin `www` y `http` → `https` con redirección 301; comprobar con `curl` | C+M |
| T14 | **Evitar contenido duplicado**: `/wp/` ya redirige a la portada (hecho 2026-11-05); `Disallow: /wp/` en `robots.txt` | C |

## B. Contenido (yo redacto los borradores; la clienta los aprueba y aporta los datos reales)

| # | Tarea | Quién |
|---|---|---|
| C1 | **Palabras clave**: servicio × comuna (Peñaflor, Talagante, Malloco, Isla de Maipo, El Monte, Padre Hurtado, Maipú, Santiago), validadas con Google y, después, con Search Console | C |
| C2 | **Una página por servicio** (instalación de aire acondicionado, mantención y limpieza de equipos, reparación de refrigeradores, instalaciones eléctricas, revisión y asesoría técnica): texto único, preguntas frecuentes reales, botón de WhatsApp. **Sin inventar datos**: experiencia, marcas, garantías y certificaciones solo si la clienta los confirma | C+Cliente |
| C3 | **Página "Despacho y retiro"**: despacho a Santiago y regiones, retiro en Peñaflor, cómo se coordina | C |
| C4 | **Categorías con texto introductorio** y **fichas de producto con descripción propia** (no copiar la del fabricante), marca, atributos y garantía | Cliente (+C) |
| C5 | **Guías cortas** (opcional, 1 al mes): "¿Cada cuánto se mantiene un aire acondicionado?", "¿Por qué mi refrigerador hace escarcha?" | C |
| C6 | **Textos legales** (Términos, Cambios y devoluciones, Privacidad): los entrega la clienta; mejoran la confianza y son requisito de pasarelas | Cliente |

## C. Local (lo hace la clienta; yo la guío paso a paso)

| # | Tarea | Quién |
|---|---|---|
| L1 | **Google Business Profile** como negocio de **área de servicio** (sin mostrar dirección, ya que no hay tienda física): categorías, comunas que atiende, horario, servicios, fotos reales, enlace al sitio y WhatsApp. Es lo que más pesa para "cerca de mí" | Cliente |
| L2 | **Google Search Console**: verificar el dominio, enviar el sitemap y revisar cobertura y errores. Requiere una cuenta de Google de la clienta o de M | M+Cliente |
| L3 | **Reseñas en Google**: pedírselas a cada cliente satisfecho (enlace directo) y responderlas | Cliente |
| L4 | **Datos iguales en todas partes** (nombre, teléfono, comunas): Instagram o Facebook si los tienen, Páginas Amarillas y directorios | Cliente |
| L5 | **Analítica** (GA4 u otra): compras y clics en WhatsApp | C+M |

## D. Medición

| # | Tarea | Quién |
|---|---|---|
| M1 | **Línea base** el día de abrir: páginas indexadas, velocidad móvil, errores | C |
| M2 | **Revisión a las 2 y a las 4 semanas** con Search Console: indexación, impresiones, consultas y problemas | C+M |

## Lo que necesito de la clienta para empezar con el contenido

- Los **servicios reales** que ofrece y los que no; comunas y regiones a las que despacha o atiende.
- **Teléfono, WhatsApp y horario de atención** definitivos.
- **Marcas** con las que trabaja, **años de experiencia** y **certificaciones** (solo lo que pueda demostrar).
- **Fotos reales** de trabajos y de los productos.
- **Datos para los textos legales**, o los textos ya redactados.
- Una **cuenta de Google** para la ficha de negocio y Search Console.
