import { REGION_CODES } from '../lib/regions.ts'
import type { CheckoutPayload, CheckoutResponse } from '../types'
import { wcRequest } from './client.ts'
import { saveOrderAccess } from './orders.ts'

/** Id de la pasarela Checkout Pro del plugin oficial de Mercado Pago (confirmado en su código fuente). */
const PAYMENT_METHOD = 'woo-mercado-pago-basic'

interface StoreCheckoutResponse {
  order_id: number
  order_key: string
  payment_result: { payment_status: string; redirect_url: string }
}

/**
 * Carrito nuevo por Cart-Token -> pedido por Store API -> URL de Mercado Pago.
 * Los precios los calcula WooCommerce; expected_total solo evita cobrar un total distinto al que vio el comprador.
 */
export async function createCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  if (!payload.items.length) throw new Error('El carrito está vacío')
  const { customer, shipping } = payload

  let { cartToken } = await wcRequest('GET', '/cart')
  for (const i of payload.items) {
    ;({ cartToken } = await wcRequest('POST', '/cart/add-item', { body: { id: i.productId, quantity: i.quantity }, cartToken }))
  }

  const address = {
    first_name: customer.firstName,
    last_name: customer.lastName,
    address_1: shipping.address,
    address_2: '',
    city: shipping.commune,
    state: REGION_CODES[shipping.region] ?? '',
    postcode: '',
    country: 'CL',
  }
  const billing_address = { ...address, email: customer.email, phone: customer.phone }
  ;({ cartToken } = await wcRequest('POST', '/cart/update-customer', { body: { billing_address, shipping_address: address }, cartToken }))

  const { data } = await wcRequest<StoreCheckoutResponse>('POST', '/checkout', {
    cartToken,
    body: {
      billing_address,
      shipping_address: address,
      payment_method: PAYMENT_METHOD,
      payment_data: [],
      // El RUT viaja en la nota del pedido: WooCommerce no tiene campo RUT sin PHP (limitación a informar).
      customer_note: [`RUT: ${customer.rut}`, payload.notes.trim()].filter(Boolean).join('\n'),
      // La Store API exige texto, no número (confirmado por su error de validación).
      expected_total: String(payload.expectedTotal),
    },
  })

  const redirectUrl = data.payment_result?.redirect_url
  if (data.payment_result?.payment_status !== 'success' || !redirectUrl || new URL(redirectUrl).protocol !== 'https:') {
    throw new Error('No pudimos iniciar el pago. Inténtalo nuevamente.')
  }
  saveOrderAccess(data.order_id, { key: data.order_key, email: customer.email })
  return { redirectUrl }
}
