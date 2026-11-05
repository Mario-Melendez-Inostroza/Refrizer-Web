<?php
/**
 * Sitemap dinámico de la tienda React: se sirve como /sitemap.xml (regla en el .htaccess de la raíz, ver redirect-sitemap.htaccess.txt).
 * Va en la RAÍZ del sitio (public_html/sitemap.php), junto a index.html y a la carpeta wp/.
 *
 * - Rutas fijas (portada, servicios, cobertura...): las lee de sitemap-paginas.json, que genera el build de la tienda.
 * - Productos y categorías: los lee de WooCommerce, así que se actualiza solo cuando la clienta agrega o quita productos.
 *
 * No toca la base de datos más allá de leer; no depende de ningún plugin de SEO.
 */

define( 'WP_USE_THEMES', false );
$tc_wp_load = __DIR__ . '/wp/wp-load.php';
if ( ! is_file( $tc_wp_load ) ) {
	http_response_code( 500 );
	exit;
}
require $tc_wp_load;

$tc_json    = is_file( __DIR__ . '/sitemap-paginas.json' ) ? json_decode( (string) file_get_contents( __DIR__ . '/sitemap-paginas.json' ), true ) : null;
$tc_origin  = rtrim( is_array( $tc_json ) && ! empty( $tc_json['origin'] ) ? (string) $tc_json['origin'] : 'https://' . preg_replace( '/[^a-z0-9.-]/i', '', (string) ( $_SERVER['HTTP_HOST'] ?? '' ) ), '/' );
$tc_paginas = is_array( $tc_json ) && ! empty( $tc_json['paginas'] ) && is_array( $tc_json['paginas'] ) ? $tc_json['paginas'] : array( '/' );

function tc_xml( string $text ): string {
	return htmlspecialchars( $text, ENT_XML1 | ENT_QUOTES, 'UTF-8' );
}

/** Una entrada <url>. $lastmod: fecha ISO 8601 o null. $image: URL absoluta de la imagen principal o null. */
function tc_url_entry( string $loc, ?string $lastmod = null, ?string $image = null ): string {
	$x = "  <url>\n    <loc>" . tc_xml( $loc ) . "</loc>\n";
	if ( $lastmod ) {
		$x .= '    <lastmod>' . tc_xml( $lastmod ) . "</lastmod>\n";
	}
	if ( $image ) {
		$x .= '    <image:image><image:loc>' . tc_xml( $image ) . "</image:loc></image:image>\n";
	}
	return $x . "  </url>\n";
}

$tc_out = '';
foreach ( $tc_paginas as $tc_path ) {
	$tc_path = '/' . ltrim( (string) $tc_path, '/' );
	$tc_out .= tc_url_entry( $tc_origin . ( '/' === $tc_path ? '/' : rtrim( $tc_path, '/' ) ) );
}

// Categorías con productos (se omite la categoría "Sin categorizar" de WooCommerce).
if ( function_exists( 'get_terms' ) ) {
	$tc_terms = get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => true ) );
	if ( is_array( $tc_terms ) ) {
		foreach ( $tc_terms as $tc_term ) {
			if ( in_array( $tc_term->slug, array( 'uncategorized', 'sin-categorizar' ), true ) ) {
				continue;
			}
			$tc_out .= tc_url_entry( $tc_origin . '/categoria/' . rawurlencode( $tc_term->slug ) );
		}
	}
}

// Productos publicados y visibles en el catálogo.
if ( function_exists( 'wc_get_products' ) ) {
	$tc_productos = wc_get_products( array( 'status' => 'publish', 'limit' => -1, 'return' => 'objects' ) );
	foreach ( (array) $tc_productos as $tc_p ) {
		if ( 'hidden' === $tc_p->get_catalog_visibility() ) {
			continue;
		}
		$tc_mod   = $tc_p->get_date_modified();
		$tc_image = $tc_p->get_image_id() ? wp_get_attachment_url( $tc_p->get_image_id() ) : null;
		$tc_out  .= tc_url_entry( $tc_origin . '/producto/' . rawurlencode( $tc_p->get_slug() ), $tc_mod ? $tc_mod->date( 'c' ) : null, $tc_image ? (string) $tc_image : null );
	}
}

header( 'Content-Type: application/xml; charset=UTF-8' );
header( 'Cache-Control: public, max-age=3600' );
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";
echo $tc_out;
echo "</urlset>\n";
