export const REGIONES: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
  'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara'],
  'Antofagasta': ['Antofagasta', 'Mejillones', 'Taltal', 'Calama', 'Tocopilla', 'San Pedro de Atacama'],
  'Atacama': ['Copiapó', 'Caldera', 'Vallenar', 'Chañaral', 'Huasco'],
  'Coquimbo': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Andacollo'],
  'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'Concón', 'San Antonio', 'Quillota', 'Los Andes', 'San Felipe'],
  'Metropolitana de Santiago': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'La Florida', 'Maipú', 'Puente Alto', 'Vitacura', 'Lo Barnechea', 'La Reina', 'Macul', 'Peñalolén', 'San Miguel', 'Estación Central', 'Recoleta', 'Independencia', 'Quilicura', 'Huechuraba', 'Pudahuel', 'Cerrillos', 'La Cisterna', 'San Bernardo', 'Colina', 'Lampa', 'Talagante', 'Melipilla'],
  "Libertador General Bernardo O'Higgins": ['Rancagua', 'Machalí', 'San Fernando', 'Rengo', 'Pichilemu', 'Santa Cruz'],
  'Maule': ['Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes', 'Molina'],
  'Ñuble': ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Quirihue'],
  'Biobío': ['Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Los Ángeles', 'Coronel', 'Hualpén', 'Tomé'],
  'La Araucanía': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria'],
  'Los Ríos': ['Valdivia', 'La Unión', 'Panguipulli', 'Río Bueno'],
  'Los Lagos': ['Puerto Montt', 'Osorno', 'Puerto Varas', 'Castro', 'Ancud', 'Frutillar'],
  'Aysén del General Carlos Ibáñez del Campo': ['Coyhaique', 'Puerto Aysén', 'Chile Chico'],
  'Magallanes y de la Antártica Chilena': ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams'],
}

/** Valida un RUT chileno (formato 12.345.678-9 o 12345678-9) */
export function isValidRut(rut: string): boolean {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const res = 11 - (sum % 11)
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res)
  return dv === expected
}

export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${body}-${clean.slice(-1)}`
}
