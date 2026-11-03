import { site } from '@/config/site'

export interface LegalSection {
  title: string
  paragraphs?: string[]
  items?: string[]
  link?: { to: string; label: string }
}

export interface LegalPageContent {
  eyebrow: string
  title: string
  intro: string
  sections: LegalSection[]
}

/** Fecha de la última revisión de los textos legales. Actualizar cada vez que se editen. */
export const legalUpdated = '3 de noviembre de 2026'

const contact = `${site.email} o por WhatsApp al ${site.phone}`

/** Identificación del proveedor: solo se muestra si están completos los datos de site.legal. */
const providerLine = site.legal.name && site.legal.rut
  ? [`Razón social: ${site.legal.name}. RUT: ${site.legal.rut}.${site.legal.address ? ` Domicilio: ${site.legal.address}.` : ''}`]
  : []

export const terms: LegalPageContent = {
  eyebrow: 'Información legal',
  title: 'Términos y condiciones',
  intro: `Estas condiciones regulan el uso del sitio y las compras de productos en ${site.name}. Al comprar, declaras haberlas leído y aceptado.`,
  sections: [
    {
      title: 'Quiénes somos',
      paragraphs: [
        `${site.name} vende equipos, materiales y repuestos de refrigeración y electricidad, y presta servicios técnicos de instalación, mantención y reparación.`,
        ...providerLine,
        `Puedes escribirnos a ${contact}.`,
      ],
    },
    {
      title: 'Productos y precios',
      items: [
        'Los precios están en pesos chilenos (CLP) e incluyen IVA.',
        'Los precios y el stock son los vigentes al momento de la compra y pueden cambiar sin previo aviso. Los cambios no afectan a los pedidos ya pagados.',
        'Las fotos son referenciales. Las características de cada producto son las informadas en su ficha; si tienes dudas, consúltanos antes de comprar.',
      ],
    },
    {
      title: 'Cómo comprar',
      paragraphs: [
        'Agregas los productos al carrito, completas tus datos en el checkout y pagas con Mercado Pago. Cuando el pago se confirma, tu pedido queda registrado y te enviamos un correo de confirmación a la dirección que indicaste.',
        'Si el pago es rechazado o no se completa, no se realiza ningún cargo y el pedido no queda confirmado.',
      ],
    },
    {
      title: 'Medios de pago',
      paragraphs: [
        `El pago se realiza solo a través de Mercado Pago, con los medios que esa plataforma ofrezca. ${site.name} no recibe ni guarda los datos de tu tarjeta: los procesa Mercado Pago bajo sus propios términos y medidas de seguridad.`,
      ],
    },
    {
      title: 'Entrega',
      paragraphs: [
        'El sitio no cobra despacho. Una vez confirmado el pago, nos comunicaremos contigo por correo, teléfono o WhatsApp para coordinar la entrega o el retiro, y acordar la fecha y el costo si lo hubiera.',
        'Revisa el producto al recibirlo y avísanos de inmediato si llegó con daños.',
      ],
    },
    {
      title: 'Cambios, devoluciones y garantía',
      paragraphs: ['Tus derechos de retracto y de garantía legal están explicados en la página de cambios y devoluciones.'],
      link: { to: '/cambios-y-devoluciones', label: 'Ver cambios y devoluciones' },
    },
    {
      title: 'Servicios técnicos',
      paragraphs: ['La instalación, mantención y reparación se coordinan por contacto directo. Sus condiciones y valores se informan en la cotización.'],
    },
    {
      title: 'Datos personales',
      paragraphs: [
        'Usamos los datos que ingresas (nombre, RUT, correo, teléfono y dirección) solo para procesar tu pedido, coordinar la entrega y contactarte por él. No los vendemos ni los compartimos con terceros, salvo con Mercado Pago para procesar el pago y cuando la ley lo exija.',
        `Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a ${site.email}.`,
      ],
    },
    {
      title: 'Reclamos',
      paragraphs: [`Escríbenos a ${contact} y te responderemos a la brevedad. También puedes acudir al SERNAC (www.sernac.cl).`],
    },
    {
      title: 'Cambios a estas condiciones',
      paragraphs: ['Podemos actualizar estas condiciones. Las nuevas se aplican a las compras hechas después de su publicación; la fecha de la última actualización figura en esta página.'],
    },
  ],
}

export const returns: LegalPageContent = {
  eyebrow: 'Información legal',
  title: 'Cambios y devoluciones',
  intro: 'Estas son las reglas para retractos, devoluciones y garantías de los productos comprados en el sitio, según la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.',
  sections: [
    {
      title: 'Derecho de retracto (compras por internet)',
      items: [
        'Puedes retractarte de tu compra dentro de 10 días corridos desde que recibes el producto, sin necesidad de dar explicaciones.',
        `Para ejercerlo, escríbenos dentro de ese plazo a ${contact}, con tu número de pedido.`,
        'El producto debe devolverse en las condiciones en que lo recibiste, con su embalaje y accesorios. Coordinaremos contigo cómo hacerlo.',
        'Te devolvemos lo pagado por el mismo medio de pago, a la brevedad y como máximo dentro de 45 días desde que nos comunicas el retracto.',
        'El retracto no aplica a productos hechos a la medida o según tus especificaciones, ni a los demás casos que la ley exceptúa.',
      ],
    },
    {
      title: 'Garantía legal',
      items: [
        'Si un producto nuevo presenta una falla o defecto de fabricación, tienes 3 meses desde que lo recibiste para reclamar.',
        'Puedes elegir entre la reparación gratuita, el cambio del producto o la devolución de lo pagado.',
        'La garantía no cubre daños por mal uso, instalación incorrecta o intervención de terceros no autorizados.',
        'Algunas marcas ofrecen garantías adicionales: se informan en el producto o en su documentación.',
      ],
    },
    {
      title: 'Producto dañado o distinto al pedido',
      paragraphs: ['Si recibes un producto dañado o distinto al que pediste, avísanos lo antes posible, con fotos, y lo resolvemos contigo.'],
    },
    {
      title: 'Cómo solicitarlo',
      items: [
        `Escríbenos a ${contact}.`,
        'Indica tu número de pedido y tu nombre, y cuéntanos el motivo. Si es una falla, adjunta fotos o un video.',
        'Te responderemos a la brevedad con los pasos a seguir.',
      ],
    },
    {
      title: 'Reembolsos',
      paragraphs: ['Los reembolsos se hacen por el mismo medio de pago que usaste, a través de Mercado Pago. El tiempo en que verás el dinero depende de tu banco o tarjeta.'],
    },
  ],
}
