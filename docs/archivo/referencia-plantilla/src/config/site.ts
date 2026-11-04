/**
 * Textos que dependen de si la tienda despacha. Se elige el bloque según shipping.enabled.
 * `coordinated` (sin despacho) no debe mencionar envío, despacho ni seguimiento: solo retiro o coordinación con el vendedor.
 * Al montar una tienda nueva se editan ambos bloques; también .figma/make/site.json (descripción), que es un archivo aparte.
 */
export const deliveryCopy = {
  shipped: {
    seoDescription: 'Café de especialidad tostado en Valdivia y cerámica hecha a mano. Despacho a todo Chile.',
    heroText: 'Tostamos en pequeños lotes cada martes y despachamos el miércoles. Nada pasa más de siete días en bodega.',
    badgeValue: '48 h',
    badgeText: 'desde el tostador a tu puerta',
    paidTitle: '¡Gracias! Tu café ya está en camino.',
    paidText: 'Recibimos tu pago. Te enviamos un correo con el detalle y el seguimiento.',
    termsTitle: '3. Despachos',
    termsText: 'Despachamos de lunes a viernes. Los plazos son referenciales y pueden variar según la comuna de destino.',
  },
  coordinated: {
    seoDescription: 'Café de especialidad tostado en Valdivia y cerámica hecha a mano. Retiro o entrega coordinada contigo.',
    heroText: 'Tostamos en pequeños lotes cada martes. Nada pasa más de siete días en bodega.',
    badgeValue: 'Retiro',
    badgeText: 'o entrega coordinada contigo',
    paidTitle: '¡Gracias! Recibimos tu pago.',
    paidText: 'Te escribimos por correo con el detalle de tu pedido. Nos pondremos en contacto contigo para coordinar la entrega o el retiro.',
    termsTitle: '3. Entrega y retiro',
    termsText: 'La entrega o el retiro de cada pedido se coordina directamente con el vendedor. Los plazos son referenciales.',
  },
} as const

/** false: la tienda no despacha (la entrega se coordina). true: selector de despacho y tarifas de la Store API. */
const SHIPPING_ENABLED: boolean = false
const delivery = SHIPPING_ENABLED ? deliveryCopy.shipped : deliveryCopy.coordinated

/** Datos de la marca: única fuente para nombre, contacto, razón social y textos fijos. */
export const site = {
  name: 'Tueste Austral',
  nameLead: 'Tueste',
  nameTail: 'Austral',
  logoInitial: 't',
  legalName: 'Tueste Austral SpA',
  address: 'Av. Picarte 1240, Valdivia',
  email: 'hola@tuesteaustral.cl',
  phone: '+56 9 5555 0123',
  seo: {
    homeDescription: delivery.seoDescription,
  },
  footer: {
    taglineLead: 'Tostado en el sur,',
    taglineAccent: 'bebido en todo Chile.',
  },
  home: {
    batchLabel: 'Lote de primavera · N.º 14',
    heroText: delivery.heroText,
    deliveryBadgeValue: delivery.badgeValue,
    deliveryBadgeText: delivery.badgeText,
    subscriptionText: 'Recibe 250 g de un café que elegimos para ti, con una ficha de cata y una receta. Pausa cuando quieras.',
  },
  shipping: {
    enabled: SHIPPING_ENABLED,
    /** Banner superior del sitio. Vacío = no se muestra. */
    bannerText: 'Coordinaremos la entrega contigo',
    /** Reemplaza al selector de despacho en el checkout cuando enabled = false. */
    coordinationText: 'Coordinaremos la entrega contigo',
  },
  /** Pantalla de pedido pagado y términos: cambian según shipping.enabled. */
  delivery: {
    paidTitle: delivery.paidTitle,
    paidText: delivery.paidText,
    termsTitle: delivery.termsTitle,
    termsText: delivery.termsText,
  },
  orders: {
    /** "Prefijo de referencia" del plugin de Mercado Pago: external_reference vuelve como prefijo + id del pedido. */
    referencePrefix: 'WC-',
  },
  contact: {
    description: 'Escríbenos por pedidos, mayoristas o suscripciones. Respondemos en menos de 24 horas hábiles.',
  },
  terms: {
    description: 'Condiciones generales de compra en Tueste Austral.',
    paymentProvider: 'Mercado Pago',
  },
} as const
