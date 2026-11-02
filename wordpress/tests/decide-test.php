<?php
/**
 * Pruebas sin WordPress, sin red y sin PHPUnit:   php wordpress/tests/decide-test.php
 *
 * Trasladan los 27 casos de api/_lib/reconcile.test.ts (marcados "TS n") a las funciones puras de decide.php y al
 * orquestador tc_run_reconcile() con dependencias simuladas, y añaden los casos nuevos del plugin.
 * Las funciones de WordPress (wc_get_order, wp_remote_get, wp_mail...) no existen aquí: si algún camino las llamara,
 * la prueba fallaría con un error fatal. Así se garantiza que no hay red.
 * Excepción: la última sección define dobles mínimos de WordPress y WooCommerce (wp_remote_get, wc_get_orders, $wpdb,
 * WC_Order, wp_mail...; sin red, con un token ficticio) para probar el orquestador y la capa tc_wp_*. Son dobles: comprueban
 * qué llama nuestro código y en qué orden, NO lo que WooCommerce hace por dentro. No sustituyen la prueba real en WordPress
 * (README §6). wp_mail es un doble que solo anota el envío: ningún camino envía correos.
 */

define( 'ABSPATH', __DIR__ . '/' );
require __DIR__ . '/../tienda-conciliacion/includes/decide.php';
require __DIR__ . '/../tienda-conciliacion/includes/reconcile.php';

$GLOBALS['tc_failures'] = 0;
$GLOBALS['tc_count']    = 0;

function t( string $name, callable $fn ): void {
	$GLOBALS['tc_count']++;
	try {
		$fn();
		echo "ok - {$name}\n";
	} catch ( \Throwable $e ) {
		$GLOBALS['tc_failures']++;
		echo "NO - {$name}\n     " . $e->getMessage() . "\n";
	}
}

function eq( $actual, $expected, string $msg = '' ): void {
	if ( $actual !== $expected ) {
		throw new Exception( ( $msg ? "{$msg}: " : '' ) . 'esperado ' . var_export( $expected, true ) . ', obtenido ' . var_export( $actual, true ) );
	}
}

function ok( bool $cond, string $msg ): void {
	if ( ! $cond ) {
		throw new Exception( $msg );
	}
}

function order( array $over = array() ): array {
	return $over + array( 'id' => 31, 'status' => 'pending', 'total' => '8990', 'currency' => 'CLP', 'payment_method' => 'woo-mercado-pago-basic', 'alerted' => false, 'created' => TC_TEST_ORDER );
}

function payment( array $over = array() ): array {
	return $over + array(
		'id'                 => 777,
		'status'             => 'approved',
		'currency_id'        => 'CLP',
		'transaction_amount' => 8990,
		'external_reference' => 'WC-31',
		'date_created'       => '2026-10-06T21:07:35.000-04:00',
		'date_approved'      => '2026-10-06T21:17:05.000-04:00',
	);
}

/** Fecha ISO 8601 en UTC (sufijo Z) a partir de un timestamp. */
function iso( int $ts ): string {
	return gmdate( 'Y-m-d\TH:i:s\Z', $ts );
}

/** Reloj de las pruebas: 10 minutos después de la aprobación del pago de ejemplo (supera el umbral de 300 s). */
const TC_TEST_APPROVED = 1791335825; // 2026-10-06T21:17:05-04:00
const TC_TEST_NOW      = TC_TEST_APPROVED + 600;
/** Creación del pedido de ejemplo: 10 minutos antes de la aprobación; el pago de ejemplo se creó 30 s después. */
const TC_TEST_ORDER = TC_TEST_APPROVED - 600; // 2026-10-06T21:07:05-04:00

/**
 * Dependencias simuladas para tc_run_reconcile.
 * $s: reads (pedidos en lecturas sucesivas; el último se repite), payments (null = error de MP), lock, note_ok,
 * after_complete (estado tras payment_complete; por defecto processing), throw_on_read, now (reloj; por defecto TC_TEST_NOW).
 */
function fake( array $s ): array {
	$st = (object) array( 'reads' => 0, 'calls' => array(), 'completed' => false, 'refs' => array(), 'logs' => array() );
	$deps = array(
		'lock'            => function ( int $id ) use ( $s, $st ) {
			$st->calls[] = 'lock';
			return $s['lock'] ?? true;
		},
		'unlock'          => function ( int $id ) use ( $st ) {
			$st->calls[] = 'unlock';
		},
		'read_order'      => function ( int $id ) use ( $s, $st ) {
			$st->calls[] = 'read';
			if ( ! empty( $s['throw_on_read'] ) ) {
				throw new RuntimeException( 'ECONNREFUSED tienda.example ck_test' );
			}
			$seq = $s['reads'] ?? array( order() );
			$o   = $seq[ min( $st->reads, count( $seq ) - 1 ) ];
			$st->reads++;
			if ( $st->completed && null !== $o ) {
				$o['status'] = $s['after_complete'] ?? 'processing';
			}
			return $o;
		},
		'search_payments' => function ( string $ref ) use ( $s, $st ) {
			$st->calls[] = 'mp';
			$st->refs[]  = $ref;
			return array_key_exists( 'payments', $s ) ? $s['payments'] : array();
		},
		'complete'        => function ( int $id, string $pid ) use ( $st ) {
			$st->calls[]   = "complete:{$id}:{$pid}";
			$st->completed = true;
		},
		'mark_reconciled' => function ( int $id, string $pid ) use ( $st ) {
			$st->calls[] = "meta:{$pid}";
		},
		'add_note'        => function ( int $id, string $note ) use ( $s, $st ) {
			$st->calls[] = "note:{$note}";
			return $s['note_ok'] ?? true;
		},
		'alert'           => function ( int $id, array $d ) use ( $st ) {
			$st->calls[] = 'alert:' . ( $d['reason'] ?? '' );
		},
		'now'             => function () use ( $s ) {
			return $s['now'] ?? TC_TEST_NOW;
		},
	);
	// Marca de "cerrado revisado": se anota como "checked:<hora>" y NO cuenta en writes() (es contabilidad del espaciado).
	if ( empty( $s['no_mark'] ) ) {
		$deps['mark_checked'] = function ( int $id, int $now ) use ( $s, $st ) {
			if ( ! empty( $s['mark_throws'] ) ) {
				throw new RuntimeException( 'ECONNREFUSED secreto' );
			}
			$st->calls[] = "checked:{$now}";
		};
	}
	if ( empty( $s['no_log'] ) ) {
		$deps['log'] = function ( string $message ) use ( $s, $st ) {
			if ( ! empty( $s['log_throws'] ) ) {
				throw new RuntimeException( 'el registro falló' );
			}
			$st->logs[] = $message;
		};
	}
	return array( $deps, $st );
}

/** Escrituras = todo lo que cambia algo en WooCommerce o envía algo. */
function writes( $st ): array {
	return array_values( array_filter( $st->calls, function ( $c ) {
		return (bool) preg_match( '/^(complete|meta|note|alert)/', $c );
	} ) );
}

function mp_calls( $st ): int {
	return count( array_filter( $st->calls, function ( $c ) {
		return 'mp' === $c;
	} ) );
}

function run( array $s, bool $dry = false, string $prefix = 'WC-', int $min_age = 300 ): array {
	list( $deps, $st ) = fake( $s );
	$r = tc_run_reconcile( 31, $dry, $prefix, $deps, $min_age );
	return array( $r, $st );
}

/* ---------------- Traslado de api/_lib/reconcile.test.ts ---------------- */

t( 'TS 1: pedido ya pagado (processing): no consulta a Mercado Pago ni escribe', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'processing' ) ) ) ) );
	eq( $r['result'], 'already_paid' );
	eq( mp_calls( $st ), 0 );
	eq( writes( $st ), array() );
} );

t( 'TS 2: pedido completado: tampoco escribe', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'completed' ) ) ) ) );
	eq( $r['result'], 'already_paid' );
	eq( writes( $st ), array() );
} );

foreach ( array( 'cancelled', 'refunded', 'failed' ) as $tc_status ) {
	// Cambio respecto del TS: ahora se consulta a Mercado Pago para avisar si hay un pago aprobado (ver casos nuevos).
	t( "TS 3-5: pedido {$tc_status} sin pago aprobado: no se toca", function () use ( $tc_status ) {
		list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => $tc_status ) ) ), 'payments' => array( payment( array( 'status' => 'rejected' ) ) ) ) );
		eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
		eq( writes( $st ), array() );
	} );
}

t( 'TS 6: pedido pagado con otra pasarela: se omite sin consultar a Mercado Pago', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'payment_method' => 'bacs' ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'not_mercado_pago' ) );
	eq( mp_calls( $st ), 0 );
	eq( writes( $st ), array() );
} );

t( 'TS 7: monto distinto: revisión, aviso y nada de payment_complete', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'transaction_amount' => 9000 ) ) ) ) );
	eq( array( $r['result'], $r['reason'], $r['expected'], $r['received'] ), array( 'review', 'amount_mismatch', 8990, 9000 ) );
	eq( writes( $st ), array( 'alert:amount_mismatch' ) );
} );

t( 'TS 8: el monto se compara con el total del pedido, no con una cifra x100', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'transaction_amount' => 899000 ) ) ) ) );
	eq( $r['reason'], 'amount_mismatch' );
	ok( ! in_array( 'complete:31:777', $st->calls, true ), 'no debe completar' );
} );

t( 'TS 9: moneda distinta en el pago: revisión', function () {
	$r = tc_decide( order(), array( payment( array( 'currency_id' => 'USD' ) ) ), 'WC-' );
	eq( array( $r['result'], $r['reason'] ), array( 'review', 'currency_mismatch' ) );
} );

t( 'TS 10: moneda distinta en el pedido: revisión', function () {
	eq( tc_decide( order( array( 'currency' => 'USD' ) ), array( payment() ), 'WC-' )['reason'], 'currency_mismatch' );
} );

t( 'TS 11: pago aprobado correcto: payment_complete con el id del pago, meta y nota privada', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['payment_id'], $r['note_saved'], $r['status'] ), array( 'marked_paid', '777', true, 'processing' ) );
	$w = writes( $st );
	eq( count( $w ), 3 );
	eq( $w[0], 'complete:31:777' );
	eq( $w[1], 'meta:777' );
	ok( (bool) preg_match( '/^note:.*777.*8990/', $w[2] ), 'la nota menciona pago y monto' );
	eq( $st->refs, array( 'WC-31' ) );
} );

t( 'TS 12: dry run: informa would_mark_paid y no escribe nada', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment() ) ), true );
	eq( array( $r['result'], $r['payment_id'] ), array( 'would_mark_paid', '777' ) );
	eq( writes( $st ), array() );
} );

t( 'TS 13: TC_DRY_RUN: solo el booleano false permite escribir', function () {
	eq( tc_is_dry_run( null ), true, 'sin definir' );
	eq( tc_is_dry_run( '' ), true );
	eq( tc_is_dry_run( 0 ), true );
	eq( tc_is_dry_run( '0' ), true );
	eq( tc_is_dry_run( 'false' ), true, 'texto "false"' );
	eq( tc_is_dry_run( 'FALSE' ), true );
	eq( tc_is_dry_run( true ), true );
	eq( tc_is_dry_run( false ), false );
} );

