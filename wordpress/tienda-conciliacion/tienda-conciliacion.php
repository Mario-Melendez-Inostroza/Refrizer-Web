<?php
/**
 * Plugin Name:       Tienda: conciliación con Mercado Pago
 * Description:       Red de seguridad para pedidos pagados en Mercado Pago Checkout Pro cuyo aviso (IPN) no llegó. Ruta REST para /pedido/retorno, barrido por cron de cPanel y ajustes de la Store API (404 uniforme y sin caché en /order y /cart).
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      8.3
 * Requires Plugins:  woocommerce
 * License:           Privado
 *
 * Configuración: constantes en un archivo fuera de public_html (ver ../config.example.php y README.md).
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/includes/decide.php';
require_once __DIR__ . '/includes/reconcile.php';

/** Segundos entre dos conciliaciones del mismo pedido pedidas desde el navegador. */
const TC_REST_COOLDOWN = 60;

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'tienda/v1',
			'/reconcile',
			array(
				'methods'             => 'POST',
				'callback'            => 'tc_rest_reconcile',
				// Ruta pública a propósito: la autorización es la order_key + email del comprador (como la Store API).
				'permission_callback' => '__return_true',
			)
		);
	}
);

function tc_rest_response( string $code ): WP_REST_Response {
	$response = new WP_REST_Response( array( 'ok' => true, 'result' => $code ), 200 );
	$response->header( 'Cache-Control', 'no-store, max-age=0' );
	return $response;
}

/**
 * POST /wp-json/tienda/v1/reconcile { orderId, orderKey, email }
 * Lo llama /pedido/retorno cuando el sondeo se agota y el pedido sigue pendiente. Pedido inexistente, key o email
 * erróneos responden igual (not_found). El límite de frecuencia va antes de validar, para no revelar si el pedido existe.
 */
function tc_rest_reconcile( WP_REST_Request $request ): WP_REST_Response {
	$body   = $request->get_json_params();
	$parsed = tc_parse_customer_request( is_array( $body ) ? $body : array() );
	if ( null === $parsed ) {
		return tc_rest_response( 'not_found' );
	}
	$throttle = 'tc_rl_' . $parsed['id'];
	if ( get_transient( $throttle ) ) {
		return tc_rest_response( 'try_later' );
	}
	set_transient( $throttle, 1, TC_REST_COOLDOWN );

	$order = function_exists( 'wc_get_order' ) ? tc_wp_order( $parsed['id'] ) : null;
	if ( null === $order || ! tc_customer_matches( (string) $order->get_order_key(), (string) $order->get_billing_email(), $parsed['key'], $parsed['email'] ) ) {
		return tc_rest_response( 'not_found' );
	}
	return tc_rest_response( tc_public_code( tc_reconcile_order( $parsed['id'], tc_dry_run() ) ) );
}

/**
 * Store API:
 * - /order/{id}: WooCommerce responde 401, 403 o 404 según si el pedido existe (informe §7c). Se unifican en un 404
 *   con el mismo cuerpo, como hacía el proxy de Vercel.
 * - /order, /cart y /checkout: Cache-Control: no-store (el hosting cachea respuestas GET por URL, informe §10b).
 *   Que la caché del hosting respete esta cabecera NO está comprobado.
 */
add_filter(
	'rest_post_dispatch',
	function ( $response, $server, $request ) {
		if ( ! ( $response instanceof WP_HTTP_Response ) || ! ( $request instanceof WP_REST_Request ) ) {
			return $response;
		}
		$kind = tc_store_route_kind( $request->get_route() );
		if ( null === $kind ) {
			return $response;
		}
		if ( 'order' === $kind && in_array( $response->get_status(), array( 401, 403, 404 ), true ) ) {
			$response = new WP_REST_Response(
				array( 'code' => 'not_found', 'message' => 'Pedido no encontrado', 'data' => array( 'status' => 404 ) ),
				404
			);
		}
		$response->header( 'Cache-Control', 'no-store, max-age=0' );
		return $response;
	},
	10,
	3
);

/**
 * REST de WordPress: /wp/v2/users entrega a cualquiera el nombre de usuario (slug) del administrador, que es la mitad
 * de un ataque de fuerza bruta contra wp-login.php. Se quita para quien no tenga sesión. La tienda y la Store API no
 * lo usan; el editor de WordPress sigue funcionando porque llama con sesión y nonce.
 */
add_filter(
	'rest_endpoints',
	function ( $endpoints ) {
		if ( is_user_logged_in() || ! is_array( $endpoints ) ) {
			return $endpoints;
		}
		foreach ( array_keys( $endpoints ) as $route ) {
			if ( 0 === strpos( (string) $route, '/wp/v2/users' ) ) {
				unset( $endpoints[ $route ] );
			}
		}
		return $endpoints;
	}
);
