# Playbook: montar la tienda real de una clienta

> **Nota (copia para una tienda nueva):** en este proyecto `ROADMAP.md` es el de la tienda NUEVA. El estado y las fechas del staging están en `archivo/archivo-staging/ROADMAP-staging.md`; los datos de la clienta, en `DATOS-CLIENTA.md`.

Solo lo que **se probó y funcionó**: en el staging de BenzaHosting (2026-10-28 y 29) y en la **primera tienda real, Refrizer** (2026-11-02 al 04; lo marcado *(Refrizer)* viene de ahí). El estado vivo y los pendientes están en [ROADMAP.md](ROADMAP.md); la guía larga original (obsoleta en parte), en [archivo/nueva-tienda.md](archivo/nueva-tienda.md).

**Quién:** **C** = Claude Code (repositorio y verificaciones de solo lectura en Chrome) · **M** = Mario (cPanel, WordPress, cuentas) · **Cliente** = la clienta.
**Lo que Claude no hace aunque se lo pidan:** crear cuentas o contraseñas, cambios de DNS y de seguridad del servidor, borrar archivos o usuarios, restaurar respaldos. Esos pasos son de M.

## Cómo usar esto (ahorra tokens)

Este archivo es el **índice**. El detalle vive en *skills* del proyecto (`.claude/skills/`) que se cargan solo cuando hacen falta. **No leas todo: abre la skill de la fase en la que estás.**

| Fase | Skill | Quién |
|---|---|---|
| Qué pedir a la clienta (aquí abajo, §1) | — | Cliente + M |
| Servidor: WordPress, `config.php`, cron, seguridad | `servidor-woocommerce` | M (C verifica) |
| Vincular Mercado Pago y pasar a producción | `vincular-mercadopago` | M (Opus para el paso a producción) |
| Frontend y despliegue, reemplazar archivos | `frontend-y-despliegue` | C + M |
| Pruebas de pago y pedidos rechazados | `pruebas-de-pago` | M + C |
| Correos | `correos-tienda` | M |
| Chrome, cPanel y WordPress desde Claude | `cpanel-y-chrome` | C |
| Errores que ya pasaron | §2 (aquí abajo) | todos |

Orden de montaje: §1 clienta → `servidor-woocommerce` → `vincular-mercadopago` (con credenciales de prueba) → `frontend-y-despliegue` → `correos-tienda` → `pruebas-de-pago` → paso a producción (`vincular-mercadopago`) → entrega (ROADMAP §6).

## 1. Lo que depende de la clienta (se pide el primer día, es lo que más demora)

- [ ] Hosting y dominio a nombre de ella; cuenta **vendedora** de Mercado Pago verificada (de ahí sale el Access Token de producción).
- [ ] Comisión de Mercado Pago explicada y confirmada en su Simulador de comisiones.
- [ ] Productos (10 a 25: fotos, descripción, precio con IVA, stock) y datos de contacto reales (teléfono, WhatsApp, correo, dirección). *(Refrizer)* Las **redes sociales que la clienta no tenga se quitan** del sitio (iconos y enlaces) en vez de dejar enlaces falsos.
- [ ] **Textos legales** (Términos y condiciones, Cambios y devoluciones): **los entrega la clienta** (o su abogado). **No se redactan en el proyecto ni se publican textos base** (en Refrizer se hizo, M pidió quitarlos y se revirtió). Si M los cobra aparte, se publican cuando ella los apruebe; mientras tanto el sitio no tiene páginas legales y hay que decírselo a la clienta.
- [ ] Un **buzón de correo de su propio dominio** para el remitente de la tienda (ver §5).
- [ ] Decidir despacho: sin despacho (`shipping.enabled=false`, lo normal) o con tarifas.

## 2. Errores que ya pasaron (no repetir)

- Usar el *Client ID* o el número de aplicación como `TC_MP_SELLER_ID`.
- Olvidar las URLs de retorno: el comprador cae en la página de WordPress.
- Subir `config.php` o el token al repositorio, al chat o a un registro.
- Actualizar el plugin de Mercado Pago justo antes de abrir: se actualiza **antes** de las pruebas, o se repiten.
- Hacer ráfagas de peticiones a un sitio con Imunify360: aparece el desafío "Espere mientras se verifica su solicitud…". Una página a la vez.
- La zona horaria de WordPress en UTC+0 (notas y correos con 3 o 4 horas de diferencia).
- *(Refrizer)* **Credenciales de dos cuentas mezcladas** al vincular (producción de una y prueba de otra): "No fue posible vincular la tienda".
- *(Refrizer)* Probar tarjetas con credenciales de prueba: siempre se rechazan; hay que pagar de verdad (monto mínimo).
- *(Refrizer)* Creer que `vendedor=match` prueba que el token es de la cuenta correcta: solo prueba que token e ID coinciden.
- *(Refrizer)* Dejar el plugin apuntando a la cuenta de pruebas de M (con `TC_DRY_RUN=false`) cuando ya hay productos reales: el dinero llega a M. Probar con productos de $10 y **volver a vincular la cuenta de la clienta antes de abrir**.
- *(Refrizer)* Poner la tienda en "Próximamente" mientras se prueba: el aviso de Mercado Pago se pierde (502) y el pedido queda pendiente; el cron lo rescata a los 5 min, pero no debe pasar.
- *(Refrizer)* Un `sed` demasiado amplio al corregir una prueba cambió otras pruebas existentes: revisar `git diff` (solo líneas añadidas) antes de dar por buena una corrección.
- *(Refrizer)* Mostrar la categoría "Sin categorizar" de WooCommerce en la portada: el frontend la filtra (`uncategorized` / `sin-categorizar`).
- *(Refrizer)* Redactar textos legales sin que la clienta los entregue: no se hace (ver §1).
- La tienda de WordPress con su tema queda pública en `/wp/` y se puede comprar ahí; decidir si se redirige (sin tocar `wp-json`, `wc-api`, `wp-admin` ni `wp-login.php`).