t( 'TS 14: configuración: nombra lo que falta y nunca imprime valores', function () {
	eq( tc_missing_config( array() ), array( 'TC_MP_ACCESS_TOKEN' ) );
	eq( tc_missing_config( array( 'TC_MP_ACCESS_TOKEN' => '' ) ), array( 'TC_MP_ACCESS_TOKEN' ) );
	eq( tc_missing_config( array( 'TC_MP_ACCESS_TOKEN' => 'secreto-mp' ) ), array() );
	ok( false === strpos( implode( ',', tc_missing_config( array( 'TC_MP_ACCESS_TOKEN' => '' ) ) ), 'secreto' ), 'sin valores' );
} );

t( 'TS 15: prefijo de referencia configurable', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'external_reference' => 'TDA-31' ) ) ) ), false, 'TDA-' );
	eq( $r['result'], 'marked_paid' );
	eq( $st->refs, array( 'TDA-31' ) );
} );

t( 'TS 16: pedido inexistente: not_found sin consultar ni escribir', function () {
	list( $r, $st ) = run( array( 'reads' => array( null ) ) );
	eq( $r, array( 'result' => 'not_found' ) );
	eq( mp_calls( $st ) + count( writes( $st ) ), 0 );
} );

t( 'TS 17: key o email incorrectos no coinciden; el email no distingue mayúsculas', function () {
	eq( tc_customer_matches( 'wc_order_abc', 'Comprador@Example.com', 'wc_order_abc', 'comprador@example.com' ), true );
	eq( tc_customer_matches( 'wc_order_abc', 'Comprador@Example.com', 'wc_order_otra', 'comprador@example.com' ), false );
	eq( tc_customer_matches( 'wc_order_abc', 'Comprador@Example.com', 'wc_order_abc', 'otra@example.com' ), false );
	eq( tc_customer_matches( 'wc_order_abc', '', 'wc_order_abc', '' ), false, 'pedido sin email' );
	eq( tc_customer_matches( '', 'a@b.cl', '', 'a@b.cl' ), false, 'pedido sin key' );
	// La ruta REST responde not_found tanto si no existe como si key/email fallan: mismo código público.
	eq( tc_public_code( array( 'result' => 'not_found' ) ), 'not_found' );
} );

t( 'TS 18: entradas inválidas: se rechazan antes de leer nada', function () {
	foreach ( array(
		array( 'orderId' => '31; DROP', 'orderKey' => 'k', 'email' => 'e' ),
		array( 'orderId' => 31, 'orderKey' => 5, 'email' => 'e' ),
		array( 'orderKey' => 'k', 'email' => 'e' ),
		array( 'orderId' => '../1', 'orderKey' => 'k', 'email' => 'e' ),
		array( 'orderId' => '1234567890123', 'orderKey' => 'k', 'email' => 'e' ),
		array( 'orderId' => 3.5, 'orderKey' => 'k', 'email' => 'e' ),
	) as $bad ) {
		eq( tc_parse_customer_request( $bad ), null, json_encode( $bad ) );
	}
	eq( tc_parse_customer_request( array( 'orderId' => '31', 'orderKey' => 'k', 'email' => 'e' ) ), array( 'id' => 31, 'key' => 'k', 'email' => 'e' ) );
	eq( tc_parse_customer_request( array( 'orderId' => 31, 'orderKey' => 'k', 'email' => 'e' ) )['id'], 31 );
} );

t( 'TS 19: varios pagos aprobados: revisión humana', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'id' => 1 ) ), payment( array( 'id' => 2 ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'review', 'multiple_approved' ) );
	eq( writes( $st ), array( 'alert:multiple_approved' ) );
} );

t( 'TS 20: sin pago aprobado (rechazado, o de otro pedido como WC-310): sigue pendiente', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'status' => 'rejected' ) ), payment( array( 'id' => 5, 'external_reference' => 'WC-310' ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_approved_payment' ) );
	eq( writes( $st ), array() );
} );

t( 'TS 21: si el aviso real llega mientras se concilia, no escribe', function () {
	list( $r, $st ) = run( array( 'reads' => array( order(), order( array( 'status' => 'processing' ) ) ), 'payments' => array( payment() ) ) );
	eq( $r['result'], 'already_paid' );
	eq( writes( $st ), array() );
} );

t( 'TS 22: error de Mercado Pago o de WooCommerce: resultado error sin filtrar datos', function () {
	list( $r ) = run( array( 'payments' => null ) );
	eq( $r, array( 'result' => 'error', 'reason' => 'mp_error' ) );
	list( $r ) = run( array( 'throw_on_read' => true ) );
	eq( $r, array( 'result' => 'error', 'reason' => 'unexpected' ) );
	eq( tc_parse_mp_response( 500, '{"message":"x"}' ), null );
	eq( tc_parse_mp_response( 200, 'no-json' ), null );
	eq( tc_parse_mp_response( 200, '{"paging":{}}' ), null );
	eq( tc_parse_mp_response( 200, '{"results":[{"id":1}]}' ), array( array( 'id' => 1 ) ) );
} );

t( 'TS 23: si la nota falla, el pedido igual queda pagado y se informa note_saved=false', function () {
	list( $r ) = run( array( 'payments' => array( payment() ), 'note_ok' => false ) );
	eq( array( $r['result'], $r['note_saved'] ), array( 'marked_paid', false ) );
} );

t( 'TS 24: barrido: pending y on-hold de Mercado Pago, 14 días, máximo 50', function () {
	$args = tc_pending_query_args( 1_000_000_000 );
	eq( $args['status'], array( 'pending', 'on-hold' ) );
	eq( $args['payment_method'], 'woo-mercado-pago-basic' );
	eq( $args['limit'], 50 );
	eq( $args['date_created'], '>' . ( 1_000_000_000 - 14 * 86400 ) );
	eq( $args['return'], 'ids' );
	eq( $args['type'], 'shop_order' );
} );

// TS 25 y TS 26 (RECONCILE_SECRET y autenticación del barrido por HTTP): NO APLICAN. El barrido corre por línea de
// comandos (cron/tc-cron.php se niega fuera de CLI) y no tiene URL ni secreto. Se sustituyen por estas dos pruebas:
t( 'TS 25 (sustituto): el registro del cron solo lleva id, resultado y motivo', function () {
	$line = tc_log_line( 31, array( 'result' => 'review', 'reason' => 'amount_mismatch', 'expected' => 8990, 'received' => 9000, 'payment_id' => '777' ), '2026-10-11T00:00:00+00:00' );
	eq( $line, '2026-10-11T00:00:00+00:00 pedido=31 resultado=review motivo=amount_mismatch pago=777' );
	ok( false === strpos( $line, '8990' ) && false === strpos( $line, '9000' ), 'sin montos' );
	// Sin payment_id la línea no cambia; el id del pago no puede partir la línea.
	eq( tc_log_line( 31, array( 'result' => 'pending', 'reason' => 'no_approved_payment' ), 'T' ), 'T pedido=31 resultado=pending motivo=no_approved_payment' );
	eq( tc_log_line( 31, array( 'result' => 'review', 'payment_id' => "7\n77 token=x" ), 'T' ), 'T pedido=31 resultado=review motivo=- pago=777tokenx' );
} );

t( 'TS 26 (sustituto): el cron se niega a correr fuera de la línea de comandos (comprobación estática)', function () {
	$src = file_get_contents( __DIR__ . '/../cron/tc-cron.php' );
	ok( (bool) preg_match( "/if \\( PHP_SAPI !== 'cli' \\)/", $src ), 'falta la guarda PHP_SAPI' );
	ok( strpos( $src, 'LOCK_EX | LOCK_NB' ) !== false, 'falta el flock' );
} );

t( 'TS 27: al navegador no salen montos ni motivos', function () {
	$code = tc_public_code( array( 'result' => 'review', 'reason' => 'amount_mismatch', 'expected' => 8990, 'received' => 1 ) );
	eq( $code, 'pending' );
	foreach ( array( 'would_mark_paid', 'skipped', 'error', 'review', 'pending' ) as $internal ) {
		eq( tc_public_code( array( 'result' => $internal ) ), 'pending', $internal );
	}
	foreach ( array( 'not_found', 'already_paid', 'marked_paid', 'try_later' ) as $public ) {
		eq( tc_public_code( array( 'result' => $public ) ), $public );
	}
} );

/* ---------------- Casos nuevos del plugin ---------------- */

t( 'on-hold con pago aprobado correcto: se marca pagado', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'on-hold' ) ) ), 'payments' => array( payment() ) ) );
	eq( $r['result'], 'marked_paid' );
	ok( in_array( 'complete:31:777', $st->calls, true ), 'debe llamar a payment_complete' );
} );

foreach ( array( 'cancelled', 'refunded', 'failed' ) as $tc_status ) {
	t( "{$tc_status} con pago aprobado: NO se marca, se avisa una vez", function () use ( $tc_status ) {
		list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => $tc_status ) ) ), 'payments' => array( payment() ) ) );
		eq( array( $r['result'], $r['reason'], $r['payment_id'], $r['alert'] ), array( 'skipped', "approved_payment_on_{$tc_status}", '777', 'sent' ) );
		eq( writes( $st ), array( "alert:approved_payment_on_{$tc_status}" ) );
	} );
}

t( 'cancelado con pago aprobado y aviso ya enviado: no repite el aviso ni vuelve a consultar a Mercado Pago', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled', 'alerted' => true ) ) ), 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'already_alerted' ) );
	eq( mp_calls( $st ), 0 );
	eq( writes( $st ), array() );
} );

t( 'revisión con aviso ya enviado: no repite el aviso', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'alerted' => true ) ) ), 'payments' => array( payment( array( 'transaction_amount' => 1 ) ) ) ) );
	eq( array( $r['result'], $r['alert'] ), array( 'review', 'already_sent' ) );
	eq( writes( $st ), array() );
} );

t( 'dry run: tampoco envía avisos (informa would_send)', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array( payment() ) ), true );
	eq( $r['alert'], 'would_send' );
	eq( writes( $st ), array() );
} );

foreach ( array( 'pending', 'on-hold', 'cancelled', 'failed' ) as $tc_status ) {
	t( "tras payment_complete el pedido quedó {$tc_status}: estado inesperado, sin meta ni nota de éxito", function () use ( $tc_status ) {
		list( $r, $st ) = run( array( 'payments' => array( payment() ), 'after_complete' => $tc_status ) );
		eq( array( $r['result'], $r['reason'], $r['status'] ), array( 'error', 'unexpected_status_after_payment', $tc_status ) );
		eq( writes( $st ), array( 'complete:31:777' ) );
	} );
}

t( 'tras payment_complete el pedido quedó processing: éxito', function () {
	list( $r ) = run( array( 'payments' => array( payment() ), 'after_complete' => 'processing' ) );
	eq( array( $r['result'], $r['status'] ), array( 'marked_paid', 'processing' ) );
} );

