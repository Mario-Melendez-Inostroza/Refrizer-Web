# Plantillas de instrucciones — Refrizer

Plantillas para pedir tareas a la IA con contexto suficiente. Siempre empezar con: "Lee AGENTS.md y docs/ia/ antes de empezar".

## Nueva sección o componente
> Lee AGENTS.md y docs/ia/. Necesito una sección de [nombre] en [página]. Contenido: [textos entregados por el cliente]. Debe ser responsive y respetar el estilo actual. Propón un plan corto antes de escribir código y verifica con npm run build.

## Cambio de contenido
> Lee docs/ia/REGLAS.md. Actualiza [texto/precio/dato] en [archivo o sección] con este valor: [valor]. No cambies nada más.

## Error o comportamiento raro
> Lee AGENTS.md. Pasa esto: [descripción y pasos]. Diagnostica la causa leyendo el código antes de cambiarlo y explica el arreglo mínimo.

## Revisión de accesibilidad y rendimiento
> Revisa [página] según docs/ia/REGLAS.md: contraste, texto alternativo, foco y teclado, tamaño de imágenes. Lista los hallazgos por prioridad y corrige solo los acordados.

## Preparar publicación
> Verifica npm run build, que no haya secretos ni datos reales y que ROADMAP.md refleje el estado. Resume los cambios para revisarlos antes de desplegar.
