import logoUrl from '@/assets/logo.jpg'

export const site = {
  name: 'Refrizer',
  tagline: 'Refrigeración & Electricidad',
  slogan: 'Soluciones que enfrían y conectan',

  logo: logoUrl,
  phone: '+56 9 1234 5678',
  whatsapp: {
    number: '56912345678',
    message: 'Hola Refrizer, quiero hacer una consulta.',
  },
  email: 'contacto@refrizer.cl',
  address: 'Santiago, Chile',
  city: 'Santiago, Chile',
  hours: 'Lun - Vie 09:00 a 18:00 | Sáb 09:00 a 13:00',
  social: {
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
  },
  hero: {
    eyebrow: 'Soluciones que enfrían y conectan',
    titleLines: ['Refrigeración y', 'Electricidad para'],
    titleHighlight: 'tu hogar o negocio',
    subtitle: 'Venta de productos, instalación y mantención con la mejor calidad y asesoría especializada.',
    trust: [
      { icon: 'delivery', title: 'Entrega', subtitle: 'coordinada' },
      { icon: 'shield', title: 'Productos', subtitle: 'de calidad' },
      { icon: 'headset', title: 'Asesoría', subtitle: 'en tu compra' },
    ],
    floatingCard: { title: 'Equipos de Climatización', subtitle: 'Venta e instalación', href: '/servicios' },
  },
  services: {
    eyebrow: 'Nuestros servicios',
    title: 'Instalación, mantención',
    titleHighlight: 'y reparación',
    text: 'Contamos con un equipo técnico especializado para garantizar el correcto funcionamiento de tus equipos.',
    items: [
      { icon: 'snowflake', title: 'Instalación de aire acondicionado', text: 'Montaje de equipos split y ventana con materiales certificados.' },
      { icon: 'gear', title: 'Mantención y limpieza de equipos', text: 'Planes preventivos para alargar la vida útil y reducir consumo.' },
      { icon: 'wrench', title: 'Reparación de refrigeradores', text: 'Diagnóstico y reparación de equipos domésticos y comerciales.' },
      { icon: 'bolt', title: 'Instalaciones eléctricas', text: 'Tableros, circuitos y enchufes con normativa SEC.' },
      { icon: 'clipboard', title: 'Revisión y asesoría técnica', text: 'Te ayudamos a elegir el equipo correcto para tu espacio.' },
    ],
  },
  benefits: [
    { icon: 'delivery', title: 'Entrega coordinada', text: 'Coordinamos la entrega contigo' },
    { icon: 'shield', title: 'Productos originales', text: 'y con garantía' },
    { icon: 'card', title: 'Pago seguro', text: 'con Mercado Pago' },
    { icon: 'headset', title: 'Asesoría personalizada', text: 'en todo momento' },
  ],
  about: {
    eyebrow: 'Sobre Refrizer',
    title: 'Soluciones que',
    highlightBlue: 'enfrían',
    highlightOrange: 'conectan',
    text: 'En Refrizer nos especializamos en brindar soluciones integrales en refrigeración y electricidad, con productos de calidad y un servicio técnico confiable. Nuestro compromiso es entregarte la mejor atención, asesoría y soporte en cada proyecto.',
    values: [
      { title: 'Experiencia técnica', text: 'Equipo con años en climatización y electricidad.' },
      { title: 'Atención cercana', text: 'Te acompañamos antes, durante y después de tu compra.' },
      { title: 'Calidad garantizada', text: 'Trabajamos con marcas y materiales certificados.' },
    ],
  },
  // Logo opcional: archivo en public/images/clientes/ (p. ej. '/images/clientes/easy.png'). Sin logo se muestra el nombre.
  clients: {
    title: 'Clientes que confían en nosotros',
    items: [
      { name: 'Easy', logo: '/images/clientes/easy.webp' },
      { name: 'Cruz Verde', logo: '/images/clientes/cruz-verde.webp' },
      { name: 'Galería Casa Colorada', logo: '/images/clientes/galeria-casa-colorada.webp' },
      { name: 'Estacionamientos Catedral', logo: '/images/clientes/estacionamientos-catedral.webp' },
      { name: 'CK Equipamiento Aeronáutico', logo: '/images/clientes/ck-equipamiento-aeronautico.webp' },
      { name: 'Unión Árabe de Beneficencia', logo: '/images/clientes/union-arabe-de-beneficencia.webp' },
    ] as { name: string; logo?: string }[],
  },
  paymentMethods: ['Mercado Pago'],
  shipping: { enabled: false },
  delivery: {
    text: 'Coordinamos la entrega contigo',
    detail: 'Una vez confirmado tu pago te contactaremos para acordar la entrega o retiro.',
  },
  flags: {
    showFeatured: true,
    showWhatsappButton: true,
    showSearch: true,
  },
  currency: 'CLP',
}

export type SiteConfig = typeof site