t( 'tras payment_complete el pedido quedó completed (solo productos virtuales o descargables): éxito', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment() ), 'after_complete' => 'completed' ) );
	eq( array( $r['result'], $r['status'] ), array( 'marked_paid', 'completed' ) );
	ok( in_array( 'meta:777', $st->calls, true ), 'guarda la meta' );
} );

t( 'pago aprobado con devolución parcial en Mercado Pago: revisión, no se marca', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'transaction_amount_refunded' => 1000 ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'review', 'refunded_in_mp' ) );
	ok( ! in_array( 'complete:31:777', $st->calls, true ), 'no debe completar' );
	eq( tc_decide( order(), array( payment( array( 'status_detail' => 'partially_refunded' ) ) ), 'WC-' )['reason'], 'refunded_in_mp' );
	eq( tc_decide( order(), array( payment( array( 'transaction_amount_refunded' => 0, 'status_detail' => 'accredited' ) ) ), 'WC-' )['result'], 'would_mark_paid' );
} );

t( 'reloj de las pruebas: las constantes coinciden con las fechas del pago de ejemplo', function () {
	eq( ( new DateTimeImmutable( payment()['date_approved'] ) )->getTimestamp(), TC_TEST_APPROVED );
	eq( ( new DateTimeImmutable( payment()['date_created'] ) )->getTimestamp(), TC_TEST_ORDER + 30 );
} );

t( 'antigüedad mínima: pago aprobado hace 299 s no se escribe (pending/too_recent), tampoco en dry run', function () {
	foreach ( array( false, true ) as $dry ) {
		list( $r, $st ) = run( array( 'payments' => array( payment() ), 'now' => TC_TEST_APPROVED + 299 ), $dry );
		eq( array( $r['result'], $r['reason'], $r['payment_id'] ), array( 'pending', 'too_recent', '777' ) );
		eq( writes( $st ), array() );
	}
} );

t( 'antigüedad mínima: a los 300 s exactos sí se escribe', function () {
	list( $r ) = run( array( 'payments' => array( payment() ), 'now' => TC_TEST_APPROVED + 300 ) );
	eq( $r['result'], 'marked_paid' );
} );

t( 'antigüedad mínima: sin date_approved (con date_created legible) no se escribe', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'date_approved' => null ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'missing_date_approved' ) );
	eq( writes( $st ), array() );
} );

t( 'date_approved ilegible: la guarda de fechas lo manda a revisión (antes: pending/too_recent), no se escribe', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'date_approved' => 'no-es-fecha' ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'review', 'payment_date_unreadable' ) );
	eq( writes( $st ), array( 'alert:payment_date_unreadable' ) );
} );

t( 'antigüedad mínima configurable: umbral 900 s, y 0 la desactiva', function () {
	list( $r ) = run( array( 'payments' => array( payment() ) ), false, 'WC-', 900 );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'too_recent' ) );
	list( $r ) = run( array( 'payments' => array( payment() ), 'now' => TC_TEST_APPROVED + 1 ), false, 'WC-', 0 );
	eq( $r['result'], 'marked_paid' );
} );

t( 'TC_MIN_AGE_SECONDS: entero >= 0; cualquier otra cosa usa 300', function () {
	eq( tc_min_age( null ), 300 );
	eq( tc_min_age( 600 ), 600 );
	eq( tc_min_age( 0 ), 0 );
	eq( tc_min_age( -5 ), 300 );
	eq( tc_min_age( '600' ), 300 );
	eq( tc_min_age( 1.5 ), 300 );
} );

t( 'las revisiones y avisos no esperan la antigüedad mínima (no escriben el pago)', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment( array( 'transaction_amount' => 1 ) ) ), 'now' => TC_TEST_APPROVED + 1 ) );
	eq( $r['result'], 'review' );
	eq( writes( $st ), array( 'alert:amount_mismatch' ) );
} );

t( 'aviso al administrador: la marca _tc_alerted se guarda antes de enviar el correo (comprobación estática)', function () {
	// Con core.autocrlf=true la copia de trabajo en Windows queda en CRLF: se normaliza antes de buscar el cierre "\n}\n".
	$src  = str_replace( "\r\n", "\n", file_get_contents( __DIR__ . '/../tienda-conciliacion/includes/reconcile.php' ) );
	$body = substr( $src, strpos( $src, 'function tc_wp_alert' ) );
	$body = substr( $body, 0, strpos( $body, "\n}\n" ) );
	$mark = strpos( $body, "'_tc_alerted'" );
	$mail = strpos( $body, 'wp_mail(' );
	ok( false !== $mark && false !== $mail && $mark < $mail, 'la marca debe ir antes de wp_mail' );
} );

t( 'el pedido se canceló entre la primera lectura y la escritura: no se completa y se avisa del pago aprobado', function () {
	list( $r, $st ) = run( array( 'reads' => array( order(), order( array( 'status' => 'cancelled' ) ) ), 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['reason'], $r['payment_id'], $r['alert'] ), array( 'skipped', 'approved_payment_on_cancelled', '777', 'sent' ) );
	eq( writes( $st ), array( 'alert:approved_payment_on_cancelled' ) );
} );

