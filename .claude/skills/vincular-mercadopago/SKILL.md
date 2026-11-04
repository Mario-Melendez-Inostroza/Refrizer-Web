---
name: vincular-mercadopago
description: "Vincular el plugin de Mercado Pago con la cuenta de la clienta, pasar de credenciales de prueba a producción y volver a vincular otra cuenta. Úsalo ante errores como \"No fue posible vincular la tienda\", al elegir qué credenciales usar o al pasar a dinero real."
---

# Vincular Mercado Pago y pasar a producción

4. Plugin oficial de Mercado Pago: **Checkout Pro, modo Redirect**. Abrir las opciones avanzadas y **guardar**. Poner las **tres URLs de retorno** (éxito, rechazo, pendiente) en `https://<dominio>/pedido/retorno`. Sin esto el comprador vuelve a la página de WordPress. Debug apagado al entregar.
4b. **Vincular la cuenta de Mercado Pago en el plugin** *(Refrizer; versión con botón "Modificar cuenta")*: esta versión **no tiene un formulario suelto para pegar las credenciales de producción**. El camino manual es **WooCommerce > Mercado Pago > sección 1 > "Modificar cuenta" > país (Chile) > "En la cuenta de otra persona"**, que pide **las 4 credenciales juntas**: Public Key y Access Token de **producción** y de **prueba**, y **las cuatro deben ser de la MISMA aplicación de la MISMA cuenta**. Si se mezclan (producción de la clienta con prueba de otra cuenta, o de dos aplicaciones) sale el robot "No fue posible vincular la tienda". Se sacan del panel de desarrolladores: **Tus integraciones > elegir la aplicación (Checkout Pro) > Credenciales de producción / de prueba**; si la clienta no tiene aplicación, "Crear aplicación" (Checkout Pro) y activar las de producción (pide rubro y sitio web). Sin la contraseña de la clienta: M usa **"Solicitar acceso a credenciales"** con el correo de ella, ella acepta y la aplicación aparece en su lista. Quien pega los tokens es **M**, nunca Claude ni el chat. Revisión de Claude sin ver valores: los campos de producción empiezan con `APP_` y los de prueba con `TEST`; la sección 4 dice "Modo Ventas (Producción)" o "Modo Test".
4c. **Las tarjetas no se pueden probar con credenciales de prueba** *(Refrizer)*: en el entorno de pruebas de Mercado Pago el pago con tarjeta **siempre sale rechazado** (también en el staging) y solo funciona con el saldo de una cuenta compradora de prueba. Con credenciales de prueba hay que usar el **vendedor de prueba** (su ID es el `TC_MP_SELLER_ID`); con una cuenta vendedora real y un comprador de prueba Mercado Pago responde "una de las partes es de prueba". Las pruebas con tarjeta se hacen **en producción con un monto mínimo** (ver la sección 4d).

## 4b. Paso a credenciales reales (dinero real)

Las pruebas de la sección 4 se hacen **primero con credenciales y cuentas de prueba** de Mercado Pago. Solo cuando pasan se cambia a las credenciales reales de la clienta:

1. Poner el Access Token de **producción** de la clienta en el plugin de Mercado Pago y en `config.php` (`TC_MP_ACCESS_TOKEN`), y su **ID de vendedor** en `TC_MP_SELLER_ID` (último grupo de números del token). Dejar `TC_DRY_RUN = true`. Comprobar `vendedor=match` en el registro del cron.
2. **Una compra real de monto mínimo** (el producto más barato) con una cuenta o tarjeta **distinta** de la vendedora (Mercado Pago no deja que una cuenta se compre a sí misma, hasta donde sé). Verificar: retorno a `/pedido/retorno`, "Procesando", stock -1, correos y que el barrido en simulación lee el pago real (`pending / too_recent`, luego `would_mark_paid` solo si el aviso se hubiera perdido).
3. **Devolver ese pago** desde el panel de Mercado Pago. Puede que la comisión no se reintegre: es el costo de la prueba, hay que avisarle a la clienta. El caso `refunded` de la conciliación no está probado en vivo.
4. Recién entonces `TC_DRY_RUN = false`.
5. Ajustes de producción: debug del plugin apagado, rastreo a 5 min, y **no** dejar productos de prueba ni pedidos de prueba en la tienda (borrarlos antes de abrir).

**Qué se usó en el staging (aclarado por Mario, 2026-10-29):** una integración creada en su cuenta real de Mercado Pago y sus **credenciales de prueba**, con una cuenta compradora de prueba. Es decir, todo el dinero fue de prueba. Consecuencias para la tienda real:
- El `TC_MP_SELLER_ID` del staging es el del **usuario vendedor de prueba**. En la tienda real es otro número: el del Access Token de **producción** de la clienta.
- Todas las compras del staging fueron con **saldo de Mercado Pago** (`payment_type=account_money` en la dirección de retorno). **Sin probar:** pago con tarjeta (crédito y débito), pago **rechazado** (retorno con `status=rejected`: ¿qué muestra `/pedido/retorno`?), y pagos **pendientes o en proceso**. Antes de abrir, probar al menos un pago con **tarjeta de prueba aprobada** y uno **rechazado**, con las credenciales de prueba de la clienta.
- La conciliación solo actúa sobre pagos `approved`; los pendientes o rechazados no los toca (comportamiento esperado, no probado en vivo).
