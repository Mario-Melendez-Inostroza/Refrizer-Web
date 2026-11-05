---
name: pruebas-de-pago
description: "Pruebas de compra antes de abrir la tienda: compra completa, aviso perdido, conciliación, pagos con tarjeta aprobados y rechazados en producción con $10, qué ve el cliente en un pedido rechazado y qué sigue sin probarse. Úsalo al probar pagos o al diagnosticar un pedido pendiente o rechazado."
---

# Pruebas de pago

## 4. Pruebas mínimas antes de abrir (las que pasaron en el staging)

1. **Compra completa en la tienda React** con la cuenta compradora de prueba: vuelve a `/pedido/retorno`, pasa de "pendiente" a "Pagado" (~1 min) y WooCommerce queda en "Procesando" con stock -1.
2. **Aviso perdido** (el caso que justifica el plugin): bloquear a propósito el aviso con una regla en `wp/.htaccess` que devuelva 403 a `wc-api/WC_WooMercadoPago_Basic_Gateway` (las dos formas: ruta y `?wc-api=`), con copia del archivo antes. Pagar un pedido → sigue "Pendiente" → barrido: `pending / too_recent` y a los 5 min `would_mark_paid`.
3. **Escritura real:** `TC_DRY_RUN` en `false` → `marked_paid`: "Procesando", stock una sola vez, un correo al cliente y uno a la tienda, nota de conciliación. Las pasadas siguientes no repiten nada.
4. **Pago sobre pedido cancelado:** pagar con el aviso bloqueado y cancelar a mano en menos de 5 min → `approved_payment_on_cancelled`, no se reactiva, un solo correo de revisión al administrador.
5. **Quitar el bloqueo** (restaurar el `.htaccess` desde la copia) y verificar que el aviso vuelve a dar 400 a un GET, no 403.
6. Ruta REST: clave o correo erróneos y pedido inexistente dan la misma respuesta (`not_found`); repetir antes de 60 s da `try_later`.
7. **Correos a la bandeja de entrada**, no a spam: ver §5.

## 4d. Pruebas reales con tarjeta en producción *(Refrizer, 2026-11-03: funcionó)*

Se hicieron con **la cuenta de M como vendedora temporal** (credenciales de su aplicación) y su propia tarjeta; después se vuelve a vincular la cuenta de la clienta (4b + `config.php`) y se repite **una** compra mínima en la suya. Productos de prueba a **$10** (Mercado Pago **sí acepta cobros de $10**).

- **Cómo pagar sin que cuente como "pagarse a uno mismo":** ventana de **incógnito**, **sin iniciar sesión en Mercado Pago** (pagar como invitado con la tarjeta) y, en el checkout de la tienda, un **correo distinto** al de la cuenta de Mercado Pago.
- **Antes de pagar:** `config.php` con el Access Token de producción y el `TC_MP_SELLER_ID` del vendedor vinculado, **`TC_DRY_RUN=true`** y el barrido en `dry_run=si vendedor=match`. Ojo: `vendedor=match` solo dice que el token y el ID **coinciden entre sí**, no de qué cuenta son; eso lo confirma el pago apareciendo en el panel de esa cuenta.
- **Resultados observados:**
  - **Aprobado, débito (#23) y crédito (#26):** el aviso (IPN) llegó solo; pedido en **Procesando**, notas "Mercado Pago: Pago aprobado" y "Pago completado", stock -1, correos "Nuevo pedido" y "Procesando tu pedido", y `/pedido/retorno` con "¡Pago recibido!".
  - **Rechazado (#25):** el pedido queda **Pendiente de pago**, con el stock reservado 60 min y, si nadie reintenta, WooCommerce lo cancela solo.
  - El cron los distingue: pedido rechazado = `pending / no_approved_payment`; pedido que nunca llegó a pagar = `pending / no_payments_found`.
- **La devolución no se probó** (M decidió no devolver los $10). Anotarlo como no probado; si hace falta, desde el panel de Mercado Pago (Actividad > pago > Devolver dinero).
- **`/pedido/retorno` en un rechazo** *(error encontrado y corregido)*: la URL trae `status=rejected`, pero el pedido sigue "pendiente" en WooCommerce, así que la pantalla decía "Pago pendiente de confirmación". Ahora `src/lib/return.ts` (`returnedRejected`) elige el texto "Tu pago fue rechazado" con icono rojo y "Reintentar pago". **El query solo elige el texto; el estado real sale del servidor** (el comprador controla el query). En una tienda nueva, probar el rechazo y mirar qué dice la pantalla.
- **Cómo ve el cliente un pedido rechazado o pendiente** (es lo primero que preguntará): el plugin `tienda-conciliacion` deja, **solo con `TC_DRY_RUN=false`**, una **nota privada** "Mercado Pago: pago N rechazado (motivo). El pedido sigue pendiente de pago; el comprador puede reintentar." (motivos en español para los códigos `cc_rejected_*`; una nota por pago, sin repetir). Y para un pedido que nunca llegó a pagar (como cerrar la ventana de Mercado Pago), una sola nota "no se registró ningún intento de pago" a los 15 min. Guía para el cliente: **Procesando** = pagado, se despacha; **Pendiente con nota de rechazo** = el banco rechazó, puede reintentar o se cancela solo; **Pendiente con la nota "no se registró ningún intento de pago"** (la deja el cron a los 15 min) = el comprador llegó a pagar y cerró la ventana, o nunca abrió Mercado Pago; si no paga, se cancela solo. Las notas están en el pedido, columna derecha. **Solo se despacha lo que está en Procesando.** Sin la nota, WooCommerce no deja ninguna señal del rechazo: el motivo exacto solo estaría en Mercado Pago > Actividad.

## 7. Lo que sigue sin probar

**Ya probado en producción (Refrizer, 2026-11-03):** pago con tarjeta de **crédito y débito** aprobado, pago **rechazado**, y qué muestra `/pedido/retorno` en esos casos. **Sigue sin probarse:** la **devolución**, el pago **pendiente o en proceso** (efectivo u otros medios) y que la nota de rechazo **no se repita** en el servidor (solo con pruebas unitarias).

IPN tardío tras conciliar, pedido reembolsado, monto distinto, `seller_mismatch`, dos crons a la vez, y que la caché del hosting respete `no-store` en `/order`. **Mario decidió no probar** el IPN tardío, el monto distinto, `seller_mismatch` ni los dos crons a la vez (2026-10-29): están cubiertos solo por las pruebas unitarias con dobles. Si alguna tienda mueve mucho dinero, conviene hacerlas antes de abrir. Detalle y fechas en [ROADMAP.md](ROADMAP.md).