t( 'el pedido se canceló entre lecturas, sin pago aprobado: no se completa ni se avisa', function () {
	list( $r, $st ) = run( array( 'reads' => array( order(), order( array( 'status' => 'cancelled' ) ) ), 'payments' => array( payment( array( 'status' => 'rejected' ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_approved_payment' ) );
	eq( writes( $st ), array() );
} );

t( 'bloqueo ocupado (otra conciliación del mismo pedido): no lee, no consulta, no libera', function () {
	list( $r, $st ) = run( array( 'lock' => false, 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'locked' ) );
	eq( $st->calls, array( 'lock' ) );
} );

t( 'el bloqueo se libera siempre, también tras un error', function () {
	foreach ( array( array( 'throw_on_read' => true ), array( 'payments' => null ), array( 'payments' => array( payment() ) ) ) as $s ) {
		list( , $st ) = run( $s );
		eq( end( $st->calls ), 'unlock' );
	}
} );

t( 'estado desconocido (checkout-draft): se omite sin consultar', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'checkout-draft' ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
	eq( mp_calls( $st ), 0 );
} );

t( 'total con decimales "8990.00" equivale a 8990; total no numérico va a revisión', function () {
	eq( tc_decide( order( array( 'total' => '8990.00' ) ), array( payment() ), 'WC-' )['result'], 'would_mark_paid' );
	eq( tc_decide( order( array( 'total' => '' ) ), array( payment() ), 'WC-' )['reason'], 'amount_mismatch' );
	eq( tc_decide( order(), array( payment( array( 'transaction_amount' => null ) ) ), 'WC-' )['reason'], 'amount_mismatch' );
} );

t( 'external_reference exacta: WC-31 no acepta WC-310 ni wc-31', function () {
	eq( tc_decide( order(), array( payment( array( 'external_reference' => 'WC-310' ) ) ), 'WC-' )['result'], 'pending' );
	eq( tc_decide( order(), array( payment( array( 'external_reference' => 'wc-31' ) ) ), 'WC-' )['result'], 'pending' );
	eq( tc_decide( order(), array( 'basura', payment() ), 'WC-' )['result'], 'would_mark_paid' );
} );

t( 'URL de búsqueda en Mercado Pago: external_reference codificada', function () {
	eq( tc_mp_search_url( 'WC-31' ), 'https://api.mercadopago.com/v1/payments/search?external_reference=WC-31&sort=date_created&criteria=desc&limit=50' );
	ok( false !== strpos( tc_mp_search_url( 'A&B' ), 'external_reference=A%26B&' ), 'codifica &' );
} );

t( 'rutas de la Store API para el filtro (404 uniforme y no-store)', function () {
	eq( tc_store_route_kind( '/wc/store/v1/order/31' ), 'order' );
	eq( tc_store_route_kind( '/wc/store/order/31' ), 'order' );
	eq( tc_store_route_kind( '/wc/store/v1/cart' ), 'private' );
	eq( tc_store_route_kind( '/wc/store/v1/cart/add-item' ), 'private' );
	eq( tc_store_route_kind( '/wc/store/v1/checkout' ), 'private' );
	eq( tc_store_route_kind( '/wc/store/v1/products' ), null );
	eq( tc_store_route_kind( '/wc/v3/orders/31' ), null );
	eq( tc_store_route_kind( '/wc/store/v1/order/31/extra' ), null );
} );

t( 'texto del aviso: sin datos del comprador, con motivo y montos para revisar', function () {
	$text = tc_alert_text( 31, array( 'reason' => 'amount_mismatch', 'expected' => 8990, 'received' => 9000 ) );
	ok( false !== strpos( $text, '#31' ) && false !== strpos( $text, 'amount_mismatch' ) && false !== strpos( $text, '9000' ), 'contenido' );
	ok( false === strpos( $text, '@' ), 'sin email' );
} );

/* ---------------- Guarda de fechas: pagos de otro pedido con la misma referencia ---------------- */

/** Pago aprobado creado y aprobado $before segundos antes de crearse el pedido. */
function old_payment( array $over = array(), int $before = 3600 ): array {
	return $over + payment( array( 'date_created' => iso( TC_TEST_ORDER - $before ), 'date_approved' => iso( TC_TEST_ORDER - $before + 60 ) ) );
}

t( 'fechas: lista vacía de pagos: pendiente (no_payments_found), sin escribir', function () {
	eq( array( tc_decide( order(), array(), 'WC-' )['result'], tc_decide( order(), array(), 'WC-' )['reason'] ), array( 'pending', 'no_payments_found' ) );
	list( $r, $st ) = run( array( 'payments' => array() ) );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_payments_found' ) );
	eq( writes( $st ), array() );
} );

t( 'fechas: pago anterior al pedido con monto distinto: se descarta, no es amount_mismatch ni avisa', function () {
	list( $r, $st ) = run( array( 'payments' => array( old_payment( array( 'transaction_amount' => 1000 ) ) ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_approved_payment' ) );
	eq( writes( $st ), array() );
} );

t( 'fechas: pago anterior al pedido con el mismo monto: nunca would_mark_paid ni payment_complete', function () {
	$r = tc_decide( order(), array( old_payment() ), 'WC-' );
	ok( 'would_mark_paid' !== $r['result'], 'no debe ser would_mark_paid' );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_approved_payment' ) );
	list( $r, $st ) = run( array( 'payments' => array( old_payment() ) ) );
	ok( 'marked_paid' !== $r['result'] && 'would_mark_paid' !== $r['result'], 'el resultado final no concilia' );
	eq( writes( $st ), array() );
	list( $r ) = run( array( 'payments' => array( old_payment() ) ), true );
	eq( $r['result'], 'pending' );
} );

t( 'fechas: pago antiguo y pago nuevo válido, ambos aprobados: concilia con el id del nuevo', function () {
	$r = tc_decide( order(), array( old_payment( array( 'id' => 500 ) ), payment() ), 'WC-' );
	eq( array( $r['result'], $r['payment_id'] ), array( 'would_mark_paid', '777' ) );
	$r = tc_decide( order(), array( payment(), old_payment( array( 'id' => 500 ) ) ), 'WC-' );
	eq( array( $r['result'], $r['payment_id'] ), array( 'would_mark_paid', '777' ) );
	list( $r, $st ) = run( array( 'payments' => array( old_payment( array( 'id' => 500 ) ), payment() ) ) );
	eq( array( $r['result'], $r['payment_id'] ), array( 'marked_paid', '777' ) );
	eq( writes( $st )[0], 'complete:31:777' );
} );

t( 'fechas: pago sin date_created pero con date_approved anterior al pedido: se descarta', function () {
	$p = old_payment( array( 'date_created' => null ) );
	eq( $p['date_created'], null );
	$r = tc_decide( order(), array( $p ), 'WC-' );
	eq( array( $r['result'], $r['reason'] ), array( 'pending', 'no_approved_payment' ) );
	// Con solo date_approved posterior al pedido, sí se acepta.
	eq( tc_decide( order(), array( payment( array( 'date_created' => null ) ) ), 'WC-' )['result'], 'would_mark_paid' );
} );

t( 'fechas: pago sin ninguna fecha legible: revisión con aviso, no concilia', function () {
	$p = payment( array( 'date_created' => null, 'date_approved' => null ) );
	$r = tc_decide( order(), array( $p ), 'WC-' );
	eq( array( $r['result'], $r['reason'], $r['payment_id'], $r['notify'] ), array( 'review', 'payment_date_unreadable', '777', true ) );
	foreach ( array( array( '', '' ), array( 'basura', null ), array( null, 12345 ) ) as $pair ) {
		$r = tc_decide( order(), array( payment( array( 'date_created' => $pair[0], 'date_approved' => $pair[1] ) ) ), 'WC-' );
		eq( array( $r['result'], $r['reason'] ), array( 'review', 'payment_date_unreadable' ), json_encode( $pair ) );
	}
	eq( tc_decide( order(), array( payment( array( 'date_created' => 'basura', 'date_approved' => null ) ) ), 'WC-' )['reason'], 'payment_date_unreadable' );
	list( $r, $st ) = run( array( 'payments' => array( $p ) ) );
	eq( $r['result'], 'review' );
	eq( writes( $st ), array( 'alert:payment_date_unreadable' ) );
} );

t( 'fechas: fecha sin zona horaria o inexistente se trata como ilegible (revisión, no concilia)', function () {
	foreach ( array(
		array( 'date_created' => '2026-10-06T21:07:35', 'date_approved' => '2026-10-06T21:17:05.000-04:00' ),
		array( 'date_created' => '2026-10-06T21:07:35.000-04:00', 'date_approved' => '2026-10-06T21:17:05' ),
		array( 'date_created' => null, 'date_approved' => '2026-10-06T21:17:05' ),
		array( 'date_created' => '2026-10-06 21:07:35Z', 'date_approved' => null ),
		array( 'date_created' => '2026-10-06T21:07:35-0400', 'date_approved' => null ),
		array( 'date_created' => '2026-02-30T10:00:00Z', 'date_approved' => null ),
	) as $dates ) {
		$r = tc_decide( order(), array( payment( $dates ) ), 'WC-' );
		eq( array( $r['result'], $r['reason'] ), array( 'review', 'payment_date_unreadable' ), json_encode( $dates ) );
	}
	// Con zona (Z y ±hh:mm) se lee bien.
	eq( tc_parse_mp_date( '2026-10-07T01:17:05Z' ), TC_TEST_APPROVED );
	eq( tc_parse_mp_date( '2026-10-07T01:17:05.000Z' ), TC_TEST_APPROVED );
	eq( tc_parse_mp_date( '2026-10-06T21:17:05.000-04:00' ), TC_TEST_APPROVED );
	eq( tc_parse_mp_date( '2026-10-07T03:17:05+02:00' ), TC_TEST_APPROVED );
} );

t( 'fechas: acepta con y sin milisegundos, con zona horaria (-04:00, Z), y dan el mismo instante', function () {
	$with    = '2026-10-06T21:17:05.000-04:00';
	$without = '2026-10-06T21:17:05-04:00';
	eq( tc_parse_mp_date( $with ), TC_TEST_APPROVED, 'con milisegundos' );
	eq( tc_parse_mp_date( $without ), TC_TEST_APPROVED, 'sin milisegundos' );
	eq( tc_parse_mp_date( '2026-10-06T21:17:05.123456-04:00' ), TC_TEST_APPROVED, 'microsegundos' );
	eq( tc_parse_mp_date( '2026-10-07T01:17:05.000Z' ), TC_TEST_APPROVED, 'Z con milisegundos' );
	eq( tc_parse_mp_date( '2026-10-07T01:17:05Z' ), TC_TEST_APPROVED, 'Z sin milisegundos' );

	// Por la guarda completa: cada formato en date_created y en date_approved, y el pago se concilia.
	$formats = array(
		array( '2026-10-06T21:07:35.000-04:00', '2026-10-06T21:17:05.000-04:00' ),
		array( '2026-10-06T21:07:35-04:00', '2026-10-06T21:17:05-04:00' ),
		array( '2026-10-06T21:07:35.000-04:00', '2026-10-06T21:17:05-04:00' ),
		array( '2026-10-06T21:07:35-04:00', '2026-10-06T21:17:05.000-04:00' ),
	);
	foreach ( $formats as $pair ) {
		$r = tc_decide( order(), array( payment( array( 'date_created' => $pair[0], 'date_approved' => $pair[1] ) ) ), 'WC-' );
		eq( array( $r['result'], $r['payment_id'], $r['date_approved'] ), array( 'would_mark_paid', '777', $pair[1] ), json_encode( $pair ) );
	}

	// Y la guarda descarta por instante, también sin milisegundos: 1 s antes del margen de 5 minutos.
	$before = gmdate( 'Y-m-d\TH:i:sP', TC_TEST_ORDER - 301 ); // "+00:00", sin milisegundos
	eq( tc_decide( order(), array( payment( array( 'date_created' => $before, 'date_approved' => $with ) ) ), 'WC-' )['reason'], 'no_approved_payment' );
	// Con el margen exacto de 300 s, con y sin milisegundos, se acepta.
	$edge = gmdate( 'Y-m-d\TH:i:sP', TC_TEST_ORDER - 300 );
	eq( tc_decide( order(), array( payment( array( 'date_created' => $edge, 'date_approved' => $without ) ) ), 'WC-' )['result'], 'would_mark_paid' );
	eq( tc_decide( order(), array( payment( array( 'date_created' => str_replace( '+00:00', '.000+00:00', $edge ), 'date_approved' => $with ) ) ), 'WC-' )['result'], 'would_mark_paid' );
} );

t( 'fechas: pedido sin fecha de creación: revisión con aviso, no concilia (tampoco en dry run)', function () {
	foreach ( array( null, 0, '2026-10-06T21:07:05Z' ) as $created ) {
		$r = tc_decide( order( array( 'created' => $created ) ), array( payment() ), 'WC-' );
		eq( array( $r['result'], $r['reason'], $r['notify'] ), array( 'review', 'missing_order_date', true ), json_encode( $created ) );
	}
	$o = order();
	unset( $o['created'] );
	eq( tc_decide( $o, array( payment() ), 'WC-' )['reason'], 'missing_order_date' );
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'created' => null ) ) ), 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['reason'], $r['alert'] ), array( 'review', 'missing_order_date', 'sent' ) );
	eq( writes( $st ), array( 'alert:missing_order_date' ) );
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'created' => null ) ) ), 'payments' => array( payment() ) ), true );
	eq( array( $r['result'], $r['alert'] ), array( 'review', 'would_send' ) );
	eq( writes( $st ), array() );
} );

t( 'fechas: margen de 5 minutos: -300 s se acepta, -301 s se descarta (compara timestamps, no cadenas)', function () {
	$edge = payment( array( 'date_created' => iso( TC_TEST_ORDER - 300 ), 'date_approved' => iso( TC_TEST_ORDER + 60 ) ) );
	eq( tc_decide( order(), array( $edge ), 'WC-' )['result'], 'would_mark_paid' );
	$late = payment( array( 'date_created' => iso( TC_TEST_ORDER - 301 ), 'date_approved' => iso( TC_TEST_ORDER + 60 ) ) );
	eq( tc_decide( order(), array( $late ), 'WC-' )['reason'], 'no_approved_payment' );
	// Misma hora en otra zona: como cadena "2026-10-06T22:..." parece posterior a "21:...", pero el instante es anterior.
	$tz = payment( array( 'date_created' => '2026-10-06T22:00:00+05:00', 'date_approved' => '2026-10-06T22:05:00+05:00' ) );
	eq( tc_decide( order(), array( $tz ), 'WC-' )['reason'], 'no_approved_payment' );
} );

t( 'fechas: pago antiguo aprobado sobre pedido cancelado: no avisa (no es de este pedido)', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array( old_payment() ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
	eq( writes( $st ), array() );
} );

t( 'amount_mismatch incluye payment_id (y llega al registro del cron sin montos)', function () {
	$r = tc_decide( order(), array( payment( array( 'id' => 4242, 'transaction_amount' => 9000 ) ) ), 'WC-' );
	eq( array( $r['reason'], $r['payment_id'] ), array( 'amount_mismatch', '4242' ) );
	$line = tc_log_line( 31, $r, 'T' );
	eq( $line, 'T pedido=31 resultado=review motivo=amount_mismatch pago=4242' );
	ok( false === strpos( $line, '9000' ) && false === strpos( $line, '8990' ), 'sin montos' );
} );

/* ---------------- C1: pagos tardíos y pedidos cancelados ---------------- */

t( 'barrido de cerrados: solo cancelled y failed, de Mercado Pago, 14 días, tope propio de 25, aparte del de pendientes', function () {
	$args = tc_closed_query_args( 1_000_000_000 );
	eq( $args['status'], array( 'cancelled', 'failed' ) );
	eq( $args['payment_method'], 'woo-mercado-pago-basic' );
	eq( $args['limit'], 25 );
	eq( $args['date_created'], '>' . ( 1_000_000_000 - 14 * 86400 ) );
	eq( $args['return'], 'ids' );
	eq( $args['type'], 'shop_order' );
	ok( ! in_array( 'refunded', $args['status'], true ), 'un reembolsado con pago aprobado es lo normal' );
	ok( array() === array_intersect( $args['status'], tc_pending_query_args( 1_000_000_000 )['status'] ), 'sin solaparse con los pendientes' );
} );

foreach ( array( 'cancelled', 'failed' ) as $tc_status ) {
	t( "pago aprobado muy tarde (3 días después) en pedido {$tc_status}: avisa y NUNCA llama a payment_complete, en real", function () use ( $tc_status ) {
		$late = payment( array( 'date_created' => iso( TC_TEST_ORDER + 3 * 86400 ), 'date_approved' => iso( TC_TEST_ORDER + 3 * 86400 + 30 ) ) );
		list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => $tc_status ) ) ), 'payments' => array( $late ), 'now' => TC_TEST_ORDER + 4 * 86400 ), false );
		eq( array( $r['result'], $r['reason'], $r['alert'] ), array( 'skipped', "approved_payment_on_{$tc_status}", 'sent' ) );
		eq( writes( $st ), array( "alert:approved_payment_on_{$tc_status}" ) );
		foreach ( $st->calls as $call ) {
			ok( 0 !== strpos( $call, 'complete' ) && 0 !== strpos( $call, 'meta' ) && 0 !== strpos( $call, 'note' ), "no debe escribir: {$call}" );
		}
	} );
}

