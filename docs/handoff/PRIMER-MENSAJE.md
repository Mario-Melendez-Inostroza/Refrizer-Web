# Primer mensaje para la sesión nueva

Pega esto en Claude Code **dentro de la carpeta del proyecto nuevo**, después de completar lo que está entre `[corchetes]`. No pegues credenciales ni tokens.

---

Estoy montando la **tienda real de una clienta** con esta plantilla. Lee `CLAUDE.md` (se carga solo), `docs/playbook-tienda-real.md`, `docs/ROADMAP.md` y `docs/DATOS-CLIENTA.md`. Todo lo aprendido en el staging está ahí; no lo redescubras.

**Datos de hoy:** clienta [nombre], dominio [dominio], hosting [proveedor]. Estamos en [la fase: pidiendo datos a la clienta / montando el servidor / probando con credenciales de prueba / pasando a producción].

**Lo que quiero que hagas ahora:**
1. Resúmeme en pocas líneas dónde estamos según el roadmap.
2. Dime qué necesitas de mí para el siguiente paso y qué puedes hacer tú solo.
3. Para lo que solo yo puedo hacer, dame el paso a paso exacto.
4. Avísame antes de que yo tenga que cambiar de modelo o de esfuerzo.

Trabaja una página a la vez en el navegador, con copia antes de editar cualquier archivo del servidor, y no marques nada como hecho sin evidencia. [Si ya hay pestañas abiertas: las arrastraré al grupo de Claude cuando lo pidas.]

---

**Variantes útiles del mensaje:**
- *Cuando ya hay accesos:* "Ya tengo el hosting y WordPress instalados en [dominio]. Empecemos por la sección 2 del roadmap."
- *Para retomar otro día:* "Retomamos. Lee `docs/ROADMAP.md`, dime qué quedó pendiente y verifica desde fuera lo que ya hicimos."
- *Antes de producción:* "Vamos al paso a producción (sección 5). Dime qué verificar antes de que yo ponga el token real, y avísame cuándo cambiar a Opus."
