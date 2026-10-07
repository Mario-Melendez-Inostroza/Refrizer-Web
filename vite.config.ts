import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Completa %SITE_URL% en index.html (Open Graph pide URLs absolutas).
 * Usa SITE_URL si existe, o el dominio de producción que Vercel entrega al compilar.
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
export default defineConfig({
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
  },
  preview: {
    host: process.env.DEV_SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
})
