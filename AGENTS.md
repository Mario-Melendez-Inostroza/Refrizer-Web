# Refrizer Web

Tienda web de Refrizer (refrigeración y electricidad). React + Vite + Tailwind CSS v4 + React Router.

## Desarrollo

- `npm run dev` levanta Vite en el puerto `PORT` (por defecto 8443).
- `npm run build` genera `dist/`; `npm run preview` sirve el build.

## Estructura

- `src/main.tsx` - Punto de entrada; importa `src/index.css` y monta `src/App.tsx` en `#root`
- `src/App.tsx` - Rutas de la aplicación
- `src/index.css` - CSS global, tema de Tailwind v4 y componentes de marca (logo, contenedor)
- `src/config/site.ts` - Datos del sitio (textos, contacto, banderas)
- `src/services/` - Acceso a datos (hoy mocks en `src/mocks/`)
- `vite.config.ts` - Configuración de Vite (React, Tailwind y alias `@` → `src`)

## Estilos

Tailwind CSS v4 mediante `@tailwindcss/vite`. `src/index.css` importa Tailwind con `@import 'tailwindcss';`. Usa clases utilitarias en JSX; el tema y el CSS global van en `src/index.css`. No hay config de Tailwind ni de PostCSS.

## Calidad de código

- Usa comillas dobles para strings con apóstrofes, o escápalos en strings con comillas simples.
- Cierra las etiquetas JSX y balancea las llaves.
- Exporta los componentes como default.
