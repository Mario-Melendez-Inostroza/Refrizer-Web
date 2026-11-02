<?php
/**
 * Decisiones de la conciliación, sin WordPress ni red: traslado de checkOrder + reconcileOrder de api/_lib/reconcile.ts
 * (que queda como especificación). Se prueban con `php wordpress/tests/decide-test.php`.
 *
 * Un pedido se representa como array: id, status (sin "wc-"), total (texto), currency, payment_method, created (timestamp
 * de creación del pedido, int; null si no se pudo leer) y, opcionales, alerted y closed_checked (timestamp del último
 * chequeo sin pago aprobado de un pedido cerrado; 0 o ausente si nunca se hizo).
 * Un pago de Mercado Pago, como lo devuelve /v1/payments/search: id, status, currency_id, transaction_amount,
 * external_reference, date_created y date_approved (ISO 8601 con zona horaria).
 */

defined( 'ABSPATH' ) || exit;

/** Pasarela Checkout Pro del plugin oficial de Mercado Pago. */
const TC_MP_GATEWAY_ID = 'woo-mercado-pago-basic';
/** Estados desde los que se puede conciliar. */
const TC_PAYABLE = array( 'pending', 'on-hold' );
/** Estados que ya cuentan como pagados. */
const TC_PAID = array( 'processing', 'completed' );
/** Estados cerrados: nunca se marcan pagados aunque haya un pago aprobado (el stock ya se repuso). */
const TC_CLOSED = array( 'cancelled', 'refunded', 'failed' );
/** Segundos que un pago puede ser anterior a la creación del pedido y aun así considerarse suyo (desfase de relojes). */
const TC_ORDER_DATE_SKEW = 300;

/**
 * Interpreta una fecha de Mercado Pago como timestamp. Exige formato ISO 8601 completo con zona horaria (Z o ±hh:mm):
 * sin zona la hora sería ambigua. Devuelve null si no cumple o no es una fecha real (p. ej. 30 de febrero).
 */
