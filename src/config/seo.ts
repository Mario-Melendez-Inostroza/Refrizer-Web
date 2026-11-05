/**
 * Contenido y metadatos de SEO. Archivo de datos puros (sin alias '@/'): lo leen las páginas, el build (sitemap) y las pruebas.
 *
 * Reglas del contenido (acordadas con M, 2026-11-05):
 * - Los servicios técnicos se hacen en TODAS las comunas de Santiago. Fuera de Santiago solo se despachan productos.
 * - Peñaflor es solo el punto de retiro de productos (no hay tienda física): no es la ubicación del negocio.
 * - No se inventan datos: nada de garantías, plazos, precios, años de experiencia ni certificaciones que la clienta no haya confirmado.
 *   Los textos usan solo lo que ya dice el sitio y consejos generales; la clienta debe aprobarlos antes de abrir.
 */

export const SEO_ORIGIN = 'https://refrizer.cl'
export const SITE_NAME = 'Refrizer'

export interface SeoPage {
  path: string
  /** Sin el sufijo "| Refrizer" (lo agrega pageTitle). Si falta, se usa el título de la portada. */
  title?: string
  description?: string
  image?: string
  noindex?: boolean
  jsonLd?: object[]
  type?: 'website' | 'product'
}

/** Datos de contacto para los datos estructurados. DEBEN coincidir con src/config/site.ts (si allí cambia el teléfono o el correo, cambiarlos aquí). */
export const organization = {
  name: SITE_NAME,
  description: 'Venta de productos, instalación, mantención y reparación de aire acondicionado, refrigeración y electricidad en todo Santiago.',
  logo: '/apple-touch-icon.png',
  telephone: '+56998525452',
  email: 'ventas@refrizer.cl',
}

export const HOME_TITLE = 'Refrizer | Refrigeración y electricidad en Santiago'

export const seoPages = {
  home: {
    path: '/',
    description: 'Venta de productos, instalación y mantención de aire acondicionado, refrigeración y electricidad en todo Santiago. Despacho a regiones y pago con Mercado Pago.',
  },
  products: {
    path: '/productos',
    title: 'Productos de refrigeración y electricidad',
    description: 'Equipos y materiales de refrigeración y electricidad. Despacho a Santiago y regiones o retiro en Peñaflor. Pago seguro con Mercado Pago.',
  },
  services: {
    path: '/servicios',
    title: 'Servicios técnicos en Santiago',
    description: 'Instalación, mantención y reparación de aire acondicionado y refrigeradores, e instalaciones eléctricas en todas las comunas de Santiago. Cotiza por WhatsApp.',
  },
  about: {
    path: '/nosotros',
    title: 'Nosotros',
    description: 'Conoce Refrizer: soluciones en refrigeración y electricidad, con productos y servicio técnico en todo Santiago.',
  },
  contact: {
    path: '/contacto',
    title: 'Contacto',
    description: 'Escríbenos por WhatsApp o correo para cotizar servicios técnicos en Santiago o consultar por productos, despacho y retiro.',
  },
  coverage: {
    path: '/cobertura',
    title: 'Cobertura de servicios técnicos en Santiago',
    description: 'Hacemos instalación, mantención y reparación en todas las comunas de Santiago. Fuera de Santiago despachamos productos.',
  },
  delivery: {
    path: '/despacho-y-retiro',
    title: 'Despacho y retiro de productos',
    description: 'Despacho de productos a Santiago y regiones, o retiro en Peñaflor. Te contactamos después del pago para coordinar la entrega.',
  },
} satisfies Record<string, SeoPage>

/** Páginas que no deben aparecer en Google (carrito, pago, estado de pedido, errores). */
export const seoPrivate = {
  cart: { path: '/carrito', title: 'Carrito', noindex: true },
  checkout: { path: '/checkout', title: 'Finalizar compra', noindex: true },
  order: { path: '/pedido/retorno', title: 'Estado de tu pedido', noindex: true },
  notFound: { path: '/404', title: 'Página no encontrada', noindex: true },
} satisfies Record<string, SeoPage>

export interface Faq {
  q: string
  a: string
}

export interface ServiceSeo {
  slug: string
  /** Nombre corto del servicio (coincide con site.services.items). */
  name: string
  /** Título de la página (sin "| Refrizer"). */
  title: string
  description: string
  h1: string
  intro: string[]
  includes: string[]
  /** Qué conviene contar al cotizar. */
  quoteInfo: string[]
  faqs: Faq[]
  /** Mensaje de WhatsApp precargado. */
  whatsapp: string
}

