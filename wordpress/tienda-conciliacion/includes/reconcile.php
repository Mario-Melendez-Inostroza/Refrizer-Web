<?php
/**
 * Conciliación dentro de WordPress: bloqueo por pedido, Mercado Pago y payment_complete().
 *
 * tc_run_reconcile() recibe sus dependencias como funciones ($deps): los tests le pasan dobles sin WordPress ni red,
 * y tc_wp_deps() las implementa con WooCommerce. Ninguna llama por HTTP al propio WooCommerce.
 */

defined( 'ABSPATH' ) || exit;

/** Valor de una constante de configuración (config.php fuera de public_html, ver config.example.php). */
function tc_const( string $name ) {
	return defined( $name ) ? constant( $name ) : null;
}

function tc_dry_run(): bool {
	return tc_is_dry_run( tc_const( 'TC_DRY_RUN' ) );
}

function tc_reference_prefix(): string {
	$prefix = tc_const( 'TC_REFERENCE_PREFIX' );
	return is_string( $prefix ) && '' !== $prefix ? $prefix : 'WC-';
}

/** Registro de errores relevantes (dependencia opcional 'log'): solo códigos, nunca datos del comprador ni credenciales. */
function tc_log( array $deps, string $message ): void {
	if ( ! isset( $deps['log'] ) ) {
		return;
	}
	try {
		$deps['log']( $message );
	} catch ( \Throwable $e ) {
		// Un fallo al registrar no debe alterar el resultado de la conciliación.
	}
}

/**
 * Guarda la marca "cerrado revisado sin pago aprobado" (dependencia opcional 'mark_checked'). Si no se puede guardar,
 * solo se pierde el espaciado: el pedido se vuelve a consultar en la siguiente pasada.
 */
function tc_mark_checked( array $deps, int $id, int $now ): void {
	if ( ! isset( $deps['mark_checked'] ) ) {
		return;
	}
	try {
		$deps['mark_checked']( $id, $now );
	} catch ( \Throwable $e ) {
		tc_log( $deps, sprintf( 'pedido #%d: no se pudo guardar la marca de revisión (%s)', $id, tc_exception_summary( $e ) ) );
	}
}

/**
 * Concilia un pedido. $deps: lock, unlock, read_order, search_payments, complete, mark_reconciled, add_note, alert, now
 * y, opcionales, log y mark_checked.
 * Con $dry_run no escribe nada: ni el pago, ni notas, ni correos (el resultado dice qué habría hecho).
 * $min_age: segundos que el pago debe llevar aprobado antes de escribir (TC_MIN_AGE_SECONDS).
 * Un pedido cancelado, fallido o reembolsado nunca se marca pagado, aunque haya un pago aprobado: solo se avisa.
 * Un pedido cerrado sin pago aprobado se reconsulta con un intervalo mínimo (tc_closed_recheck_due); la marca solo se
 * guarda fuera de simulación, así que en simulación no hay espaciado propio (sí se respeta la que ya exista).
 */
