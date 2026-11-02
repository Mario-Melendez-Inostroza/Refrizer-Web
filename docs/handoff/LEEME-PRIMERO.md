# Traspaso: cómo abrir el proyecto de la clienta real

Para que una sesión **nueva** de Claude Code entienda todo desde el primer mensaje. Una sesión nueva **no recuerda** esta conversación ni la memoria de este proyecto: lo que sabe lo lee de los archivos. Por eso todo está escrito.

## Qué se lleva al proyecto nuevo

| Archivo (en la copia) | Para qué sirve |
|---|---|
| `CLAUDE.md` | El briefing que Claude Code **lee solo** al abrir la carpeta: qué es el sistema, cómo trabajas tú, reglas duras, cómo verificar con Chrome, qué no se probó |
| `docs/playbook-tienda-real.md` | La receta: orden de montaje, pruebas mínimas, paso a producción, correos, seguridad, errores ya cometidos |
| `docs/ROADMAP.md` | El roadmap **vacío** de la tienda nueva (se va marcando) |
| `docs/DATOS-CLIENTA.md` | Formulario de datos de la clienta, sin credenciales |
| `wordpress/` | El plugin de conciliación, el cron, la plantilla de `config.php` y sus pruebas |
| `src/`, `public/`, `package.json`… | La tienda React |
| `docs/nueva-tienda.md`, `docs/variables-entorno.md` | Guías largas de apoyo |
| `docs/archivo-staging/` | La historia del staging (roadmap con fechas, informe de la Fase 0). Solo consulta |
| `docs/handoff/PRIMER-MENSAJE.md` | El mensaje para pegar en la primera sesión |

**No se lleva:** `.env*`, `node_modules`, `dist`, `.git` ni nada que no esté commiteado. Los secretos del staging nunca estuvieron en el repo.

## Pasos (10 minutos)

1. **Comprueba que todo esté commiteado** en este proyecto (`git status` vacío). Hoy lo está.
2. **Crea la copia.** En PowerShell, desde la carpeta de este proyecto:
   ```
   powershell -ExecutionPolicy Bypass -File docs\handoff\crear-proyecto-nuevo.ps1 -Destino "C:\Users\black\Desktop\Proyectos\tienda-NOMBRE-CLIENTA"
   ```
   El script copia solo lo commiteado, archiva la historia del staging, instala el briefing y el roadmap nuevos, y hace el primer commit. La carpeta destino debe estar vacía o no existir.
3. **Abre esa carpeta** en una pestaña nueva de Claude Code (VS Code: *Archivo > Abrir carpeta*).
4. En esa carpeta, ejecuta `npm install` (la copia no trae `node_modules`).
5. **Completa `docs/DATOS-CLIENTA.md`** con lo que la clienta te vaya entregando. Nunca pongas contraseñas ni tokens ahí.
6. **Pega el mensaje de `docs/handoff/PRIMER-MENSAJE.md`** (completando los corchetes). Claude leerá `CLAUDE.md` y el playbook, te resumirá dónde están y te dirá qué necesita.

## Lo que tienes que saber antes de empezar con la clienta

- **Primero lo que depende de ella** (sección 1 del roadmap): hosting y dominio a su nombre, cuenta de Mercado Pago verificada, productos, textos legales y un buzón de correo. Es lo que más demora.
- **El modelo:** Sonnet 5.5 en esfuerzo medio alcanza casi siempre. El briefing le pide a Claude que **te avise** antes de que cambies a Opus 5.5 (en la primera conciliación real y en el paso a producción).
- **Las pestañas:** Claude solo ve las de su propio grupo de Chrome. Cuando necesite WooCommerce o cPanel, te pedirá que las arrastres al grupo. En WordPress entras tú (con 2FA); él no inicia sesión.
- **Lo que Claude no hará aunque se lo pidas:** crear cuentas o contraseñas, cambios de DNS o de seguridad del servidor, borrar archivos o usuarios, restaurar respaldos. Te dará el paso a paso.

## Si prefieres copiar a mano

Copia la carpeta del proyecto **sin** `.git`, `node_modules`, `dist` ni archivos `.env*`. Luego, en la copia: mueve `docs/ROADMAP.md`, `docs/fase0-informe.md` y `docs/reporte-noche.md` a `docs/archivo-staging/`; copia `docs/handoff/CLAUDE-tienda-nueva.md` como `CLAUDE.md`, `ROADMAP-tienda-nueva.md` como `docs/ROADMAP.md` y `DATOS-CLIENTA.md` a `docs/`.

## Mantener esto al día

Si aprendes algo nuevo en la tienda real que cambie la receta, se actualiza `docs/playbook-tienda-real.md` de ese proyecto (tarea E3 del roadmap). Para que lo aprendido vuelva a la plantilla, se copia el playbook de vuelta a este proyecto.
