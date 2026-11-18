# Reglas para la IA — Refrizer

## Contenido
- No inventar datos del cliente (precios, certificaciones, teléfonos, direcciones, reseñas). Si falta algo, marcarlo "por confirmar".
- Mantener el tono y la identidad visual ya definidos; no rediseñar sin que se pida.

## Imágenes
- Imágenes reales en public/images, con nombres en minúsculas, sin tildes ni espacios.
- No usar imports figma:asset ni rutas que dependan de Figma Make.
- Las imágenes que se despliegan no van a Git LFS (en proyectos anteriores no se veían en Vercel por eso).
- Formatos web (webp) y siempre con texto alternativo.

## Código
- Cambios pequeños y enfocados: un tema por commit, con mensaje claro.
- No agregar dependencias sin justificarlo. Preferir soluciones simples y convencionales.
- TypeScript sin any innecesarios. Componentes pequeños y con nombres claros.
- Diseño responsive (móvil primero) y accesibilidad básica: contraste, foco visible, navegación con teclado.

## Seguridad
- Sin secretos, claves ni tokens en el repositorio. Solo variables VITE_* públicas.
- Sin datos personales de clientes finales.

## Verificación
- Nada se da por bueno sin ejecutarlo: npm run build debe pasar.
- La IA propone y escribe; una persona revisa cada cambio, prueba en el navegador y despliega.