function tc_run_reconcile( int $id, bool $dry_run, string $prefix, array $deps, int $min_age = 300 ): array {
	if ( ! $deps['lock']( $id ) ) {
		return array( 'result' => 'skipped', 'reason' => 'locked' );
	}
	// Aviso a una persona (una sola vez por pedido; en simulación no se envía). $state: el pedido leído más reciente.
	$with_alert = function ( array $decision, array $state ) use ( $id, $dry_run, $deps ): array {
		if ( empty( $decision['notify'] ) ) {
			return $decision;
		}
		if ( $dry_run ) {
			$decision['alert'] = 'would_send';
		} elseif ( empty( $state['alerted'] ) ) {
			$deps['alert']( $id, $decision );
			$decision['alert'] = 'sent';
		} else {
			$decision['alert'] = 'already_sent';
		}
		return $decision;
	};
	try {
		$order = $deps['read_order']( $id );
		if ( null === $order ) {
			return array( 'result' => 'not_found' );
		}
		$pre = tc_precheck( $order );
		if ( null !== $pre ) {
			return $pre;
		}
		$closed = in_array( $order['status'], TC_CLOSED, true );
		if ( $closed && ! tc_closed_recheck_due( $order, (int) $deps['now']() ) ) {
			return array( 'result' => 'skipped', 'reason' => 'recently_checked', 'status' => $order['status'] );
		}
		$payments = $deps['search_payments']( $prefix . $id );
		if ( null === $payments ) {
			tc_log( $deps, sprintf( 'pedido #%d: la consulta a Mercado Pago falló (mp_error)', $id ) );
			return array( 'result' => 'error', 'reason' => 'mp_error' );
		}
		$decision = $with_alert( tc_decide( $order, $payments, $prefix ), $order );
		// Cerrado y sin pago aprobado (status_not_payable): se anota la hora para no reconsultarlo en cada pasada.
		if ( $closed && ! $dry_run && 'skipped' === $decision['result'] && 'status_not_payable' === ( $decision['reason'] ?? '' ) ) {
			tc_mark_checked( $deps, $id, (int) $deps['now']() );
		}
		// Pago aprobado hace poco: lo normal es que el IPN esté por llegar. No se escribe; la siguiente pasada del cron
		// lo reintenta. Reduce la carrera con el IPN pero no la elimina (un IPN muy tardío, como el del #21, ~54 min).
		if ( 'would_mark_paid' === $decision['result'] && ! tc_payment_old_enough( $decision['date_approved'], (int) $deps['now'](), $min_age ) ) {
			$reason = null === $decision['date_approved'] ? 'missing_date_approved' : 'too_recent';
			return array( 'result' => 'pending', 'reason' => $reason, 'status' => $decision['status'], 'payment_id' => $decision['payment_id'] );
		}
		if ( 'would_mark_paid' !== $decision['result'] || $dry_run ) {
			return $decision;
		}

		// Relectura justo antes de escribir: el aviso real (IPN) pudo llegar mientras se consultaba a Mercado Pago.
		// El IPN del plugin no usa este bloqueo, así que esto achica la ventana de carrera pero no la elimina.
		$fresh = $deps['read_order']( $id );
		if ( null === $fresh ) {
			return array( 'result' => 'not_found' );
		}
		$again = tc_precheck( $fresh );
		if ( null !== $again ) {
			return $again;
		}
		if ( ! in_array( $fresh['status'], TC_PAYABLE, true ) ) {
			// Se cerró (p. ej. cancelación automática) mientras se consultaba a Mercado Pago: con un pago aprobado no se
			// reactiva el pedido, pero sí se avisa a una persona.
			if ( in_array( $fresh['status'], TC_CLOSED, true ) ) {
				return $with_alert( tc_decide( $fresh, $payments, $prefix ), $fresh );
			}
			return array( 'result' => 'skipped', 'reason' => 'status_not_payable', 'status' => $fresh['status'] );
		}

		$payment_id = $decision['payment_id'];
		$deps['complete']( $id, $payment_id );

		// payment_complete() no garantiza el cambio de estado (por ejemplo, si el estado no está entre los válidos):
		// solo se informa éxito si el pedido quedó en processing o completed (los pedidos solo con productos virtuales
		// o descargables pasan directo a completed). Cualquier otro estado es inesperado y se registra.
		$after = $deps['read_order']( $id );
		$status_after = $after['status'] ?? null;
		if ( ! in_array( $status_after, TC_PAID, true ) ) {
			tc_log( $deps, sprintf( 'pedido #%d: estado inesperado "%s" tras payment_complete (pago %s)', $id, (string) ( $status_after ?? 'desconocido' ), $payment_id ) );
			return array( 'result' => 'error', 'reason' => 'unexpected_status_after_payment', 'status' => $status_after, 'payment_id' => $payment_id );
		}
		$deps['mark_reconciled']( $id, $payment_id );
		$note_saved = (bool) $deps['add_note']( $id, tc_note_text( $payment_id, $order['total'] ) );
		return array( 'result' => 'marked_paid', 'status' => $status_after, 'payment_id' => $payment_id, 'note_saved' => $note_saved );
	} catch ( \Throwable $e ) {
		tc_log( $deps, sprintf( 'pedido #%d: excepción inesperada (%s)', $id, tc_exception_summary( $e ) ) );
		return array( 'result' => 'error', 'reason' => 'unexpected' );
	} finally {
		$deps['unlock']( $id );
	}
}

/**
 * Comprueba que el token es del vendedor esperado (TC_MP_SELLER_ID) con GET /users/me. Si falla, deja en el registro de
 * errores de PHP solo el motivo y el estado, nunca los ids ni el token.
 */
function tc_wp_verify_seller( bool $dry_run ): array {
	$seller = tc_verify_seller( 'tc_wp_fetch_me', tc_const( 'TC_MP_SELLER_ID' ), $dry_run );
	if ( ! $seller['ok'] ) {
		tc_wp_log( sprintf( 'verificación del vendedor fallida (%s, estado %s): no se consulta ni se escribe nada', $seller['reason'], $seller['state'] ) );
	}
	return $seller;
}

/**
 * Concilia un pedido con la configuración y las funciones reales de WordPress/WooCommerce.
 * $seller: resultado de tc_wp_verify_seller() si el llamador ya lo comprobó (el barrido lo hace una vez); si no, se comprueba aquí.
 */
