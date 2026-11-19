# Refrizer — Tienda web

![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

> Tienda web de refrigeración y electricidad con catálogo, carrito y checkout.

**Sitio en vivo:** [refrizer-web.vercel.app/](https://refrizer-web.vercel.app/)

## Sobre el proyecto

Tienda web para un negocio de refrigeración y electricidad. La interfaz está completa (catálogo, detalle, carrito y checkout) y por ahora usa datos de ejemplo en `src/mocks/`; la lógica de acceso a datos está aislada en `src/services/`, de modo que se puede reemplazar por una API real sin tocar las páginas.

## Funcionalidades

- Inicio, Productos, Detalle de producto, Carrito y Checkout
- Página de retorno de pago (`PaymentReturn`)
- Servicios, Nosotros, Contacto y página 404
- Botón de WhatsApp y enlaces a redes sociales
- Datos de ejemplo desacoplados mediante una capa de servicios
- Diseño responsive

## Stack

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19, TypeScript, lucide-react |
| Enrutamiento | React Router |
| Estilos | Tailwind CSS v4 |
| Build | Vite |
| Hosting | Vercel (con rewrite SPA en `vercel.json`) |

## Estructura del proyecto

```text
src/
├── assets/       imágenes
├── components/   Layout, Header, Footer, ProductCard, WhatsAppButton...
├── config/       configuración del sitio (site.ts)
├── lib/          utilidades
├── mocks/        datos de ejemplo
├── pages/        Home, Products, ProductDetail, Cart, Checkout, PaymentReturn...
├── services/     acceso a datos (productos y categorías)
└── types/        tipos de TypeScript
docs/ia/          contexto y reglas para trabajar con IA
vercel.json       build, instalación y rewrite SPA
```

## Cómo ejecutarlo

Requisitos: Node.js 22 y npm.

```bash
npm install
npm run dev       # http://localhost:8443 (puerto configurable con PORT)
npm run build     # genera dist/
npm run preview   # sirve dist/ en http://localhost:8443
```

## Despliegue

El sitio se despliega en **Vercel**. `vercel.json` define el comando de build, `npm ci` como instalación y el rewrite de SPA: toda ruta que no sea un archivo estático ni `/api/*` sirve `index.html`, por lo que `/productos`, `/carrito` o `/checkout` funcionan al recargar.

## Documentación para trabajo con IA

El repositorio incluye el contexto que necesita un asistente de programación (o un nuevo desarrollador) para trabajar con criterio:

- [`AGENTS.md`](AGENTS.md): reglas y comandos para agentes de IA
- [`docs/ia/CONTEXTO.md`](docs/ia/CONTEXTO.md): objetivo, público y alcance del sitio
- [`docs/ia/REGLAS.md`](docs/ia/REGLAS.md): convenciones de código y de contenido
- [`docs/ia/DECISIONES.md`](docs/ia/DECISIONES.md): decisiones técnicas y su motivo
- [`docs/ia/ROADMAP.md`](docs/ia/ROADMAP.md): próximos pasos
- [`docs/ia/FLUJO-DE-TRABAJO.md`](docs/ia/FLUJO-DE-TRABAJO.md) y [`docs/ia/PROMPTS.md`](docs/ia/PROMPTS.md): flujo de trabajo con IA y plantillas de instrucciones

## Autor

**Mario Meléndez** — Estudiante de Ingeniería en Informática (Duoc UC) · Desarrollo web para pymes con **MM Digital Solutions**.
[Perfil de GitHub](https://github.com/Mario-Melendez-Inostroza)
