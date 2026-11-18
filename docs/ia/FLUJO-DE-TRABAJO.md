# Flujo de trabajo con IA — Refrizer

La IA no recuerda conversaciones anteriores: lo que está escrito en AGENTS.md y docs/ia/ es lo que lee al empezar cada tarea.

## Ciclo de cada tarea
1. Especificar: qué se necesita y cómo se verá terminado.
2. La IA propone un plan corto; una persona lo aprueba.
3. Implementar en pasos pequeños.
4. Verificar ejecutando: npm run build y revisión visual en móvil y escritorio.
5. Una persona revisa el cambio.
6. Vista previa en Vercel y luego producción.
7. Documentar: actualizar ROADMAP.md y DECISIONES.md si corresponde.

## Quién hace qué
- La IA (Claude Code): propone estructura, escribe y refactoriza código, diagnostica errores y ejecuta las verificaciones.
- La persona (Mario): define los requisitos junto al cliente, prepara el prototipo y los prompts, aprueba planes, revisa cada cambio, prueba en el navegador, despliega en Vercel y gestiona el dominio.

## Cómo se controlan los errores de la IA
- Nada se da por bueno sin ejecutarlo.
- Los cambios son pequeños y revisables.
- Se compara el resultado con el sitio en vivo y con el contexto del cliente.
- Antes de publicar se revisa que no haya secretos ni datos reales.
