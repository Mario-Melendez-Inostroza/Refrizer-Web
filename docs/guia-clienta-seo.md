# Guía para la clienta: lo que le toca hacer para aparecer en Google

Escrita para quien no es técnico. Las cuentas y los accesos son de la clienta. **Nunca compartas contraseñas ni códigos de verificación por chat.**

## 1. Ficha de Google Business Profile (lo más importante para aparecer en el mapa)

Como Refrizer **no tiene tienda física** y trabaja en todo Santiago, se crea como **negocio de área de servicio** (sin mostrar dirección).

1. Entra a `business.google.com` con la cuenta de Google que será la dueña de la ficha.
2. Haz clic en **Administrar ahora** y escribe el nombre del negocio: **Refrizer**.
3. **Categoría principal:** la que mejor describa tu servicio principal (por ejemplo, instalación o servicio de aire acondicionado). Agrega categorías adicionales para refrigeración y electricidad.
4. Cuando pregunte si quieres **agregar una ubicación que los clientes puedan visitar**, responde **No**.
5. **Áreas de servicio:** agrega las comunas de Santiago donde trabajas (todas las que atiendes).
6. **Teléfono:** el WhatsApp o teléfono del negocio, igual que en el sitio. **Sitio web:** `https://refrizer.cl`.
7. **Horario de atención** y una **descripción** del negocio (usa lo que dice el sitio en "Servicios").
8. **Verificación:** Google pedirá verificar (por video, llamada o código). Sigue las instrucciones; en negocios sin local suele ser por video.
9. **Servicios:** agrega cada servicio (instalación de aire acondicionado, mantención, reparación de refrigeradores, instalaciones eléctricas, asesoría técnica) con una descripción corta.
10. **Fotos reales** de trabajos terminados y del logo. Cuantas más, mejor.
11. Pide a cada cliente satisfecho que deje una **reseña** (en la ficha, "Pedir reseñas" entrega un enlace directo para enviar por WhatsApp). **Responde todas las reseñas.**

**Importante:** no pongas Peñaflor como dirección. Peñaflor es solo el punto de retiro de productos.

## 2. Google Search Console (para ver cómo te encuentra Google)

1. Entra a `search.google.com/search-console` con la cuenta de la clienta.
2. **Agregar propiedad → Prefijo de la URL** → `https://refrizer.cl/`.
3. Elige verificar con **etiqueta HTML**: Google te muestra una línea que empieza con `<meta name="google-site-verification" content="...">`. **Mándasela a quien administra el sitio** (no es una clave secreta); la agrega y publica, y luego haces clic en **Verificar**.
4. En el menú, **Sitemaps** → escribe `sitemap.xml` → **Enviar**.
5. En **Inspección de URL**, pega la portada, `https://refrizer.cl/servicios`, `https://refrizer.cl/cobertura` y `https://refrizer.cl/despacho-y-retiro` y haz clic en **Solicitar indexación** (cuando el sitio ya esté abierto).
6. A las 2 y 4 semanas, mira **Rendimiento** (impresiones y clics) y **Páginas** (cuáles están indexadas y si hay errores).

## 3. Datos iguales en todas partes

Usa el **mismo nombre, teléfono y comunas** en Instagram o Facebook (si los tienes), directorios (por ejemplo, Páginas Amarillas) y la ficha de Google.

## 4. Aviso de pago de Mercado Pago (por qué el pedido #29 quedó pendiente un rato)

1. Entra a `mercadopago.cl/developers` con la cuenta de la clienta.
2. **Tus integraciones** → abre la aplicación `WooCommerce-598542ca…`.
3. En el menú de la izquierda busca **Webhooks** (o **Notificaciones**).
4. Revisa que en modo **producción** haya la URL `https://refrizer.cl/wp/wc-api/WC_WooMercadoPago_Basic_Gateway/` con el evento **Pagos** marcado. Si está vacío, pégala, marca **Pagos** y guarda.
5. Manda una captura (tapando cualquier código secreto) a quien administra el sitio.

Mientras tanto no hay riesgo: si el aviso no llega, el sistema de rescate marca el pedido como pagado en 5 a 10 minutos.

## Lo que debe aportar la clienta

- Servicios que ofrece y los que no; lista de comunas de Santiago donde hace servicios.
- Teléfono, WhatsApp y horario definitivos.
- Marcas con las que trabaja, años de experiencia y certificaciones (solo lo que pueda demostrar).
- Fotos reales de trabajos y de productos.
- Textos legales (Términos, Cambios y devoluciones, Privacidad), o los datos para redactarlos.