t( 'pedido cerrado sin pago aprobado ni pagos: se consulta una vez, no se avisa ni escribe', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array() ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
	eq( array( mp_calls( $st ), writes( $st ) ), array( 1, array() ) );
} );

t( 'pedido cerrado ya avisado: sin consulta a Mercado Pago en el siguiente barrido (precheck puro)', function () {
	eq( tc_precheck( order( array( 'status' => 'failed', 'alerted' => true ) ) ), array( 'result' => 'skipped', 'reason' => 'already_alerted', 'status' => 'failed' ) );
	eq( tc_precheck( order( array( 'status' => 'failed' ) ) ), null );
	// Un pendiente ya avisado (revisión) sí se vuelve a consultar: puede resolverse.
	eq( tc_precheck( order( array( 'status' => 'pending', 'alerted' => true ) ) ), null );
} );

t( 'carrera de cancelación: el pedido pasa a failed entre lecturas; si ya estaba avisado no se repite', function () {
	$reads = array( order(), order( array( 'status' => 'failed', 'alerted' => true ) ) );
	list( $r, $st ) = run( array( 'reads' => $reads, 'payments' => array( payment() ) ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'already_alerted' ) );
	eq( writes( $st ), array() );
} );

t( 'en simulación la carrera no se alcanza: se informa would_mark_paid y no se lee, avisa ni escribe nada más', function () {
	list( $r, $st ) = run( array( 'reads' => array( order(), order( array( 'status' => 'failed' ) ) ), 'payments' => array( payment() ) ), true );
	eq( $r['result'], 'would_mark_paid' );
	eq( writes( $st ), array() );
	eq( $st->reads, 1 );
} );

t( 'pago tardío en pedido pendiente (aprobado hace días): sí se concilia, con las mismas validaciones', function () {
	$late = payment( array( 'date_created' => iso( TC_TEST_ORDER + 3 * 86400 ), 'date_approved' => iso( TC_TEST_ORDER + 3 * 86400 + 30 ) ) );
	list( $r ) = run( array( 'payments' => array( $late ), 'now' => TC_TEST_ORDER + 4 * 86400 ) );
	eq( array( $r['result'], $r['payment_id'] ), array( 'marked_paid', '777' ) );
	$wrong = $late;
	$wrong['transaction_amount'] = 1;
	list( $r, $st ) = run( array( 'payments' => array( $wrong ), 'now' => TC_TEST_ORDER + 4 * 86400 ) );
	eq( $r['reason'], 'amount_mismatch' );
	ok( ! in_array( 'complete:31:777', $st->calls, true ), 'no debe completar' );
} );

/* ---------------- E: espaciado de la reconsulta de pedidos cerrados sin pago aprobado ---------------- */

/** Llamadas de la forma "checked:<hora>". */
function checks( $st ): array {
	return array_values( array_filter( $st->calls, function ( $c ) {
		return 0 === strpos( $c, 'checked:' );
	} ) );
}

t( 'espaciado: sin marca válida (ausente, 0, negativa, no entera o en el futuro) siempre toca consultar', function () {
	$now = 2_000_000_000;
	foreach ( array( null, 0, -5, '1999999999', 1.5, $now + 1 ) as $bad ) {
		eq( tc_closed_recheck_due( order( array( 'status' => 'cancelled', 'created' => $now - 100, 'closed_checked' => $bad ) ), $now ), true, var_export( $bad, true ) );
	}
	eq( tc_closed_recheck_due( order( array( 'status' => 'cancelled', 'created' => $now - 100 ) ), $now ), true, 'sin la clave' );
} );

t( 'espaciado: pedido reciente (< 24 h) cada 15 min; pedido antiguo cada 6 h; límites exactos', function () {
	$now = 2_000_000_000;
	$fresh = array( 'status' => 'cancelled', 'created' => $now - 3600 );
	eq( tc_closed_recheck_due( order( $fresh + array( 'closed_checked' => $now - 899 ) ), $now ), false, 'reciente a 899 s' );
	eq( tc_closed_recheck_due( order( $fresh + array( 'closed_checked' => $now - 900 ) ), $now ), true, 'reciente a 900 s' );
	$old = array( 'status' => 'failed', 'created' => $now - 3 * 86400 );
	eq( tc_closed_recheck_due( order( $old + array( 'closed_checked' => $now - 899 ) ), $now ), false, 'antiguo a 899 s' );
	eq( tc_closed_recheck_due( order( $old + array( 'closed_checked' => $now - 21599 ) ), $now ), false, 'antiguo a 21599 s' );
	eq( tc_closed_recheck_due( order( $old + array( 'closed_checked' => $now - 21600 ) ), $now ), true, 'antiguo a 6 h' );
	// El borde de las 24 h: a 86399 s sigue siendo reciente; a 86400 s ya es antiguo.
	eq( tc_closed_recheck_due( order( array( 'created' => $now - 86399, 'closed_checked' => $now - 1000 ) ), $now ), true, 'reciente: 1000 s ≥ 900' );
	eq( tc_closed_recheck_due( order( array( 'created' => $now - 86400, 'closed_checked' => $now - 1000 ) ), $now ), false, 'antiguo: 1000 s < 6 h' );
	// Sin fecha de creación legible: intervalo corto (el más cauto).
	eq( tc_closed_recheck_due( order( array( 'created' => null, 'closed_checked' => $now - 1000 ) ), $now ), true );
} );

t( 'espaciado: pedido cerrado revisado hace poco no consulta a Mercado Pago (aunque haya un pago aprobado esperando)', function () {
	$o = order( array( 'status' => 'cancelled', 'closed_checked' => TC_TEST_NOW - 60 ) );
	list( $r, $st ) = run( array( 'reads' => array( $o ), 'payments' => array( payment() ) ) );
	eq( $r, array( 'result' => 'skipped', 'reason' => 'recently_checked', 'status' => 'cancelled' ) );
	eq( array( mp_calls( $st ), writes( $st ) ), array( 0, array() ) );
} );

t( 'espaciado: pago tardío dentro de la ventana de revisión: al vencer el intervalo se consulta y se avisa', function () {
	// Revisado hace 20 min (> 15 min) en un pedido de 1 h: toca consultar y ahora hay un pago aprobado.
	$o = order( array( 'status' => 'cancelled', 'closed_checked' => TC_TEST_NOW - 1200, 'created' => TC_TEST_NOW - 3600 ) );
	list( $r, $st ) = run( array( 'reads' => array( $o ), 'payments' => array( payment( array( 'date_created' => iso( TC_TEST_NOW - 600 ), 'date_approved' => iso( TC_TEST_NOW - 590 ) ) ) ) ) );
	eq( array( $r['reason'], $r['alert'] ), array( 'approved_payment_on_cancelled', 'sent' ) );
	eq( writes( $st ), array( 'alert:approved_payment_on_cancelled' ) );
	eq( checks( $st ), array(), 'con pago aprobado no se marca como limpio' );
	// Pedido de 5 días revisado hace 7 h (> 6 h): también se consulta.
	$o = order( array( 'status' => 'failed', 'created' => TC_TEST_NOW - 5 * 86400, 'closed_checked' => TC_TEST_NOW - 7 * 3600 ) );
	list( $r ) = run( array( 'reads' => array( $o ), 'payments' => array( payment( array( 'date_created' => iso( TC_TEST_NOW - 600 ), 'date_approved' => iso( TC_TEST_NOW - 590 ) ) ) ) ) );
	eq( $r['reason'], 'approved_payment_on_failed' );
} );

t( 'espaciado: cerrado sin pago aprobado → se anota la hora (solo fuera de simulación); no escribe nada más', function () {
	foreach ( array( array(), array( payment( array( 'status' => 'rejected' ) ) ), array( old_payment() ) ) as $payments ) {
		list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => $payments ) );
		eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
		eq( checks( $st ), array( 'checked:' . TC_TEST_NOW ) );
		eq( writes( $st ), array() );
	}
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'failed' ) ) ), 'payments' => array() ), true );
	eq( $r['reason'], 'status_not_payable' );
	eq( checks( $st ), array(), 'en simulación no se escribe la marca' );
	eq( mp_calls( $st ), 1 );
} );

t( 'espaciado: no se anota cuando hubo error de Mercado Pago, aviso, pedido pendiente o pedido pagado', function () {
	list( , $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => null ) );
	eq( checks( $st ), array(), 'mp_error' );
	list( , $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array( payment() ) ) );
	eq( checks( $st ), array(), 'con aviso' );
	list( , $st ) = run( array( 'payments' => array() ) );
	eq( checks( $st ), array(), 'pendiente' );
	list( , $st ) = run( array( 'reads' => array( order( array( 'status' => 'processing' ) ) ) ) );
	eq( checks( $st ), array(), 'ya pagado' );
	list( , $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled', 'alerted' => true ) ) ), 'payments' => array() ) );
	eq( array( mp_calls( $st ), checks( $st ) ), array( 0, array() ), 'ya avisado: ni consulta ni marca' );
} );

t( 'espaciado: nunca reactiva — un cerrado con marca vencida y pago aprobado no llama a payment_complete ni en real', function () {
	$o = order( array( 'status' => 'cancelled', 'closed_checked' => 1, 'created' => TC_TEST_NOW - 3600 ) );
	list( , $st ) = run( array( 'reads' => array( $o ), 'payments' => array( payment() ) ), false );
	foreach ( $st->calls as $call ) {
		ok( 0 !== strpos( $call, 'complete' ) && 0 !== strpos( $call, 'meta' ) && 0 !== strpos( $call, 'note' ), "no debe escribir: {$call}" );
	}
} );

t( 'espaciado: si no se puede guardar la marca, el resultado no cambia y se registra sin el mensaje de la excepción', function () {
	list( $r, $st ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array(), 'mark_throws' => true ) );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
	eq( count( $st->logs ), 1 );
	ok( false !== strpos( $st->logs[0], 'pedido #31' ) && false === strpos( $st->logs[0], 'ECONNREFUSED' ) && false === strpos( $st->logs[0], 'secreto' ), 'sin el mensaje libre' );
	eq( end( $st->calls ), 'unlock' );
	// Sin la dependencia (versión antigua de las dependencias) tampoco falla.
	list( $r ) = run( array( 'reads' => array( order( array( 'status' => 'cancelled' ) ) ), 'payments' => array(), 'no_mark' => true ) );
	eq( $r['reason'], 'status_not_payable' );
} );

t( 'espaciado: el pedido pendiente no se espacia (marca ignorada) y sigue conciliándose', function () {
	list( $r ) = run( array( 'reads' => array( order( array( 'closed_checked' => TC_TEST_NOW - 10 ) ) ), 'payments' => array( payment() ) ) );
	eq( $r['result'], 'marked_paid' );
} );

