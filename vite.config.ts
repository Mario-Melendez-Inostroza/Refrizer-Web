import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { organizationJsonLd, robotsTxt } from './src/lib/seo'
import { SEO_ORIGIN, organization, staticPaths } from './src/config/seo'

/**
 * Completa %SITE_URL% en index.html (Open Graph pide URLs absolutas).
 * Usa SITE_URL si existe, o el dominio de producción que Vercel entrega al compilar (demo).
 * Sin ninguna de las dos (p. ej. en local) queda vacío y la ruta es relativa.
 */
function siteUrl(mode: string): Plugin {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  // El build para el hosting real (--mode hosting) apunta al dominio de la tienda aunque no se defina SITE_URL.
  const fallback = mode === 'hosting' ? 'https://refrizer.cl' : host ? `https://${host}` : ''
  const url = (process.env.SITE_URL || fallback).replace(/\/$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replace(/%SITE_URL%/g, url),
  }
}

/**
 * SEO del build:
 * - %ROBOTS_META%: sin SITE_INDEXABLE=1 deja <meta robots noindex,nofollow> (demo); con SITE_INDEXABLE=1 no pone nada (abierto a Google).
 * - %GOOGLE_VERIFICATION%: con GOOGLE_SITE_VERIFICATION=<código> agrega <meta name="google-site-verification"> (Search Console); sin la variable, nada.
 * - %ORGANIZATION_JSONLD%: datos estructurados de la organización.
 * - Emite robots.txt (bloqueado o abierto según lo mismo) y sitemap-paginas.json (rutas fijas, que lee sitemap.php en el servidor).
 */
function seoBuild(): Plugin {
  const indexable = process.env.SITE_INDEXABLE === '1'
  const origin = (process.env.SITE_URL || SEO_ORIGIN).replace(/\/$/, '')
  // Solo letras, números, guion y guion bajo: el código de Search Console no lleva nada más.
  const code = (process.env.GOOGLE_SITE_VERIFICATION || '').trim()
  const verification = /^[A-Za-z0-9_-]{20,100}$/.test(code) ? `<meta name="google-site-verification" content="${code}" />` : ''
  const ld = JSON.stringify(organizationJsonLd({ origin, ...organization })).split(String.fromCharCode(60)).join(String.fromCharCode(92) + 'u003c') // '<' -> <
  return {
    name: 'seo-build',
    transformIndexHtml: (html) =>
      html
        .replace('%ROBOTS_META%', indexable ? '' : '<meta name="robots" content="noindex, nofollow" />')
        .replace('%GOOGLE_VERIFICATION%', verification)
        .replace('%ORGANIZATION_JSONLD%', ld),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(indexable, origin) })
      this.emitFile({ type: 'asset', fileName: 'sitemap-paginas.json', source: JSON.stringify({ origin, paginas: staticPaths() }, null, 2) })
    },
  }
}

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // WC_URL solo se lee aquí (proceso de Vite). Sin prefijo VITE_ no llega al bundle del navegador.
  // En producción React y WordPress comparten dominio (WordPress en /wp) y el navegador llama a /wp/wp-json/*.
  // En local, este proxy traduce /wp/wp-json/* hacia WC_URL/wp-json/* (el WordPress de prueba vive en la raíz).
  const wcUrl = loadEnv(mode, process.cwd(), '').WC_URL
  const wcProxy = wcUrl
    ? {
        '/wp/wp-json': {
          target: wcUrl.replace(/\/+$/, ''),
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/wp\/wp-json/, '/wp-json'),
        },
      }
    : undefined

  return {
    // `npm run build:hosting` (modo "hosting") publica en la raíz del dominio de BenzaHosting.
    base: '/',
    plugins: [react(), tailwindcss(), siteUrl(mode), seoBuild()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      proxy: wcProxy,
    },
    preview: {
      host: process.env.DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      proxy: wcProxy,
    },
  }
})
