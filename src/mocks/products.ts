import type { Product } from '@/types'
import { placeholder } from '@/lib/placeholder'

const imgs = (id: number, name: string, n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: id * 10 + i,
    src: placeholder('Imagen de producto'),
    thumbnail: placeholder('', 160, 160),
    alt: `${name} – imagen ${i + 1}`,
  }))

export const mockProducts: Product[] = [
  {
    id: 101,
    name: 'Aire Acondicionado 12.000 BTU Inverter',
    slug: 'aire-acondicionado-12000-btu-inverter',
    prices: { price: '399990', regular_price: '429990', sale_price: '399990', currency_code: 'CLP', currency_minor_unit: 0 },
    images: imgs(101, 'Aire Acondicionado 12.000 BTU Inverter'),
    categories: [{ id: 1, name: 'Aire acondicionado', slug: 'aire-acondicionado' }],
    short_description: '<p>Equipo split muro frío/calor con tecnología inverter, ideal para espacios de hasta 30 m².</p>',
    description: '<p>Bajo consumo energético, funcionamiento silencioso y control remoto con modo sueño. Incluye unidad interior y exterior.</p><ul><li>Capacidad: 12.000 BTU</li><li>Eficiencia energética A++</li><li>Gas refrigerante R32</li></ul>',
    is_in_stock: true,
    featured: true,
  },
  {
    id: 102,
    name: 'Interruptor Automático 2x25A',
    slug: 'interruptor-automatico-2x25a',
    prices: { price: '12990', regular_price: '12990', sale_price: '', currency_code: 'CLP', currency_minor_unit: 0 },
    images: imgs(102, 'Interruptor Automático 2x25A'),
    categories: [{ id: 3, name: 'Automáticos y protecciones', slug: 'automaticos-y-protecciones' }],
    short_description: '<p>Protección termomagnética bipolar curva C para tableros residenciales.</p>',
    description: '<p>Montaje en riel DIN, capacidad de ruptura 6 kA. Certificado SEC.</p>',
    is_in_stock: true,
    featured: true,
  },
  {
    id: 103,
    name: 'Cable Eléctrico 2.5 mm 100 metros',
    slug: 'cable-electrico-2-5-mm-100-metros',
    prices: { price: '29990', regular_price: '29990', sale_price: '', currency_code: 'CLP', currency_minor_unit: 0 },
    images: imgs(103, 'Cable Eléctrico 2.5 mm 100 metros'),
    categories: [{ id: 5, name: 'Cables y conductores', slug: 'cables-y-conductores' }],
    short_description: '<p>Rollo de cable THHN 2.5 mm² de cobre, aislación libre de halógenos.</p>',
    description: '<p>Ideal para circuitos de enchufes e iluminación. Rollo de 100 metros.</p>',
    is_in_stock: false,
    featured: true,
  },
]