t( 'registro del cron: lo ya avisado o revisado hace poco se cuenta pero no genera línea', function () {
	eq( tc_is_quiet_result( array( 'result' => 'skipped', 'reason' => 'already_alerted' ) ), true );
	eq( tc_is_quiet_result( array( 'result' => 'skipped', 'reason' => 'recently_checked' ) ), true );
	foreach ( array(
		array( 'result' => 'skipped', 'reason' => 'approved_payment_on_cancelled' ),
		array( 'result' => 'skipped', 'reason' => 'status_not_payable' ),
		array( 'result' => 'pending', 'reason' => 'recently_checked' ),
		array( 'result' => 'error', 'reason' => 'mp_error' ),
		array( 'result' => 'review', 'reason' => 'amount_mismatch' ),
		array(),
	) as $loud ) {
		eq( tc_is_quiet_result( $loud ), false, json_encode( $loud ) );
	}
	$cron = file_get_contents( __DIR__ . '/../cron/tc-cron.php' );
	ok( false !== strpos( $cron, 'tc_is_quiet_result' ) && false !== strpos( $cron, "' silenciados='" ), 'el cron usa el filtro y lo informa en la cabecera' );
} );

/* ---------------- D: validación estricta del vendedor ---------------- */

t( 'vendedor: salto de línea o espacios en TC_MP_SELLER_ID o en la respuesta → inválido, no "válido pero distinto"', function () {
	foreach ( array( "123\n", "123\r\n", "123 ", " 123", "123\t", "1\n23", "+123", "１２３", "123abc", "0x1F", "1e3", "١٢٣" ) as $bad ) {
		eq( tc_normalize_seller_id( $bad ), false, json_encode( $bad ) );
		eq( tc_verify_seller( me( 200, '{"id":5}' ), $bad, true ), array( 'ok' => false, 'state' => 'invalid_config', 'reason' => 'seller_config_invalid' ), json_encode( $bad ) );
		eq( tc_parse_mp_me( 200, json_encode( array( 'id' => $bad ) ) ), array( 'error' => 'seller_check_failed' ), 'respuesta ' . json_encode( $bad ) );
	}
	eq( tc_normalize_seller_id( '123' ), '123' );
} );

t( 'vendedor: ids enteros grandes — hasta 20 dígitos como texto; float, exponente o más de 20 dígitos se rechazan', function () {
	// Cabe en un entero de 64 bits.
	eq( tc_parse_mp_me( 200, '{"id":9223372036854775807}' ), array( 'id' => '9223372036854775807' ) );
	// No cabe en un entero de PHP: llega como texto de dígitos (JSON_BIGINT_AS_STRING), sin pasar por float.
	eq( tc_parse_mp_me( 200, '{"id":18446744073709551615}' ), array( 'id' => '18446744073709551615' ) );
	eq( tc_normalize_seller_id( '18446744073709551615' ), '18446744073709551615' );
	eq( tc_verify_seller( me( 200, '{"id":18446744073709551615}' ), '18446744073709551615', false ), array( 'ok' => true, 'state' => 'match' ) );
	// Un id grande y otro que difiere solo en el último dígito no se confunden (con float se redondearían al mismo valor).
	eq( tc_verify_seller( me( 200, '{"id":18446744073709551615}' ), '18446744073709551614', false )['reason'], 'seller_mismatch' );
	foreach ( array( '{"id":123456789012345678901}', '{"id":1.5}', '{"id":3766617598.0}', '{"id":1e10}', '{"id":-5}', '{"id":0}', '{"id":true}', '{"id":null}', '{"id":""}' ) as $body ) {
		eq( tc_parse_mp_me( 200, $body ), array( 'error' => 'seller_check_failed' ), $body );
	}
	eq( tc_normalize_seller_id( '123456789012345678901' ), false, '21 dígitos' );
	eq( tc_normalize_seller_id( 1.0 ), false, 'float' );
} );

/* ---------------- C2: identidad del vendedor ---------------- */

/** Respuesta simulada de GET /users/me. */
function me( int $code, string $body ): callable {
	return function () use ( $code, $body ) {
		return array( 'code' => $code, 'body' => $body );
	};
}

t( 'TC_MP_SELLER_ID: acepta entero o texto de dígitos; null si falta; false si es inválido', function () {
	eq( tc_normalize_seller_id( '3766617598' ), '3766617598' );
	eq( tc_normalize_seller_id( 3766617598 ), '3766617598' );
	eq( tc_normalize_seller_id( null ), null );
	eq( tc_normalize_seller_id( '' ), null );
	foreach ( array( '0', '-5', '12a', ' 123', '1.5', 1.5, 0, -1, true, array( 1 ), '0123' ) as $bad ) {
		eq( tc_normalize_seller_id( $bad ), false, var_export( $bad, true ) );
	}
} );

t( 'GET /users/me: lee el id; 401 y 403 son seller_unauthorized; el resto, seller_check_failed; nunca devuelve el cuerpo', function () {
	eq( tc_parse_mp_me( 200, '{"id":3766617598,"nickname":"TESTUSER","email":"x@y.cl"}' ), array( 'id' => '3766617598' ) );
	eq( tc_parse_mp_me( 200, '{"id":"3766617598"}' ), array( 'id' => '3766617598' ) );
	eq( tc_parse_mp_me( 401, '{"message":"invalid access token"}' ), array( 'error' => 'seller_unauthorized' ) );
	eq( tc_parse_mp_me( 403, '{}' ), array( 'error' => 'seller_unauthorized' ) );
	foreach ( array( array( 500, '{"id":1}' ), array( 404, '' ), array( 200, 'no-json' ), array( 200, '{}' ), array( 200, '{"id":0}' ), array( 200, '{"id":"abc"}' ), array( 200, '{"id":[1]}' ), array( 200, '[]' ) ) as $c ) {
		eq( tc_parse_mp_me( $c[0], $c[1] ), array( 'error' => 'seller_check_failed' ), json_encode( $c ) );
	}
	ok( false === strpos( json_encode( tc_parse_mp_me( 200, '{"id":5,"email":"x@y.cl"}' ) ), '@' ), 'sin datos del vendedor' );
	eq( tc_mp_me_url(), 'https://api.mercadopago.com/users/me' );
} );

t( 'vendedor: coincide → ok; no coincide → seller_mismatch, tanto en simulación como en real', function () {
	foreach ( array( true, false ) as $dry ) {
		eq( tc_verify_seller( me( 200, '{"id":3766617598}' ), '3766617598', $dry ), array( 'ok' => true, 'state' => 'match' ) );
		eq( tc_verify_seller( me( 200, '{"id":999}' ), '3766617598', $dry ), array( 'ok' => false, 'state' => 'mismatch', 'reason' => 'seller_mismatch' ) );
	}
	eq( tc_verify_seller( me( 200, '{"id":3766617598}' ), 3766617598, false )['ok'], true, 'configurado como entero' );
} );

t( 'vendedor sin configurar: solo se sigue en simulación; para escribir se exige', function () {
	eq( tc_verify_seller( me( 200, '{"id":5}' ), null, true ), array( 'ok' => true, 'state' => 'unconfigured' ) );
	eq( tc_verify_seller( me( 200, '{"id":5}' ), '', false ), array( 'ok' => false, 'state' => 'unconfigured', 'reason' => 'seller_not_configured' ) );
} );

t( 'vendedor: configuración inválida, token rechazado, error del servidor, red caída o excepción → no ok y sin llamar a la red si la config es inválida', function () {
	$calls = 0;
	$spy   = function () use ( &$calls ) {
		$calls++;
		return array( 'code' => 200, 'body' => '{"id":5}' );
	};
	eq( tc_verify_seller( $spy, '12a', true ), array( 'ok' => false, 'state' => 'invalid_config', 'reason' => 'seller_config_invalid' ) );
	eq( $calls, 0, 'no consulta con una configuración inválida' );
	foreach ( array( true, false ) as $dry ) {
		eq( tc_verify_seller( me( 401, '{}' ), '5', $dry )['reason'], 'seller_unauthorized' );
		eq( tc_verify_seller( me( 500, '{}' ), '5', $dry )['reason'], 'seller_check_failed' );
		eq( tc_verify_seller( me( 200, 'basura' ), '5', $dry )['reason'], 'seller_check_failed' );
		eq( tc_verify_seller( function () {
			return null;
		}, '5', $dry ), array( 'ok' => false, 'state' => 'unverifiable', 'reason' => 'seller_check_failed' ) );
		eq( tc_verify_seller( function () {
			throw new RuntimeException( 'Bearer SECRETO' );
		}, '5', $dry )['ok'], false );
		// Sin configurar y sin poder verificar el token: tampoco se sigue en simulación.
		eq( tc_verify_seller( me( 401, '{}' ), null, $dry )['ok'], false );
	}
} );

t( 'el resultado de la verificación del vendedor no contiene ids, tokens ni cuerpos', function () {
	$out = json_encode( array(
		tc_verify_seller( me( 200, '{"id":3766617598,"email":"x@y.cl","token":"APP_USR-secreto"}' ), '111', false ),
		tc_verify_seller( me( 200, '{"id":3766617598,"email":"x@y.cl","token":"APP_USR-secreto"}' ), '3766617598', false ),
		tc_verify_seller( me( 500, 'APP_USR-secreto' ), '111', false ),
	) );
	foreach ( array( '3766617598', '111', '@', 'APP_USR', 'secreto' ) as $needle ) {
		ok( false === strpos( $out, $needle ), "no debe contener {$needle}" );
	}
} );

/* ---------------- C3: registro de errores sin datos sensibles ---------------- */

t( 'resumen de excepción: código propio o archivo y línea; nunca el mensaje libre', function () {
	eq( tc_exception_summary( new RuntimeException( 'stale_order' ) ), 'RuntimeException:stale_order' );
	eq( tc_exception_summary( new RuntimeException( 'order_missing' ) ), 'RuntimeException:order_missing' );
	$free = tc_exception_summary( new RuntimeException( 'ECONNREFUSED tienda.example ck_test comprador@example.com' ) );
	ok( 1 === preg_match( '/^RuntimeException@decide-test\.php:\d+$/', $free ), "formato: {$free}" );
	$other = tc_exception_summary( new InvalidArgumentException( 'stale_order' ) );
	ok( 0 === strpos( $other, 'InvalidArgumentException@' ), 'solo los RuntimeException con código propio muestran el mensaje' );
} );

t( 'excepción inesperada: se registra el pedido y la clase, sin el mensaje (que puede traer credenciales); el resultado no cambia', function () {
	list( $r, $st ) = run( array( 'throw_on_read' => true ) );
	eq( $r, array( 'result' => 'error', 'reason' => 'unexpected' ) );
	eq( count( $st->logs ), 1 );
	ok( false !== strpos( $st->logs[0], 'pedido #31' ) && false !== strpos( $st->logs[0], 'RuntimeException@decide-test.php:' ), 'pedido y clase' );
	foreach ( array( 'ECONNREFUSED', 'ck_test', 'tienda.example' ) as $secret ) {
		ok( false === strpos( $st->logs[0], $secret ), "no debe registrar {$secret}" );
	}
	eq( end( $st->calls ), 'unlock' );
} );

