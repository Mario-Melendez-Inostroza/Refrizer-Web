# Traspaso: cómo abrir el proyecto de la clienta real

Para que una sesión **nueva** de Claude Code entienda todo desde el primer mensaje. Una sesión nueva **no recuerda** esta conversación ni la memoria de este proyecto: lo que sabe lo lee de los archivos. Por eso todo está escrito.

## Qué se lleva al proyecto nuevo

| Archivo (en la copia) | Para qué sirve |
|---|---|
| `CLAUDE.md` | (corto) El briefing que Claude Code **lee solo** al abrir la carpeta: qué es el sistema, cómo trabajas tú, reglas duras, cómo verificar con Chrome, qué no se probó |
| `docs/playbook-tienda-real.md` + `.claude/skills/` | El **índice** de la receta y las **skills** por fase (servidor, vincular Mercado Pago, frontend y despliegue, pruebas de pago, correos, Chrome/cPanel con snippets). Se cargan solo cuando hacen falta, para gastar menos tokens |
| `docs/ROADMAP.md` | El roadmap **vacío** de la tienda nueva (se va marcando) |
| `docs/DATOS-CLIENTA.md` | Formulario de datos de la clienta, sin credenciales |
| `wordpress/` | El plugin de conciliación, el cron, la plantilla de `config.php` y sus pruebas (`wordpress/tests/correr-pruebas-sin-php.mjs` las corre sin tener PHP instalado) |
| `src/`, `public/`, `package.json`… | La tienda React |
| `docs/variables-entorno.md` | Significado de cada constante de `config.php` |
| `docs/archivo/` | Solo consulta, no se lee por defecto: guía larga antigua (`nueva-tienda.md`), historia del staging y código de referencia del motor |
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

**Qué se lleva de vuelta a la plantilla tras cada tienda** (la de Refrizer, 2026-11-04, ya está volcada en estos archivos): `CLAUDE.md` (sección "Lo aprendido en la primera tienda real"), `docs/playbook-tienda-real.md`, `docs/nueva-tienda.md` (aviso de cambios), y los cambios de `wordpress/` y `src/` que no sean de la marca (p. ej. el texto de rechazo en `src/pages/PaymentReturn.tsx` y `src/lib/return.ts`, y la nota de rechazo del plugin). Lo específico de la clienta (`src/config/site.ts`, imágenes, `docs/ROADMAP.md`, `docs/DATOS-CLIENTA.md`) **no** se lleva.