function tc_parse_mp_date( $value ): ?int {
	if ( ! is_string( $value ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/', $value ) ) {
		return null;
	}
	try {
		$date = new DateTimeImmutable( $value );
	} catch ( \Exception $e ) {
		return null;
	}
	$errors = DateTimeImmutable::getLastErrors();
	if ( is_array( $errors ) && ( $errors['warning_count'] > 0 || $errors['error_count'] > 0 ) ) {
		return null;
	}
	return $date->getTimestamp();
}

/**
 * Timestamps de date_created y date_approved de un pago (los que existan). Devuelve null si no hay ninguna fecha o si
 * alguna de las presentes no se puede leer (sin zona horaria, ilegible): en ese caso no se puede verificar el pago.
 */
function tc_payment_timestamps( array $payment ): ?array {
	$stamps = array();
	foreach ( array( 'date_created', 'date_approved' ) as $field ) {
		$value = $payment[ $field ] ?? null;
		if ( null === $value || '' === $value ) {
			continue;
		}
		$stamp = tc_parse_mp_date( $value );
		if ( null === $stamp ) {
			return null;
		}
		$stamps[] = $stamp;
	}
	return $stamps ? $stamps : null;
}

/**
 * Decide sin consultar a Mercado Pago. Devuelve el resultado final, o null si hace falta buscar los pagos.
 * Los estados cerrados sí consultan: un pago aprobado sobre un pedido cancelado debe avisarse a una persona.
 */
function tc_precheck( array $order ): ?array {
	$status = (string) ( $order['status'] ?? '' );
	if ( in_array( $status, TC_PAID, true ) ) {
		return array( 'result' => 'already_paid', 'status' => $status );
	}
	if ( ( $order['payment_method'] ?? '' ) !== TC_MP_GATEWAY_ID ) {
		return array( 'result' => 'skipped', 'reason' => 'not_mercado_pago', 'status' => $status );
	}
	// Pedido cerrado ya avisado: nunca se va a marcar pagado y el aviso es único, así que no se vuelve a consultar a
	// Mercado Pago en cada barrido (los cerrados se repiten durante 14 días).
	if ( in_array( $status, TC_CLOSED, true ) && ! empty( $order['alerted'] ) ) {
		return array( 'result' => 'skipped', 'reason' => 'already_alerted', 'status' => $status );
	}
	if ( in_array( $status, TC_PAYABLE, true ) || in_array( $status, TC_CLOSED, true ) ) {
		return null;
	}
	return array( 'result' => 'skipped', 'reason' => 'status_not_payable', 'status' => $status );
}

/**
 * Decide qué hacer con un pedido según sus pagos en Mercado Pago.
 * Resultados: already_paid | skipped | pending | review | would_mark_paid. `notify` = avisar a una persona.
 */
function tc_decide( array $order, array $payments, string $prefix ): array {
	$pre = tc_precheck( $order );
	if ( null !== $pre ) {
		return $pre;
	}
	$status    = (string) $order['status'];
	$reference = $prefix . $order['id'];
	$approved  = array_values(
		array_filter(
			$payments,
			function ( $p ) use ( $reference ) {
				return is_array( $p )
					&& (string) ( $p['external_reference'] ?? '' ) === $reference
					&& ( $p['status'] ?? '' ) === 'approved';
			}
		)
	);

	// Guarda de fechas: la referencia WC-<id> puede repetirse (p. ej. tras restaurar una base de datos), y un pago
	// anterior al pedido no puede ser suyo. Sin fecha del pedido, o con fechas de pago no verificables, no se concilia.
	if ( $approved ) {
		$created = $order['created'] ?? null;
		if ( ! is_int( $created ) || $created <= 0 ) {
			return array( 'result' => 'review', 'reason' => 'missing_order_date', 'status' => $status, 'notify' => true );
		}
		$same_order = array();
		foreach ( $approved as $p ) {
			$stamps = tc_payment_timestamps( $p );
			if ( null === $stamps ) {
				return array(
					'result'     => 'review',
					'reason'     => 'payment_date_unreadable',
					'status'     => $status,
					'payment_id' => (string) ( $p['id'] ?? '' ),
					'notify'     => true,
				);
			}
			if ( min( $stamps ) >= $created - TC_ORDER_DATE_SKEW ) {
				$same_order[] = $p;
			}
		}
		$approved = $same_order;
	}

	if ( in_array( $status, TC_CLOSED, true ) ) {
		if ( ! $approved ) {
			return array( 'result' => 'skipped', 'reason' => 'status_not_payable', 'status' => $status );
		}
		return array(
			'result'     => 'skipped',
			'reason'     => 'approved_payment_on_' . $status,
			'status'     => $status,
			'payment_id' => (string) $approved[0]['id'],
			'notify'     => true,
		);
	}

	if ( count( $approved ) === 0 ) {
		// Lista vacía y lista sin pagos aprobados se distinguen: con un token de otra cuenta la búsqueda siempre vuelve vacía.
		$reason = $payments ? 'no_approved_payment' : 'no_payments_found';
		return array( 'result' => 'pending', 'reason' => $reason, 'status' => $status );
	}
	if ( count( $approved ) > 1 ) {
		return array( 'result' => 'review', 'reason' => 'multiple_approved', 'status' => $status, 'notify' => true );
	}

	$payment = $approved[0];
	// Moneda en el pago y en el pedido; monto contra el total del pedido (no el total_price de la Store API, que sale x100).
	if ( ( $payment['currency_id'] ?? '' ) !== 'CLP' || ( $order['currency'] ?? '' ) !== 'CLP' ) {
		return array( 'result' => 'review', 'reason' => 'currency_mismatch', 'status' => $status, 'notify' => true );
	}
	$total    = $order['total'] ?? null;
	$received = $payment['transaction_amount'] ?? null;
	if ( ! is_numeric( $total ) || ! is_numeric( $received ) || (int) round( $total * 100 ) !== (int) round( $received * 100 ) ) {
		return array(
			'result'     => 'review',
			'reason'     => 'amount_mismatch',
			'status'     => $status,
			'payment_id' => (string) $payment['id'],
			'expected'   => is_numeric( $total ) ? $total + 0 : null,
			'received'   => is_numeric( $received ) ? $received + 0 : null,
			'notify'     => true,
		);
	}

	// Pago aprobado pero con devolución parcial en Mercado Pago: marcarlo pagado sería una conciliación dudosa.
	// Campos según la documentación de Mercado Pago (indicio, sin verificar contra una respuesta real); si faltan, no influyen.
	$refunded = $payment['transaction_amount_refunded'] ?? 0;
	if ( ( is_numeric( $refunded ) && $refunded > 0 ) || ( $payment['status_detail'] ?? '' ) === 'partially_refunded' ) {
		return array( 'result' => 'review', 'reason' => 'refunded_in_mp', 'status' => $status, 'payment_id' => (string) $payment['id'], 'notify' => true );
	}

	return array(
		'result'        => 'would_mark_paid',
		'status'        => $status,
		'payment_id'    => (string) $payment['id'],
		'date_approved' => is_string( $payment['date_approved'] ?? null ) ? $payment['date_approved'] : null,
	);
}

/** Antigüedad mínima del pago aprobado antes de escribir (TC_MIN_AGE_SECONDS). Entero >= 0; si no, 300. 0 la desactiva. */
function tc_min_age( $value ): int {
	if ( is_int( $value ) && $value >= 0 ) {
		return $value;
	}
	return 300;
}

/**
 * ¿El pago lleva aprobado al menos $min_age segundos? Reduce (no elimina) la carrera con el IPN: el más lento medido
 * tardó 124 s (informe §10d). Sin fecha de aprobación legible devuelve false: no se escribe y el cron reintenta.
 */
function tc_payment_old_enough( ?string $date_approved, int $now, int $min_age ): bool {
	if ( 0 === $min_age ) {
		return true;
	}
	if ( null === $date_approved || '' === $date_approved ) {
		return false;
	}
	try {
		$approved = ( new DateTimeImmutable( $date_approved ) )->getTimestamp();
	} catch ( \Exception $e ) {
		return false;
	}
	return $now - $approved >= $min_age;
}

/** Modo simulación: solo el booleano false permite escribir (ni "false", ni 0, ni ""). */
function tc_is_dry_run( $value ): bool {
	return false !== $value;
}

/** Nombres de las constantes obligatorias que faltan. Nunca devuelve valores. */
function tc_missing_config( array $values ): array {
	$missing = array();
	foreach ( array( 'TC_MP_ACCESS_TOKEN' ) as $name ) {
		if ( ! isset( $values[ $name ] ) || ! is_string( $values[ $name ] ) || '' === $values[ $name ] ) {
			$missing[] = $name;
		}
	}
	return $missing;
}

/** Valida el cuerpo de POST /tienda/v1/reconcile. Devuelve id, key y email, o null si algo no cuadra. */
function tc_parse_customer_request( array $body ): ?array {
	$id = $body['orderId'] ?? null;
	if ( is_int( $id ) ) {
		$id = (string) $id;
	}
	if ( ! is_string( $id ) || ! preg_match( '/^\d{1,12}$/', $id ) ) {
		return null;
	}
	if ( ! is_string( $body['orderKey'] ?? null ) || ! is_string( $body['email'] ?? null ) ) {
		return null;
	}
	return array( 'id' => (int) $id, 'key' => $body['orderKey'], 'email' => $body['email'] );
}

/** order_key y email del comprador, en tiempo constante (se comparan hashes para igualar el largo). */
function tc_customer_matches( string $order_key, string $order_email, string $key, string $email ): bool {
	$same = function ( string $a, string $b ): bool {
		return hash_equals( hash( 'sha256', $a ), hash( 'sha256', $b ) );
	};
	$key_ok   = $same( $order_key, $key );
	$email_ok = '' !== $order_email && $same( strtolower( $order_email ), strtolower( $email ) );
	return '' !== $order_key && $key_ok && $email_ok;
}

/** Único código que sale al navegador: sin montos ni motivos. */
function tc_public_code( array $result ): string {
	$r = $result['result'] ?? '';
	return in_array( $r, array( 'not_found', 'already_paid', 'marked_paid', 'try_later' ), true ) ? $r : 'pending';
}

function tc_mp_search_url( string $reference ): string {
	return 'https://api.mercadopago.com/v1/payments/search?external_reference=' . rawurlencode( $reference )
		. '&sort=date_created&criteria=desc&limit=50';
}

/** Respuesta de /v1/payments/search a lista de pagos; null si es un error (código o cuerpo inesperado). */
function tc_parse_mp_response( int $code, string $body ): ?array {
	if ( $code < 200 || $code >= 300 ) {
		return null;
	}
	$json = json_decode( $body, true );
	if ( ! is_array( $json ) || ! isset( $json['results'] ) || ! is_array( $json['results'] ) ) {
		return null;
	}
	return $json['results'];
}

/** Argumentos de wc_get_orders para el barrido: pendientes y en espera, de Mercado Pago, últimos 14 días, máximo 50. */
function tc_pending_query_args( int $now, int $days = 14, int $max = 50 ): array {
	return array(
		'type'           => 'shop_order',
		'status'         => array( 'pending', 'on-hold' ),
		'payment_method' => TC_MP_GATEWAY_ID,
		'date_created'   => '>' . ( $now - $days * 86400 ),
		'limit'          => $max,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'return'         => 'ids',
	);
}

/**
 * Argumentos de wc_get_orders para los pedidos cerrados por los que puede haber llegado un pago tarde: cancelados y
 * fallidos (WooCommerce cancela solo los pedidos sin pagar y el cliente puede pagar después). No incluye reembolsados:
 * un pago aprobado en un pedido reembolsado es lo normal. Consulta aparte y con tope propio para no desplazar a los pendientes.
 * Estos pedidos solo generan un aviso: nunca se marcan pagados.
 */
function tc_closed_query_args( int $now, int $days = 14, int $max = 25 ): array {
	return array(
		'type'           => 'shop_order',
		'status'         => array( 'cancelled', 'failed' ),
		'payment_method' => TC_MP_GATEWAY_ID,
		'date_created'   => '>' . ( $now - $days * 86400 ),
		'limit'          => $max,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'return'         => 'ids',
	);
}

/** Un pedido cerrado cuyo último chequeo no encontró pago aprobado se vuelve a consultar así de seguido mientras es reciente... */
const TC_CLOSED_RECHECK_FRESH = 900;
/** ...y así de seguido cuando ya pasó TC_CLOSED_FRESH_WINDOW desde que se creó el pedido. */
const TC_CLOSED_RECHECK_OLD = 21600;
/** Segundos desde la creación del pedido durante los que se usa el intervalo corto. */
const TC_CLOSED_FRESH_WINDOW = 86400;

/**
 * ¿Toca volver a consultar a Mercado Pago por un pedido cancelado o fallido? Sin esto, un pedido que nunca se pagó se
 * consultaría en cada pasada (cada 5 min) durante los 14 días de revisión.
 *
 * Solo se espacian los pedidos cuyo último chequeo (closed_checked, timestamp) no encontró ningún pago aprobado; los
 * avisados ya no se consultan (tc_precheck) y los errores de Mercado Pago no dejan marca, así que se reintentan en la
 * siguiente pasada. Un pago tardío se sigue detectando dentro de los 14 días: cada 15 min el primer día y cada 6 h después,
 * más los 5 min del cron. Sin marca válida (ausente, no positiva o en el futuro) siempre toca consultar.
 * Un pedido sin fecha de creación legible usa el intervalo corto.
 */
function tc_closed_recheck_due( array $order, int $now ): bool {
	$checked = $order['closed_checked'] ?? null;
	if ( ! is_int( $checked ) || $checked <= 0 || $checked > $now ) {
		return true;
	}
	$created  = $order['created'] ?? null;
	$old      = is_int( $created ) && $created > 0 && $now - $created >= TC_CLOSED_FRESH_WINDOW;
	$interval = $old ? TC_CLOSED_RECHECK_OLD : TC_CLOSED_RECHECK_FRESH;
	return $now - $checked >= $interval;
}

/** Resultados que el cron cuenta pero no escribe línea por línea (se repetirían durante días): ya avisado o revisado hace poco. */
function tc_is_quiet_result( array $result ): bool {
	return 'skipped' === ( $result['result'] ?? '' ) && in_array( $result['reason'] ?? '', array( 'already_alerted', 'recently_checked' ), true );
}

/** Dirección que identifica al vendedor dueño del token (campo id de la respuesta). */
function tc_mp_me_url(): string {
	return 'https://api.mercadopago.com/users/me';
}

/** TC_MP_SELLER_ID como texto de dígitos (acepta entero o texto de dígitos); null si no está definido; false si no es válido. */
function tc_normalize_seller_id( $value ) {
	if ( null === $value || '' === $value ) {
		return null;
	}
	if ( is_int( $value ) && $value > 0 ) {
		return (string) $value;
	}
	// Modificador D: sin él, "$" aceptaría un salto de línea final ("123\n") y la configuración pasaría por válida.
	if ( is_string( $value ) && preg_match( '/^[1-9]\d{0,19}$/D', $value ) ) {
		return $value;
	}
	return false;
}

/** Respuesta de GET /users/me: array( 'id' => texto de dígitos ) o array( 'error' => motivo ). Nunca incluye el cuerpo. */
function tc_parse_mp_me( int $code, string $body ): array {
	if ( 401 === $code || 403 === $code ) {
		return array( 'error' => 'seller_unauthorized' );
	}
	if ( $code < 200 || $code >= 300 ) {
		return array( 'error' => 'seller_check_failed' );
	}
	// JSON_BIGINT_AS_STRING: un id que no cabe en un entero de PHP (p. ej. PHP de 32 bits) llega como texto de dígitos
	// y no como float redondeado. Un número con decimales o exponente sigue llegando como float y se rechaza.
	$json = json_decode( $body, true, 512, JSON_BIGINT_AS_STRING );
	$id   = is_array( $json ) ? ( $json['id'] ?? null ) : null;
	if ( is_int( $id ) && $id > 0 ) {
		$id = (string) $id;
	}
	if ( ! is_string( $id ) || ! preg_match( '/^[1-9]\d{0,19}$/D', $id ) ) {
		return array( 'error' => 'seller_check_failed' );
	}
	return array( 'id' => $id );
}

/**
 * Comprueba que el token pertenece al vendedor esperado (TC_MP_SELLER_ID). $fetch devuelve array( code, body ) o null.
 * Devuelve ok, state (match | mismatch | unconfigured | invalid_config | unverifiable) y, si ok es false, reason.
 * Sin TC_MP_SELLER_ID solo se sigue en simulación (no escribe nada); para escribir hace falta configurarlo y que coincida.
 * Nunca devuelve ni registra los ids ni el token: solo el estado.
 */
function tc_verify_seller( callable $fetch, $configured, bool $dry_run ): array {
	$expected = tc_normalize_seller_id( $configured );
	if ( false === $expected ) {
		return array( 'ok' => false, 'state' => 'invalid_config', 'reason' => 'seller_config_invalid' );
	}
	try {
		$raw = $fetch();
	} catch ( \Throwable $e ) {
		$raw = null;
	}
	$me = is_array( $raw ) ? tc_parse_mp_me( (int) ( $raw['code'] ?? 0 ), (string) ( $raw['body'] ?? '' ) ) : array( 'error' => 'seller_check_failed' );
	if ( isset( $me['error'] ) ) {
		return array( 'ok' => false, 'state' => 'unverifiable', 'reason' => $me['error'] );
	}
	if ( null === $expected ) {
		return $dry_run
			? array( 'ok' => true, 'state' => 'unconfigured' )
			: array( 'ok' => false, 'state' => 'unconfigured', 'reason' => 'seller_not_configured' );
	}
	return hash_equals( $expected, $me['id'] )
		? array( 'ok' => true, 'state' => 'match' )
		: array( 'ok' => false, 'state' => 'mismatch', 'reason' => 'seller_mismatch' );
}

/**
 * Resumen de una excepción para el registro, sin datos sensibles: la clase y, si el mensaje es un código propio
 * (RuntimeException con minúsculas y guion bajo, como stale_order), ese código; si no, archivo y línea. Nunca el mensaje libre,
 * que en WooCommerce o en la red podría traer correos, direcciones o credenciales.
 */
function tc_exception_summary( \Throwable $e ): string {
	$class = get_class( $e );
	if ( $e instanceof \RuntimeException && preg_match( '/^[a-z_]{1,40}$/', $e->getMessage() ) ) {
		return $class . ':' . $e->getMessage();
	}
	return $class . '@' . basename( $e->getFile() ) . ':' . $e->getLine();
}

/** Ruta de la Store API: 'order' (/order/{id}), 'private' (carrito y checkout) o null. */
function tc_store_route_kind( string $route ): ?string {
	if ( preg_match( '#^/wc/store(?:/v\d+)?/order/\d+/?$#', $route ) ) {
		return 'order';
	}
	if ( preg_match( '#^/wc/store(?:/v\d+)?/(?:cart|checkout)(?:/.*)?$#', $route ) ) {
		return 'private';
	}
	return null;
}

/**
 * Línea del registro del cron: id, resultado, motivo y, si hay, id del pago (nunca emails, nombres, montos ni tokens).
 * El id del pago se limita a caracteres seguros para que no pueda partir la línea.
 */
function tc_log_line( int $order_id, array $result, string $time ): string {
	$line = sprintf( '%s pedido=%d resultado=%s motivo=%s', $time, $order_id, $result['result'] ?? '-', $result['reason'] ?? '-' );
	$pid  = preg_replace( '/[^0-9A-Za-z_-]/', '', (string) ( $result['payment_id'] ?? '' ) );
	return '' === $pid ? $line : $line . ' pago=' . $pid;
}

function tc_note_text( string $payment_id, $amount ): string {
	return sprintf( 'Conciliado por la función propia: pago %s aprobado en Mercado Pago, monto %s CLP.', $payment_id, $amount );
}

/** Texto del aviso a la persona encargada (nota privada y correo). Sin datos del comprador. */
function tc_alert_text( int $order_id, array $decision ): string {
	$lines = array(
		sprintf( 'Pedido #%d requiere revisión manual (conciliación con Mercado Pago).', $order_id ),
		'Motivo: ' . ( $decision['reason'] ?? '-' ),
	);
	if ( isset( $decision['payment_id'] ) ) {
		$lines[] = 'Pago de Mercado Pago: ' . $decision['payment_id'];
	}
	if ( array_key_exists( 'expected', $decision ) ) {
		$lines[] = sprintf( 'Total del pedido: %s CLP. Monto pagado: %s.', $decision['expected'] ?? '?', $decision['received'] ?? '?' );
	}
	$lines[] = 'No se marcó el pedido como pagado. Revisa el pago en el panel de Mercado Pago antes de tocar el pedido.';
	return implode( "\n", $lines );
}