t( 'error de Mercado Pago: se registra mp_error con el pedido, sin referencias ni cuerpos', function () {
	list( $r, $st ) = run( array( 'payments' => null ) );
	eq( $r, array( 'result' => 'error', 'reason' => 'mp_error' ) );
	eq( $st->logs, array( 'pedido #31: la consulta a Mercado Pago falló (mp_error)' ) );
} );

t( 'estado inesperado tras payment_complete: se registra con el estado y el id del pago', function () {
	list( $r, $st ) = run( array( 'payments' => array( payment() ), 'after_complete' => 'on-hold' ) );
	eq( $r['reason'], 'unexpected_status_after_payment' );
	eq( $st->logs, array( 'pedido #31: estado inesperado "on-hold" tras payment_complete (pago 777)' ) );
} );

t( 'si el registro falla, o no existe, la conciliación no cambia de resultado', function () {
	list( $r, $st ) = run( array( 'throw_on_read' => true, 'log_throws' => true ) );
	eq( $r, array( 'result' => 'error', 'reason' => 'unexpected' ) );
	eq( end( $st->calls ), 'unlock' );
	list( $r ) = run( array( 'payments' => null, 'no_log' => true ) );
	eq( $r['reason'], 'mp_error' );
} );

t( 'resultados normales no escriben en el registro de errores', function () {
	foreach ( array( array( 'payments' => array( payment() ) ), array( 'payments' => array() ), array( 'payments' => array( payment( array( 'transaction_amount' => 1 ) ) ) ) ) as $s ) {
		list( , $st ) = run( $s );
		eq( $st->logs, array() );
	}
} );

t( 'comprobación estática: ninguna línea de registro menciona el token; el barrido verifica al vendedor antes de listar pedidos', function () {
	$src = str_replace( "\r\n", "\n", file_get_contents( __DIR__ . '/../tienda-conciliacion/includes/reconcile.php' ) );
	foreach ( explode( "\n", $src ) as $line ) {
		if ( false !== strpos( $line, 'error_log(' ) || false !== strpos( $line, 'tc_wp_log(' ) || false !== strpos( $line, 'tc_log(' ) ) {
			ok( false === strpos( $line, 'ACCESS_TOKEN' ) && false === strpos( $line, 'getMessage' ) && false === strpos( $line, 'SELLER_ID' ), 'línea de registro con dato sensible: ' . trim( $line ) );
		}
	}
	$body = substr( $src, strpos( $src, 'function tc_reconcile_pending' ) );
	$body = substr( $body, 0, strpos( $body, "\n}\n" ) );
	$verify = strpos( $body, 'tc_wp_verify_seller' );
	$list   = strpos( $body, 'wc_get_orders' );
	ok( false !== $verify && false !== $list && $verify < $list, 'la verificación debe ir antes de wc_get_orders' );
	$cron = file_get_contents( __DIR__ . '/../cron/tc-cron.php' );
	ok( false !== strpos( $cron, "' vendedor=' . \$tc_run['seller']" ), 'el cron registra el estado del vendedor' );
} );

/* ---------------- Orquestador de WordPress con funciones simuladas (sin WordPress ni red) ---------------- */

// Dobles mínimos de WordPress y WooCommerce, sin red y sin base de datos. NO sustituyen una prueba real: solo comprueban
// que nuestro código llama a WooCommerce como se espera (qué métodos, en qué orden y con qué argumentos); no prueban lo
// que WooCommerce hace por dentro (stock, correos de transición, cachés). wp_remote_get registra la URL y si llevó
// credencial, nunca el valor. wp_mail solo anota que se pidió un envío. El token es ficticio.
// TC_DRY_RUN NO se define: debe regir la simulación por defecto.
define( 'DB_NAME', 'prueba' );
define( 'TC_MP_ACCESS_TOKEN', 'TOKEN-FICTICIO-DE-PRUEBA' );
define( 'TC_MP_SELLER_ID', '111' );
$GLOBALS['tc_http']     = array();
$GLOBALS['tc_me']       = array( 'code' => 200, 'body' => '{"id":111}' );
$GLOBALS['tc_wc']       = array();
$GLOBALS['tc_orders']   = array(); // id => WC_Order simulado
$GLOBALS['tc_db']       = array(); // id => estado "real" en la base de datos (sin wc-)
$GLOBALS['tc_payments'] = array(); // referencia => lista de pagos que devuelve la búsqueda
$GLOBALS['tc_net_error'] = false;  // la búsqueda de pagos (no /users/me) falla por red
$GLOBALS['tc_ev']       = array(); // eventos en orden: meta:<clave>, note, mail, complete:<id de pago>
$GLOBALS['wpdb']        = new class() {
	public $prefix = 'wp_';
	public $posts  = 'wp_posts';
	public function prepare( $q, ...$args ) {
		return $q . '|' . implode( ',', $args );
	}
	public function get_var( $q ) {
		if ( false !== strpos( $q, 'GET_LOCK' ) ) {
			return '1';
		}
		if ( false !== strpos( $q, 'post_status' ) && preg_match( '/\|(\d+)$/', $q, $m ) ) {
			return isset( $GLOBALS['tc_db'][ (int) $m[1] ] ) ? 'wc-' . $GLOBALS['tc_db'][ (int) $m[1] ] : null;
		}
		return null;
	}
	public function query( $q ) {
		return 1;
	}
};
class WP_Error {
	private $code;
	public function __construct( $code ) {
		$this->code = $code;
	}
	public function get_error_code() {
		return $this->code;
	}
}
/** Pedido de WooCommerce simulado: solo los métodos que usa el plugin. */
class WC_Order {
	public $id;
	public $status;
	public $created;
	public $total;
	public $meta  = array();
	public $notes = array();
	public function __construct( int $id, string $status, int $created, string $total ) {
		$this->id      = $id;
		$this->status  = $status;
		$this->created = $created;
		$this->total   = $total;
	}
	public function get_id() {
		return $this->id;
	}
	public function get_date_created() {
		return new DateTimeImmutable( '@' . $this->created );
	}
	public function get_status() {
		return $this->status;
	}
	public function get_total() {
		return $this->total;
	}
	public function get_currency() {
		return 'CLP';
	}
	public function get_payment_method() {
		return 'woo-mercado-pago-basic';
	}
	public function get_meta( $key, $single = true ) {
		return $this->meta[ $key ] ?? '';
	}
	public function update_meta_data( $key, $value ) {
		$GLOBALS['tc_ev'][] = 'meta:' . $key;
		$this->meta[ $key ] = $value;
	}
	public function save_meta_data() {
	}
	public function add_order_note( $note, $customer = 0, $by_user = false ) {
		$GLOBALS['tc_ev'][] = 'note';
		$this->notes[]      = $note;
		return count( $this->notes );
	}
	public function payment_complete( $transaction_id = '' ) {
		$GLOBALS['tc_ev'][]                = 'complete:' . $transaction_id;
		$this->status                      = 'processing';
		$GLOBALS['tc_db'][ $this->id ] = 'processing';
		return true;
	}
}
/** Registra un pedido simulado. $db_status: estado en la base de datos si difiere del objeto (objeto atrasado). */
function tc_add_order( int $id, string $status, int $created, string $total = '1010', ?string $db_status = null ): WC_Order {
	$GLOBALS['tc_db'][ $id ]     = $db_status ?? $status;
	$GLOBALS['tc_orders'][ $id ] = new WC_Order( $id, $status, $created, $total );
	return $GLOBALS['tc_orders'][ $id ];
}
function is_wp_error( $x ) {
	return $x instanceof WP_Error;
}
function wp_remote_get( $url, $args = array() ) {
	$GLOBALS['tc_http'][] = array( 'url' => $url, 'auth' => ( 'Bearer TOKEN-FICTICIO-DE-PRUEBA' === ( $args['headers']['Authorization'] ?? '' ) ) );
	if ( false !== strpos( $url, '/users/me' ) ) {
		return $GLOBALS['tc_me'];
	}
	if ( $GLOBALS['tc_net_error'] ) {
		return new WP_Error( 'http_request_failed' );
	}
	$ref = preg_match( '/external_reference=([^&]+)/', $url, $m ) ? urldecode( $m[1] ) : '';
	return array( 'code' => 200, 'body' => json_encode( array( 'results' => $GLOBALS['tc_payments'][ $ref ] ?? array() ) ) );
}
function wp_remote_retrieve_response_code( $r ) {
	return $r['code'];
}
function wp_remote_retrieve_body( $r ) {
	return $r['body'];
}
function wc_get_orders( $args ) {
	$GLOBALS['tc_wc'][] = $args['status'];
	return in_array( 'pending', $args['status'], true ) ? array( 31, 32 ) : array( 40, 32 );
}
function wc_get_order( $id ) {
	return $GLOBALS['tc_orders'][ $id ] ?? false;
}
function clean_post_cache( $id ) {
}
function get_option( $name ) {
	return 'admin@example.test';
}
function get_bloginfo( $name ) {
	return 'Tienda de prueba';
}
function wp_specialchars_decode( $text ) {
	return $text;
}
function wp_mail( $to, $subject, $message ) {
	$GLOBALS['tc_ev'][] = 'mail';
	return true;
}
/** Cuántas búsquedas de pagos (sin contar /users/me) se han pedido hasta ahora. */
function tc_search_calls(): int {
	return count( array_filter( $GLOBALS['tc_http'], function ( $h ) {
		return false === strpos( $h['url'], '/users/me' );
	} ) );
}

$tc_errlog = tempnam( sys_get_temp_dir(), 'tcerr' );
ini_set( 'error_log', $tc_errlog );

t( 'barrido real: vendedor distinto → no hace nada (ni lista pedidos ni consulta pagos), registra solo el motivo', function () use ( $tc_errlog ) {
	$GLOBALS['tc_http'] = array();
	$GLOBALS['tc_wc']   = array();
	$GLOBALS['tc_me']   = array( 'code' => 200, 'body' => '{"id":222,"email":"x@y.cl"}' );
	$r = tc_reconcile_pending();
	eq( array( $r['ok'], $r['reason'], $r['seller'], $r['items'] ), array( false, 'seller_mismatch', 'mismatch', array() ) );
	eq( $GLOBALS['tc_wc'], array(), 'no lista pedidos' );
	eq( count( $GLOBALS['tc_http'] ), 1, 'solo la verificación' );
	ok( false !== strpos( $GLOBALS['tc_http'][0]['url'], '/users/me' ) && $GLOBALS['tc_http'][0]['auth'], 'GET /users/me con credencial' );
	$log = file_get_contents( $tc_errlog );
	ok( false !== strpos( $log, 'seller_mismatch' ), 'queda el motivo en el registro' );
	foreach ( array( '111', '222', 'TOKEN-FICTICIO', '@' ) as $needle ) {
		ok( false === strpos( $log, $needle ), "el registro no debe contener {$needle}" );
	}
} );

t( 'conciliar un pedido (ruta del navegador) con vendedor distinto: error seller_mismatch y ninguna búsqueda de pagos', function () {
	$GLOBALS['tc_http'] = array();
	$GLOBALS['tc_me']   = array( 'code' => 200, 'body' => '{"id":222}' );
	eq( tc_reconcile_order( 31, false ), array( 'result' => 'error', 'reason' => 'seller_mismatch' ) );
	eq( count( $GLOBALS['tc_http'] ), 1 );
	eq( tc_public_code( array( 'result' => 'error', 'reason' => 'seller_mismatch' ) ), 'pending', 'al navegador no sale el motivo' );
} );

