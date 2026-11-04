/**
 * El comprador volvió de Mercado Pago sin pagar: la dirección de retorno trae status, collection_status y payment_id
 * vacíos o con el texto "null". Solo sirve para elegir el TEXTO de /pedido/retorno; nunca para decidir si el pedido está
 * pagado (el query lo controla el comprador, el estado real sale del servidor).
 */
export function returnedWithoutPayment(query: URLSearchParams): boolean {
  const empty = (v: string | null) => v === null || v.trim() === '' || v.trim().toLowerCase() === 'null'
  return empty(query.get('payment_id')) && empty(query.get('status')) && empty(query.get('collection_status'))
}

/**
 * Mercado Pago volvió con un pago rechazado (status o collection_status = rejected). Como el pedido sigue "pendiente" en
 * WooCommerce, el servidor no lo distingue: el query solo elige el TEXTO ("tu pago fue rechazado"), nunca el estado.
 */
export function returnedRejected(query: URLSearchParams): boolean {
  const is = (v: string | null) => v !== null && v.trim().toLowerCase() === 'rejected'
  return is(query.get('status')) || is(query.get('collection_status'))
}
