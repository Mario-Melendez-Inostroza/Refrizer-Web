/**
 * DATOS DE EJEMPLO — solo los usa /services.
 * Reemplazar por la API de WooCommerce sin tocar componentes.
 */
import type { Category, Product } from '../types'

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1080&q=80`

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Café en grano', slug: 'cafe-en-grano', description: 'Orígenes de temporada, tostados cada semana en Valdivia.', image: { src: u('photo-1540965555-ef9a836372ed'), alt: 'Granos de café tostado vistos de cerca' } },
  { id: 2, name: 'Café molido', slug: 'cafe-molido', description: 'Molienda a pedido para tu método favorito.', image: { src: u('photo-1562051036-e0eea191d42f'), alt: 'Saco blanco lleno de café' } },
  { id: 3, name: 'Tazas y cerámica', slug: 'tazas-y-ceramica', description: 'Piezas hechas a mano por ceramistas del sur.', image: { src: u('photo-1536936812504-0e77dc3f0b40'), alt: 'Dos tazas blancas de cerámica' } },
  { id: 4, name: 'Accesorios', slug: 'accesorios', description: 'Herramientas para preparar mejor en casa.', image: { src: u('photo-1669303503510-b17e5947abaa'), alt: 'Mano vertiendo agua sobre un filtro de café' } },
]

const cat = (slug: string) => {
  const c = MOCK_CATEGORIES.find((x) => x.slug === slug)!
  return { id: c.id, name: c.name, slug: c.slug }
}

const base = (p: Omit<Product, 'price'>): Product => ({ ...p, price: p.salePrice ?? p.regularPrice })

export const MOCK_PRODUCTS: Product[] = [
  base({ id: 101, name: 'Huila Lavado', slug: 'huila-lavado', shortDescription: 'Colombia · panela, cereza negra, cacao.', description: 'Un lavado clásico de la región de Huila, cultivado a 1.750 msnm. Dulzor de panela, acidez de cereza negra y un final largo a cacao. Ideal para filtrado y espresso.', regularPrice: 12990, salePrice: null, images: [{ src: u('photo-1559056199-641a0ac8b55e'), alt: 'Bolsa de café Huila sobre mesa' }, { src: u('photo-1524350876685-274059332603'), alt: 'Granos de café en saco de yute' }], categories: [cat('cafe-en-grano')], stockStatus: 'instock', stockQuantity: 40, featured: true }),
  base({ id: 102, name: 'Sidamo Natural', slug: 'sidamo-natural', shortDescription: 'Etiopía · arándano, jazmín, miel.', description: 'Proceso natural secado en camas africanas. Notas intensas de arándano y jazmín con cuerpo sedoso.', regularPrice: 15990, salePrice: 13490, images: [{ src: u('photo-1685798830559-c116586a0d33'), alt: 'Bolsa de café Sidamo sobre madera' }, { src: u('photo-1620820186187-fc32e79adb74'), alt: 'Granos de café sobre superficie negra' }], categories: [cat('cafe-en-grano')], stockStatus: 'lowstock', stockQuantity: 3, featured: true }),
  base({ id: 103, name: 'Cajamarca Honey', slug: 'cajamarca-honey', shortDescription: 'Perú · durazno, caramelo, almendra.', description: 'Proceso honey de pequeños productores de Cajamarca. Taza redonda y dulce para todos los días.', regularPrice: 11990, salePrice: null, images: [{ src: u('photo-1642437271884-fe1d3393eef9'), alt: 'Bolsa de café Cajamarca' }], categories: [cat('cafe-en-grano')], stockStatus: 'outofstock', stockQuantity: 0 }),
  base({ id: 104, name: 'Mezcla Austral Molido', slug: 'mezcla-austral-molido', shortDescription: 'Brasil + Colombia · chocolate, nuez.', description: 'Nuestra mezcla de la casa, molida para cafetera italiana o prensa francesa. Indica la molienda en las notas del pedido.', regularPrice: 9990, salePrice: 8490, images: [{ src: u('photo-1695245503558-5cdb37f49092'), alt: 'Bolsa de papel kraft con café molido' }], categories: [cat('cafe-molido')], stockStatus: 'instock', stockQuantity: 60, featured: true }),
  base({ id: 105, name: 'Descafeinado Suizo', slug: 'descafeinado-suizo', shortDescription: 'México · proceso Swiss Water.', description: 'Descafeinado sin químicos que conserva el dulzor. Notas de caramelo y manzana asada.', regularPrice: 12490, salePrice: null, images: [{ src: u('photo-1605711599412-775918dbe770'), alt: 'Bolsa blanca de café sobre mesa de madera' }], categories: [cat('cafe-molido')], stockStatus: 'instock', stockQuantity: 18 }),
  base({ id: 106, name: 'Taza Niebla', slug: 'taza-niebla', shortDescription: 'Gres esmaltado · 240 ml.', description: 'Taza torneada a mano en Chiloé con esmalte mate color niebla. Apta para lavavajillas.', regularPrice: 14990, salePrice: null, images: [{ src: u('photo-1590422749897-47036da0b0ff'), alt: 'Taza blanca de cerámica sobre mesa blanca' }, { src: u('photo-1617076678363-99dd6eb5150b'), alt: 'Taza blanca sobre textil' }], categories: [cat('tazas-y-ceramica')], stockStatus: 'instock', stockQuantity: 12, featured: true }),
  base({ id: 107, name: 'Taza Mar Azul', slug: 'taza-mar-azul', shortDescription: 'Cerámica esmaltada · 300 ml.', description: 'Esmalte azul profundo que cambia con la luz. Cada pieza es única.', regularPrice: 16990, salePrice: 13990, images: [{ src: u('photo-1620051787220-50768889e32c'), alt: 'Agua vertida en taza azul de cerámica' }], categories: [cat('tazas-y-ceramica')], stockStatus: 'lowstock', stockQuantity: 2 }),
  base({ id: 108, name: 'Jarra Cuello de Cisne', slug: 'jarra-cuello-de-cisne', shortDescription: 'Acero inoxidable · 600 ml.', description: 'Control de vertido preciso para V60, Chemex y Kalita.', regularPrice: 29990, salePrice: null, images: [{ src: u('photo-1509490927285-34bd4d057c88'), alt: 'Persona sosteniendo una jarra de acero junto a la ventana' }], categories: [cat('accesorios')], stockStatus: 'instock', stockQuantity: 9, featured: true }),
  base({ id: 109, name: 'Dosificador Espresso', slug: 'dosificador-espresso', shortDescription: 'Acero · 58 mm.', description: 'Dosificador para preparar la dosis exacta antes de moler.', regularPrice: 8990, salePrice: null, images: [{ src: u('photo-1666445844615-0a3930270f13'), alt: 'Pequeño recipiente metálico para café' }], categories: [cat('accesorios')], stockStatus: 'instock', stockQuantity: 25 }),
]
