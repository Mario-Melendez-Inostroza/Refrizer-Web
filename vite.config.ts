import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Completa %SITE_URL% en index.html (Open Graph pide URLs absolutas).
 * Usa SITE_URL si existe, o el dominio de producción que Vercel entrega al compilar (demo).
 * Sin ninguna de las dos (p. ej. en local) queda vacío y la ruta es relativa.
 */
function siteUrl(): Plugin {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const url = (process.env.SITE_URL || (host ? `https://${host}` : '')).replace(/\/$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replace(/%SITE_URL%/g, url),
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
    plugins: [react(), tailwindcss(), siteUrl()],
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