function tc_reconcile_order( int $id, bool $dry_run, ?array $seller = null ): array {
	if ( tc_missing_config( array( 'TC_MP_ACCESS_TOKEN' => tc_const( 'TC_MP_ACCESS_TOKEN' ) ) ) ) {
		return array( 'result' => 'error', 'reason' => 'not_configured' );
	}
	$seller = $seller ?? tc_wp_verify_seller( $dry_run );
	if ( ! $seller['ok'] ) {
		return array( 'result' => 'error', 'reason' => $seller['reason'] );
	}
	return tc_run_reconcile( $id, $dry_run, tc_reference_prefix(), tc_wp_deps(), tc_min_age( tc_const( 'TC_MIN_AGE_SECONDS' ) ) );
}

/**
 * Barrido: pedidos pending y on-hold de Mercado Pago de los últimos 14 días (máximo 50), más los cancelados y fallidos
 * (máximo 25) por si llegó un pago tarde. Estos últimos solo avisan, nunca se marcan pagados.
 * Antes de consultar nada comprueba la identidad del vendedor del token; si no cuadra, no hace nada.
 */
function tc_reconcile_pending(): array {
	$dry_run = tc_dry_run();
	$missing = tc_missing_config( array( 'TC_MP_ACCESS_TOKEN' => tc_const( 'TC_MP_ACCESS_TOKEN' ) ) );
	if ( $missing ) {
		return array( 'ok' => false, 'dry_run' => $dry_run, 'reason' => 'not_configured', 'missing' => $missing, 'items' => array() );
	}
	$seller = tc_wp_verify_seller( $dry_run );
	if ( ! $seller['ok'] ) {
		return array( 'ok' => false, 'dry_run' => $dry_run, 'reason' => $seller['reason'], 'seller' => $seller['state'], 'items' => array() );
	}
	$now   = time();
	$ids   = array_merge(
		(array) wc_get_orders( tc_pending_query_args( $now ) ),
		(array) wc_get_orders( tc_closed_query_args( $now ) )
	);
	$items = array();
	foreach ( array_unique( array_map( 'intval', $ids ) ) as $id ) {
		$items[] = array( 'order_id' => $id ) + tc_reconcile_order( $id, $dry_run, $seller );
	}
	return array( 'ok' => true, 'dry_run' => $dry_run, 'seller' => $seller['state'], 'items' => $items );
}

/* ---------- Implementación con WordPress y WooCommerce ---------- */

/**
 * Nombre del bloqueo de MySQL. GET_LOCK es global al servidor MySQL, que en un hosting compartido usan otros sitios:
 * el nombre incluye un hash de la base de datos y del prefijo de tablas (máximo 64 caracteres).
 */
function tc_lock_name( int $id ): string {
	global $wpdb;
	return 'tc_' . substr( md5( DB_NAME . '|' . $wpdb->prefix ), 0, 16 ) . '_' . $id;
}