t( 'barrido real: token rechazado o /users/me caído → no hace nada', function () {
	foreach ( array( array( 'code' => 401, 'body' => '{}' ), array( 'code' => 500, 'body' => '' ) ) as $me ) {
		$GLOBALS['tc_wc'] = array();
		$GLOBALS['tc_me'] = $me;
		$r = tc_reconcile_pending();
		eq( array( $r['ok'], $r['items'], $GLOBALS['tc_wc'] ), array( false, array(), array() ) );
	}
} );

t( 'barrido real: vendedor correcto → revisa pendientes y cerrados una sola vez cada uno, en simulación por defecto', function () {
	$GLOBALS['tc_http'] = array();
	$GLOBALS['tc_wc']   = array();
	$GLOBALS['tc_me']   = array( 'code' => 200, 'body' => '{"id":111}' );
	eq( tc_dry_run(), true, 'TC_DRY_RUN sin definir debe ser simulación' );
	$r = tc_reconcile_pending();
	eq( array( $r['ok'], $r['dry_run'], $r['seller'] ), array( true, true, 'match' ) );
	eq( $GLOBALS['tc_wc'], array( array( 'pending', 'on-hold' ), array( 'cancelled', 'failed' ) ) );
	eq( array_column( $r['items'], 'order_id' ), array( 31, 32, 40 ), 'sin repetir el 32' );
	$verifications = array_filter( $GLOBALS['tc_http'], function ( $h ) {
		return false !== strpos( $h['url'], '/users/me' );
	} );
	eq( count( $verifications ), 1, 'una sola verificación por barrido, no una por pedido' );
} );

/* ---- Capa tc_wp_* con dobles de WC_Order (modo real, pero contra dobles: ningún pedido ni pago reales) ---- */

/** Pago aprobado de ejemplo para la referencia WC-<id>, creado y aprobado mucho después de crearse el pedido. */
function wp_payment( int $order_id, int $created, string $pid = '9001', array $over = array() ): array {
	return $over + array(
		'id'                 => $pid,
		'status'             => 'approved',
		'currency_id'        => 'CLP',
		'transaction_amount' => 1010,
		'external_reference' => "WC-{$order_id}",
		'date_created'       => iso( $created + 600 ),
		'date_approved'      => iso( $created + 660 ),
	);
}

/** Cuenta los eventos que empiezan con $prefix. */
function ev_count( string $prefix ): int {
	return count( array_filter( $GLOBALS['tc_ev'], function ( $e ) use ( $prefix ) {
		return 0 === strpos( $e, $prefix );
	} ) );
}

t( 'capa WP, pedido cancelado con pago aprobado: aviso único (marca antes del correo), sin payment_complete; el segundo barrido no consulta', function () {
	$GLOBALS['tc_me']       = array( 'code' => 200, 'body' => '{"id":111}' );
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 51, 'cancelled', $created );
	$GLOBALS['tc_payments'] = array( 'WC-51' => array( wp_payment( 51, $created ) ) );
	$before                 = tc_search_calls();

	$r = tc_reconcile_order( 51, false );
	eq( array( $r['result'], $r['reason'], $r['payment_id'], $r['alert'] ), array( 'skipped', 'approved_payment_on_cancelled', '9001', 'sent' ) );
	eq( $GLOBALS['tc_ev'], array( 'meta:_tc_alerted', 'note', 'mail' ), 'orden: marca, nota, correo' );
	eq( ev_count( 'complete' ), 0, 'nunca payment_complete' );
	eq( array( $o->status, $GLOBALS['tc_db'][51] ), array( 'cancelled', 'cancelled' ), 'el pedido sigue cancelado' );
	ok( '' !== $o->meta['_tc_alerted'], 'marca guardada' );
	eq( tc_search_calls() - $before, 1 );

	$r = tc_reconcile_order( 51, false );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'already_alerted' ) );
	eq( $GLOBALS['tc_ev'], array( 'meta:_tc_alerted', 'note', 'mail' ), 'sin nada nuevo' );
	eq( tc_search_calls() - $before, 1, 'sin nueva consulta a Mercado Pago' );
} );

t( 'capa WP, pedido pendiente con pago aprobado: payment_complete una vez, meta y nota; el segundo intento es already_paid', function () {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 52, 'pending', $created );
	$GLOBALS['tc_payments'] = array( 'WC-52' => array( wp_payment( 52, $created ) ) );

	$r = tc_reconcile_order( 52, false );
	eq( array( $r['result'], $r['status'], $r['payment_id'], $r['note_saved'] ), array( 'marked_paid', 'processing', '9001', true ) );
	eq( $GLOBALS['tc_ev'], array( 'complete:9001', 'meta:_tc_reconciled_payment', 'note' ) );
	eq( $o->meta['_tc_reconciled_payment'], '9001' );
	ok( false !== strpos( $o->notes[0], '9001' ) && false !== strpos( $o->notes[0], '1010' ), 'la nota menciona pago y monto' );

	$r = tc_reconcile_order( 52, false );
	eq( $r['result'], 'already_paid' );
	eq( ev_count( 'complete' ), 1, 'no se repite' );
	eq( ev_count( 'mail' ), 0, 'ni correos desde este código' );
} );

t( 'capa WP, en simulación el pedido pendiente no se toca (ni meta, ni nota, ni payment_complete, ni correo)', function () {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 57, 'pending', $created );
	$GLOBALS['tc_payments'] = array( 'WC-57' => array( wp_payment( 57, $created ) ) );
	$r                      = tc_reconcile_order( 57, true );
	eq( array( $r['result'], $r['payment_id'] ), array( 'would_mark_paid', '9001' ) );
	eq( array( $GLOBALS['tc_ev'], $o->meta, $o->notes, $o->status ), array( array(), array(), array(), 'pending' ) );
} );

t( 'capa WP, objeto atrasado respecto de la base de datos: stale_order, no se llama a payment_complete', function () use ( $tc_errlog ) {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 53, 'pending', $created, '1010', 'on-hold' ); // objeto "pending", base "on-hold"
	$GLOBALS['tc_payments'] = array( 'WC-53' => array( wp_payment( 53, $created ) ) );
	$r                      = tc_reconcile_order( 53, false );
	eq( $r, array( 'result' => 'error', 'reason' => 'unexpected' ) );
	eq( $GLOBALS['tc_ev'], array() );
	eq( array( $o->status, $GLOBALS['tc_db'][53] ), array( 'pending', 'on-hold' ) );
	$log = file_get_contents( $tc_errlog );
	ok( false !== strpos( $log, 'pedido #53: excepción inesperada (RuntimeException:stale_order)' ), 'queda el código en el registro' );
} );

t( 'capa WP, pedido cerrado sin pago aprobado: se anota la hora y no se reconsulta hasta vencer el intervalo; la marca vencida vuelve a consultar', function () {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 54, 'cancelled', $created );
	$GLOBALS['tc_payments'] = array();
	$before                 = tc_search_calls();

	$r = tc_reconcile_order( 54, false );
	eq( array( $r['result'], $r['reason'] ), array( 'skipped', 'status_not_payable' ) );
	ok( (int) $o->meta['_tc_closed_checked'] >= time() - 5, 'hora anotada' );
	eq( ev_count( 'mail' ) + ev_count( 'note' ) + ev_count( 'complete' ), 0, 'sin avisos ni notas' );
	eq( tc_search_calls() - $before, 1 );

	$r = tc_reconcile_order( 54, false );
	eq( $r['reason'], 'recently_checked' );
	eq( tc_search_calls() - $before, 1, 'no vuelve a consultar' );

	// El intervalo vence: ahora aparece un pago tardío y se detecta.
	$o->meta['_tc_closed_checked'] = (string) ( time() - 1000 );
	$GLOBALS['tc_payments']        = array( 'WC-54' => array( wp_payment( 54, $created ) ) );
	$r                             = tc_reconcile_order( 54, false );
	eq( array( $r['reason'], $r['alert'] ), array( 'approved_payment_on_cancelled', 'sent' ) );
	eq( tc_search_calls() - $before, 2 );
	eq( ev_count( 'complete' ), 0 );
	eq( $o->status, 'cancelled' );
} );

t( 'capa WP, en simulación un cerrado no deja marca (se consulta cada vez) pero respeta la que ya exista', function () {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 55, 'failed', $created );
	$GLOBALS['tc_payments'] = array();
	$before                 = tc_search_calls();
	tc_reconcile_order( 55, true );
	tc_reconcile_order( 55, true );
	eq( array( $o->meta, tc_search_calls() - $before, $GLOBALS['tc_ev'] ), array( array(), 2, array() ) );
	$o->meta['_tc_closed_checked'] = (string) ( time() - 30 );
	$r = tc_reconcile_order( 55, true );
	eq( $r['reason'], 'recently_checked' );
} );

t( 'capa WP, error de red al buscar pagos: mp_error, se registra solo el código del error y no se marca nada', function () use ( $tc_errlog ) {
	$GLOBALS['tc_ev']        = array();
	$created                 = time() - 7200;
	$o                       = tc_add_order( 56, 'cancelled', $created );
	$GLOBALS['tc_net_error'] = true;
	$r                       = tc_reconcile_order( 56, false );
	$GLOBALS['tc_net_error'] = false;
	eq( $r, array( 'result' => 'error', 'reason' => 'mp_error' ) );
	eq( array( $o->meta, $GLOBALS['tc_ev'] ), array( array(), array() ) );
	$log = file_get_contents( $tc_errlog );
	ok( false !== strpos( $log, 'error de red http_request_failed' ) && false !== strpos( $log, 'pedido #56: la consulta a Mercado Pago falló' ), 'registrado' );
	ok( false === strpos( $log, 'TOKEN-FICTICIO' ), 'sin el token' );
} );

t( 'capa WP, vendedor distinto: ni siquiera se lee un pedido que existe (cero escrituras)', function () {
	$GLOBALS['tc_ev']       = array();
	$created                = time() - 7200;
	$o                      = tc_add_order( 58, 'pending', $created );
	$GLOBALS['tc_payments'] = array( 'WC-58' => array( wp_payment( 58, $created ) ) );
	$GLOBALS['tc_me']       = array( 'code' => 200, 'body' => '{"id":222}' );
	$before                 = tc_search_calls();
	$r                      = tc_reconcile_order( 58, false );
	$GLOBALS['tc_me']       = array( 'code' => 200, 'body' => '{"id":111}' );
	eq( $r, array( 'result' => 'error', 'reason' => 'seller_mismatch' ) );
	eq( array( $GLOBALS['tc_ev'], $o->meta, $o->status, tc_search_calls() - $before ), array( array(), array(), 'pending', 0 ) );
} );

unlink( $tc_errlog );

echo "\n{$GLOBALS['tc_count']} pruebas, {$GLOBALS['tc_failures']} fallidas\n";
exit( $GLOBALS['tc_failures'] > 0 ? 1 : 0 );