const QUE_COMUNAS: Faq = {
  q: '¿En qué comunas hacen servicios?',
  a: 'En todas las comunas de Santiago. Fuera de Santiago solo despachamos productos; no realizamos servicios técnicos.',
}

const COMO_COTIZAR: Faq = {
  q: '¿Cómo puedo cotizar?',
  a: 'Escríbenos por WhatsApp con tu comuna y una breve descripción de lo que necesitas; si puedes, adjunta fotos. Te respondemos para coordinar la visita o la cotización.',
}

export const services: ServiceSeo[] = [
  {
    slug: 'instalacion-de-aire-acondicionado',
    name: 'Instalación de aire acondicionado',
    title: 'Instalación de aire acondicionado en Santiago',
    description: 'Instalación de aire acondicionado split y de ventana en todas las comunas de Santiago, con materiales certificados. Cotiza por WhatsApp.',
    h1: 'Instalación de aire acondicionado en Santiago',
    intro: [
      'Instalamos equipos de aire acondicionado split y de ventana en hogares y negocios de todas las comunas de Santiago, con materiales certificados.',
      'Una buena instalación influye en el rendimiento del equipo, en el consumo de energía y en su duración. Por eso conviene definir antes dónde irá cada unidad y qué necesita el lugar.',
    ],
    includes: [
      'Montaje de equipos split y de ventana.',
      'Instalación con materiales certificados.',
      'Asesoría para elegir el equipo adecuado a tu espacio.',
    ],
    quoteInfo: ['Tu comuna.', 'Tipo de equipo (split o de ventana) y si ya lo tienes o necesitas comprarlo.', 'Fotos del lugar donde irá la unidad interior y la exterior.'],
    faqs: [
      QUE_COMUNAS,
      COMO_COTIZAR,
      { q: '¿Puedo comprar el equipo con ustedes?', a: 'Puedes revisar los productos disponibles en la tienda o consultarnos por WhatsApp si buscas un equipo en particular.' },
    ],
    whatsapp: 'Hola, quiero cotizar la instalación de un aire acondicionado.',
  },
  {
    slug: 'mantencion-y-limpieza-de-equipos',
    name: 'Mantención y limpieza de equipos',
    title: 'Mantención de aire acondicionado en Santiago',
    description: 'Planes preventivos de mantención y limpieza de equipos de aire acondicionado y refrigeración en todas las comunas de Santiago. Cotiza por WhatsApp.',
    h1: 'Mantención y limpieza de equipos en Santiago',
    intro: [
      'Hacemos mantención y limpieza de equipos de aire acondicionado y refrigeración en todas las comunas de Santiago, con planes preventivos para alargar la vida útil y reducir el consumo.',
      'La mantención periódica ayuda a detectar problemas a tiempo y a que el equipo funcione como el primer día.',
    ],
    includes: [
      'Planes preventivos de mantención.',
      'Limpieza de equipos.',
      'Revisión del estado general del equipo.',
    ],
    quoteInfo: ['Tu comuna.', 'Tipo de equipo, marca y modelo si los tienes a mano.', 'Cuánto tiempo lleva sin mantención y si presenta alguna falla.'],
    faqs: [
      QUE_COMUNAS,
      COMO_COTIZAR,
      { q: '¿Para qué sirve la mantención preventiva?', a: 'Sirve para alargar la vida útil del equipo y reducir el consumo, y permite detectar fallas antes de que el equipo deje de funcionar.' },
    ],
    whatsapp: 'Hola, quiero cotizar la mantención de un equipo.',
  },
  {
    slug: 'reparacion-de-refrigeradores',
    name: 'Reparación de refrigeradores',
    title: 'Reparación de refrigeradores en Santiago',
    description: 'Diagnóstico y reparación de refrigeradores domésticos y comerciales en todas las comunas de Santiago. Cotiza por WhatsApp.',
    h1: 'Reparación de refrigeradores en Santiago',
    intro: [
      'Hacemos diagnóstico y reparación de refrigeradores domésticos y comerciales en todas las comunas de Santiago.',
      'Si tu equipo no enfría, hace ruidos, pierde agua o se apaga, cuéntanos qué ocurre y coordinamos la revisión.',
    ],
    includes: [
      'Diagnóstico de la falla.',
      'Reparación de equipos domésticos.',
      'Reparación de equipos comerciales.',
    ],
    quoteInfo: ['Tu comuna.', 'Tipo de refrigerador, marca y modelo si los tienes a mano.', 'Qué falla notas y desde cuándo; fotos o un video corto ayudan.'],
    faqs: [
      QUE_COMUNAS,
      COMO_COTIZAR,
      { q: '¿Reparan refrigeradores comerciales?', a: 'Sí, reparamos equipos domésticos y comerciales.' },
    ],
    whatsapp: 'Hola, quiero cotizar la reparación de un refrigerador.',
  },
  {
    slug: 'instalaciones-electricas',
    name: 'Instalaciones eléctricas',
    title: 'Instalaciones eléctricas en Santiago',
    description: 'Instalaciones eléctricas: tableros, circuitos y enchufes con normativa SEC, en todas las comunas de Santiago. Cotiza por WhatsApp.',
    h1: 'Instalaciones eléctricas en Santiago',
    intro: [
      'Realizamos instalaciones eléctricas en hogares y negocios de todas las comunas de Santiago: tableros, circuitos y enchufes con normativa SEC.',
      'Cuéntanos qué necesitas y coordinamos una visita para evaluar el trabajo.',
    ],
    includes: ['Tableros eléctricos.', 'Circuitos.', 'Enchufes y puntos de conexión.', 'Trabajos con normativa SEC.'],
    quoteInfo: ['Tu comuna.', 'Qué quieres instalar o modificar y en qué tipo de lugar (casa, local, oficina).', 'Fotos del tablero o de la zona de trabajo.'],
    faqs: [
      QUE_COMUNAS,
      COMO_COTIZAR,
      { q: '¿Los trabajos cumplen la normativa?', a: 'Trabajamos con normativa SEC en tableros, circuitos y enchufes.' },
    ],
    whatsapp: 'Hola, quiero cotizar una instalación eléctrica.',
  },
  {
    slug: 'revision-y-asesoria-tecnica',
    name: 'Revisión y asesoría técnica',
    title: 'Asesoría técnica de refrigeración en Santiago',
    description: 'Te ayudamos a elegir el equipo correcto para tu espacio y revisamos tus instalaciones. Revisión y asesoría técnica en todo Santiago.',
    h1: 'Revisión y asesoría técnica en Santiago',
    intro: [
      'Te ayudamos a elegir el equipo correcto para tu espacio y revisamos instalaciones de refrigeración y electricidad en todas las comunas de Santiago.',
      'Antes de comprar o instalar, una asesoría técnica evita errores y gastos innecesarios.',
    ],
    includes: ['Asesoría para elegir el equipo adecuado.', 'Revisión técnica de instalaciones.', 'Orientación sobre los pasos a seguir.'],
    quoteInfo: ['Tu comuna.', 'Qué quieres resolver o instalar.', 'Fotos o medidas del espacio, si las tienes.'],
    faqs: [
      QUE_COMUNAS,
      COMO_COTIZAR,
      { q: '¿Me ayudan a elegir qué equipo comprar?', a: 'Sí. Cuéntanos para qué espacio lo necesitas y te orientamos. Después puedes revisar los productos disponibles en la tienda.' },
    ],
    whatsapp: 'Hola, quiero una asesoría técnica.',
  },
]

/**
 * Comunas de Santiago donde se hacen servicios. POR CONFIRMAR con la clienta ("todas las comunas de Santiago", M, 2026-11-05):
 * las 32 comunas de la provincia de Santiago más Puente Alto, San Bernardo y Peñaflor.
 */
export const coverageComunas: string[] = [
  'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna',
  'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul',
  'Maipú', 'Ñuñoa', 'Padre Hurtado', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Providencia', 'Pudahuel', 'Puente Alto',
  'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San Miguel', 'San Ramón', 'Santiago', 'Vitacura',
]

/** Rutas fijas del sitio para el sitemap (las de productos y categorías las agrega el servidor). */
export function staticPaths(): string[] {
  return [
    seoPages.home.path,
    seoPages.products.path,
    seoPages.services.path,
    ...services.map((s) => `${seoPages.services.path}/${s.slug}`),
    seoPages.coverage.path,
    seoPages.delivery.path,
    seoPages.about.path,
    seoPages.contact.path,
  ]
}