/** Estado leído directo de la base de datos (sin cachés de objetos), sin el prefijo "wc-". */
function tc_wp_db_status( int $id ): ?string {
	global $wpdb;
	$hpos = class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' )
		&& \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
	if ( $hpos ) {
		$table  = \Automattic\WooCommerce\Internal\DataStores\Orders\OrdersTableDataStore::get_orders_table_name();
		$status = $wpdb->get_var( $wpdb->prepare( "SELECT status FROM {$table} WHERE id = %d", $id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	} else {
		$status = $wpdb->get_var( $wpdb->prepare( "SELECT post_status FROM {$wpdb->posts} WHERE ID = %d", $id ) );
	}
	return is_string( $status ) && '' !== $status ? preg_replace( '/^wc-/', '', $status ) : null;
}

function tc_wp_order( int $id ): ?WC_Order {
	$order = wc_get_order( $id );
	return $order instanceof WC_Order ? $order : null; // excluye reembolsos (WC_Order_Refund)
}

function tc_wp_read_order( int $id ): ?array {
	clean_post_cache( $id );
	$order = tc_wp_order( $id );
	if ( null === $order ) {
		return null;
	}
	$created = $order->get_date_created();
	return array(
		'id'             => $order->get_id(),
		// Timestamp de creación del pedido; null si no hay fecha (la decisión lo manda a revisión, no concilia).
		'created'        => $created ? $created->getTimestamp() : null,
		// El estado sale de la base de datos: otro proceso (el IPN) pudo cambiarlo durante esta ejecución.
		'status'         => tc_wp_db_status( $id ) ?? $order->get_status(),
		'total'          => (string) $order->get_total(),
		'currency'       => $order->get_currency(),
		'payment_method' => $order->get_payment_method(),
		'alerted'        => (bool) $order->get_meta( '_tc_alerted', true ),
		// Timestamp del último chequeo sin pago aprobado de un pedido cerrado (0 si nunca).
		'closed_checked' => (int) $order->get_meta( '_tc_closed_checked', true ),
	);
}

/** Registro de errores de PHP con prefijo. Solo códigos y estados: nunca tokens, ids de vendedor, cuerpos ni datos del comprador. */
function tc_wp_log( string $message ): void {
	error_log( 'tienda-conciliacion: ' . preg_replace( '/\s+/', ' ', $message ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
}

/** GET autenticado a Mercado Pago: array( code, body ), o null si la red falló (se registra solo el código del error). */
function tc_wp_mp_get( string $url ): ?array {
	$response = wp_remote_get(
		$url,
		array(
			'timeout' => 15,
			'headers' => array(
				'Accept'        => 'application/json',
				'Authorization' => 'Bearer ' . tc_const( 'TC_MP_ACCESS_TOKEN' ),
			),
		)
	);
	if ( is_wp_error( $response ) ) {
		tc_wp_log( sprintf( 'falló la petición a Mercado Pago (error de red %s)', (string) $response->get_error_code() ) );
		return null;
	}
	return array( 'code' => (int) wp_remote_retrieve_response_code( $response ), 'body' => (string) wp_remote_retrieve_body( $response ) );
}

function tc_wp_fetch_me(): ?array {
	return tc_wp_mp_get( tc_mp_me_url() );
}

function tc_wp_search_payments( string $reference ): ?array {
	$raw = tc_wp_mp_get( tc_mp_search_url( $reference ) );
	if ( null === $raw ) {
		return null;
	}
	$payments = tc_parse_mp_response( $raw['code'], $raw['body'] );
	if ( null === $payments ) {
		tc_wp_log( sprintf( 'la búsqueda de pagos en Mercado Pago respondió HTTP %d o un cuerpo inesperado', $raw['code'] ) );
	}
	return $payments;
}

function tc_wp_complete( int $id, string $payment_id ): void {
	$order = tc_wp_order( $id );
	if ( null === $order ) {
		throw new RuntimeException( 'order_missing' );
	}
	// Si el objeto en memoria está atrasado respecto de la base de datos, payment_complete() vería un estado viejo.
	if ( $order->get_status() !== tc_wp_db_status( $id ) ) {
		throw new RuntimeException( 'stale_order' );
	}
	$order->payment_complete( $payment_id );
}

/** Guarda solo metadatos (save_meta_data), sin save() completo, para no pisar el estado con un objeto atrasado. */
function tc_wp_set_meta( int $id, string $key, string $value ): void {
	$order = tc_wp_order( $id );
	if ( null !== $order ) {
		$order->update_meta_data( $key, $value );
		$order->save_meta_data();
	}
}

function tc_wp_add_note( int $id, string $note ): bool {
	$order = tc_wp_order( $id );
	return null !== $order && (bool) $order->add_order_note( $note, 0, false );
}

/**
 * Marca + nota privada + correo al administrador. La marca _tc_alerted se guarda ANTES de enviar: si el envío falla
 * se pierde ese aviso (queda la nota en el pedido), pero nunca se envían dos. No hay garantía de entrega exactamente una vez.
 */
function tc_wp_alert( int $id, array $decision ): void {
	$text = tc_alert_text( $id, $decision );
	tc_wp_set_meta( $id, '_tc_alerted', gmdate( 'c' ) );
	tc_wp_add_note( $id, $text );
	wp_mail( (string) get_option( 'admin_email' ), sprintf( '[%s] Pedido #%d: revisar pago de Mercado Pago', wp_specialchars_decode( get_bloginfo( 'name' ) ), $id ), $text );
}

function tc_wp_deps(): array {
	global $wpdb;
	return array(
		'lock'            => function ( int $id ) use ( $wpdb ): bool {
			return '1' === (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', tc_lock_name( $id ) ) );
		},
		'unlock'          => function ( int $id ) use ( $wpdb ): void {
			$wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', tc_lock_name( $id ) ) );
		},
		'read_order'      => 'tc_wp_read_order',
		'search_payments' => 'tc_wp_search_payments',
		'complete'        => 'tc_wp_complete',
		'mark_reconciled' => function ( int $id, string $payment_id ): void {
			tc_wp_set_meta( $id, '_tc_reconciled_payment', $payment_id );
		},
		'add_note'        => 'tc_wp_add_note',
		'alert'           => 'tc_wp_alert',
		'now'             => 'time',
		'log'             => 'tc_wp_log',
		'mark_checked'    => function ( int $id, int $now ): void {
			tc_wp_set_meta( $id, '_tc_closed_checked', (string) $now );
		},
	);
}
