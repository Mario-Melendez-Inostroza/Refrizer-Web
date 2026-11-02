<?php
/**
 * PLANTILLA SIN VALORES. No pongas aquí el token real ni subas la copia con valores al repositorio.
 *
 * La copia real va FUERA de public_html, por ejemplo:
 *   /home/USUARIO/tienda-secretos/config.php   (permisos 600)
 * y se carga desde wp-config.php, antes de la línea "That's all, stop editing!":
 *   require_once '/home/USUARIO/tienda-secretos/config.php';
 */

// Access Token de PRODUCCIÓN de la cuenta vendedora de Mercado Pago del cliente. Obligatorio.
// Sin él, la ruta REST y el cron responden "not_configured" sin consultar nada.
define( 'TC_MP_ACCESS_TOKEN', '' );

// ID numérico del vendedor de Mercado Pago dueño de ese token (el mismo que usa el plugin oficial de Mercado Pago en
// WooCommerce). El conciliador lo compara con GET /users/me antes de consultar nada: si no coincide, no hace nada.
// Obligatorio para escribir (con TC_DRY_RUN en false). Sin él solo corre en simulación. Es un ID, no un secreto, pero
// no lo pegues en el chat junto al token.
define( 'TC_MP_SELLER_ID', '' );

// Modo simulación: informa lo que haría y no escribe nada (ni pagos, ni notas, ni correos).
// Solo el booleano false, sin comillas, permite escribir. "false", 0 o '' siguen en simulación.
define( 'TC_DRY_RUN', true );

// Segundos que un pago debe llevar aprobado en Mercado Pago antes de que la conciliación escriba (por defecto 300).
// Da tiempo a que llegue el aviso real (IPN; el más lento medido tardó 124 s) y reduce, sin eliminar, la carrera con él.
// Entero >= 0, sin comillas. 0 desactiva la espera (no recomendado).
define( 'TC_MIN_AGE_SECONDS', 300 );

// "Prefijo de referencia" del plugin de Mercado Pago (external_reference = prefijo + id del pedido). Por defecto 'WC-'.
// Debe coincidir con site.orders.referencePrefix en src/config/site.ts.
define( 'TC_REFERENCE_PREFIX', 'WC-' );
