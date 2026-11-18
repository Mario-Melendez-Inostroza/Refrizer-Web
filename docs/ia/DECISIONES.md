# Decisiones — Refrizer

Registro corto de decisiones de diseño y su motivo.

## 1. React + TypeScript + Vite
Aplicación de una sola página, rápida de construir y de desplegar. TypeScript evita errores al cambiar contenido y componentes.

## 2. Tailwind CSS
Estilos por utilidades: consistentes, sin hojas de estilo que crezcan sin control y fáciles de ajustar tanto por la IA como por personas.

## 3. Prototipo en Figma Make, luego código propio
El prototipo visual se genera rápido; después el código se limpia, se organiza y se personaliza en este repositorio. El repositorio es la fuente de verdad, no Figma Make.

## 4. Despliegue en Vercel
Despliegue automático desde Git y vistas previas por cambio. Sin servidores que mantener.

## 5. Solo frontend
No hay backend propio. Menos piezas, menos costo de mantención y menos superficie de seguridad.

## 6. Datos simulados detrás de una capa de servicios
Las páginas leen desde src/services; hoy esos servicios usan src/mocks, y más adelante se pueden conectar a datos reales sin reescribir las páginas.
## Cómo agregar una decisión
Anotar el problema, la opción elegida y por qué, en pocas líneas. Si se revierte una decisión, no se borra: se marca como reemplazada.
