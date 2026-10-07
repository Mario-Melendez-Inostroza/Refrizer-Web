# Refrizer Web

Tienda web de Refrizer (refrigeración y electricidad). React 19 + Vite + Tailwind CSS v4 + React Router.
Por ahora usa datos de ejemplo (`src/mocks/`); la lógica de datos está en `src/services/` y la configuración del sitio en `src/config/site.ts`.

## Correr en local

Requiere Node 22.

```bash
npm install
npm run dev        # http://localhost:8443  (puerto configurable con PORT)
```

## Build y vista previa

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:8443
```

## Desplegar en Vercel

1. En Vercel: **Add New → Project** e importa este repositorio de GitHub.
2. **Framework Preset:** Vite.
3. **Build Command:** `npm run build` · **Output Directory:** `dist` (ya definidos en `vercel.json`, junto con `npm ci` como install command).
4. **Deploy.**

`vercel.json` ya incluye el rewrite de SPA: toda ruta que no sea un archivo estático ni `/api/*` sirve `index.html`, así que `/productos`, `/carrito`, `/checkout`, etc. funcionan al recargar o entrar directo. Las rutas `/api/*` quedan libres para funciones serverless.

Variable opcional: `SITE_URL` (p. ej. `https://www.refrizer.cl`) para que las URLs de Open Graph apunten al dominio definitivo. Si no se define, se usa el dominio de producción que entrega Vercel.

## Modo demo: no indexar en Google

Mientras el sitio sea una demo está bloqueado para buscadores en **tres** lugares:

| Dónde | Qué quitar al publicar el dominio definitivo |
| --- | --- |
| `index.html` | `<meta name="robots" content="noindex, nofollow">` |
| `vercel.json` | el header `X-Robots-Tag: noindex, nofollow` (bloque `"source": "/(.*)"`) |
| `public/robots.txt` | `Disallow: /` (dejar `Allow: /` o el archivo vacío) |

## Imágenes

Los originales pesados están en `originals/` (fuera de `src`, no se despliegan). El fondo del hero se sirve como `src/assets/fondo_clima.webp`. Para regenerar una imagen:

```bash
python -c "from PIL import Image; Image.open('originals/fondo_clima.png').convert('RGB').save('src/assets/fondo_clima.webp','WEBP',quality=85,method=6)"
```

El favicon y la imagen para compartir (`public/`) se derivan de `src/assets/logo.jpg` y del fondo del hero; el logo original no se modifica.
