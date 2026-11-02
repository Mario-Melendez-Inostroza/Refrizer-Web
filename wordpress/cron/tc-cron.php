<?php
/**
 * Barrido de conciliación para el cron de cPanel. Solo por línea de comandos: no tiene URL ni secreto.
 * Va FUERA de public_html (por ejemplo /home/USUARIO/tienda-cron/tc-cron.php).
 *
 * Uso:   /ruta/a/php -q /home/USUARIO/tienda-cron/tc-cron.php /home/USUARIO/public_html/wp/wp-load.php
 * (o la ruta de wp-load.php en la variable de entorno TC_WP_LOAD).
 *
 * Registro: una línea por pedido con id, resultado y motivo. Nunca emails, nombres, montos ni tokens.
 */

if ( PHP_SAPI !== 'cli' ) {
	http_response_code( 404 );
	exit;
}

$tc_wp_load = $argv[1] ?? getenv( 'TC_WP_LOAD' );
if ( ! is_string( $tc_wp_load ) || '' === $tc_wp_load || ! is_file( $tc_wp_load ) ) {
	fwrite( STDERR, gmdate( 'c' ) . " error: falta la ruta de wp-load.php (argumento 1 o TC_WP_LOAD)\n" );
	exit( 2 );
}

// Evita ejecuciones solapadas si una pasada tarda más que el intervalo del cron.
$tc_lock = fopen( __DIR__ . '/tc-cron.lock', 'c' );
if ( false === $tc_lock || ! flock( $tc_lock, LOCK_EX | LOCK_NB ) ) {
	echo gmdate( 'c' ) . " omitido: otra ejecución en curso\n";
	exit( 0 );
}

require $tc_wp_load;

if ( ! function_exists( 'tc_reconcile_pending' ) || ! function_exists( 'wc_get_orders' ) ) {
	fwrite( STDERR, gmdate( 'c' ) . " error: el plugin tienda-conciliacion o WooCommerce no están activos\n" );
	exit( 3 );
}

$tc_run = tc_reconcile_pending();
$tc_now = gmdate( 'c' );
if ( ! $tc_run['ok'] ) {
	// Solo nombres de constantes, nunca valores.
	fwrite( STDERR, $tc_now . ' error: ' . $tc_run['reason'] . ' ' . implode( ',', $tc_run['missing'] ?? array() ) . ( isset( $tc_run['seller'] ) ? ' vendedor=' . $tc_run['seller'] : '' ) . "\n" );
	exit( 4 );
}
// vendedor = estado de la comprobación del token (match, unconfigured...); nunca el id ni el token.
// silenciados = pedidos cerrados ya avisados o revisados hace poco: se cuentan pero no tienen línea propia.
$tc_quiet = 0;
$tc_lines = array();
foreach ( $tc_run['items'] as $tc_item ) {
	if ( tc_is_quiet_result( $tc_item ) ) {
		$tc_quiet++;
		continue;
	}
	$tc_lines[] = tc_log_line( $tc_item['order_id'], $tc_item, $tc_now );
}
echo $tc_now . ' barrido dry_run=' . ( $tc_run['dry_run'] ? 'si' : 'no' ) . ' vendedor=' . $tc_run['seller'] . ' pedidos=' . count( $tc_run['items'] ) . ' silenciados=' . $tc_quiet . "\n";
foreach ( $tc_lines as $tc_line ) {
	echo $tc_line . "\n";
}

flock( $tc_lock, LOCK_UN );
fclose( $tc_lock );
exit( 0 );
