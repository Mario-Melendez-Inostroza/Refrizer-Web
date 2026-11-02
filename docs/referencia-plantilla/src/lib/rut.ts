export function cleanRut(rut: string) {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

/** Valida formato y dígito verificador de un RUT chileno */
export function isValidRut(rut: string): boolean {
  const c = cleanRut(rut)
  if (!/^\d{7,8}[0-9K]$/.test(c)) return false
  const body = c.slice(0, -1)
  const dv = c.slice(-1)
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const res = 11 - (sum % 11)
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res)
  return dv === expected
}

export function formatRut(rut: string) {
  const c = cleanRut(rut)
  if (c.length < 2) return c
  const body = c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${body}-${c.slice(-1)}`
}
