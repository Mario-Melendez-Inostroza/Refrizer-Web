import type { Category } from '@/types'
import { placeholder } from '@/lib/placeholder'

const cat = (id: number, name: string, slug: string): Category => ({
  id,
  name,
  slug,
  image: { id: id * 100, src: placeholder('', 240, 200), alt: name },
})

export const mockCategories: Category[] = [
  cat(1, 'Aire acondicionado', 'aire-acondicionado'),
  cat(2, 'Refrigeración', 'refrigeracion'),
  cat(3, 'Automáticos y protecciones', 'automaticos-y-protecciones'),
  cat(4, 'Enchufes e interruptores', 'enchufes-e-interruptores'),
  cat(5, 'Cables y conductores', 'cables-y-conductores'),
  cat(6, 'Iluminación', 'iluminacion'),
  cat(7, 'Otros', 'otros'),
]
