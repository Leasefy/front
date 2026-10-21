import { describe, it, expect } from 'vitest'

import { queTeToca } from './que-te-toca'
import type { VistaDeTuArriendo } from './tu-arriendo'

const base = { aprobacionVigente: true, postulacionesEnCurso: 0, es: true, plata: (n: number) => `$${n}`, dia: (d: string) => d }
const vista = (v: Partial<VistaDeTuArriendo>): VistaDeTuArriendo =>
  ({ inmuebles: [], vencido: null, proximo: null, alDia: true, ...v }) as VistaDeTuArriendo

describe('«Te toca» del Inicio del inquilino', () => {
  it('quien arrienda y debe: pagar lo vencido, con el camino a Pagos', () => {
    const r = queTeToca({ ...base, arrienda: true, vista: vista({ vencido: { valor: 1850000, cuotas: 1, desde: '2026-10-05', enMora: true, diasDeMora: 16 }, alDia: false }) })
    expect(r).toEqual({ texto: 'Te toca: pagar $1850000, vencido desde el 2026-10-05.', href: '/inquilino/pagos' })
  })
  it('sin vencido: el próximo pago', () => {
    const r = queTeToca({ ...base, arrienda: true, vista: vista({ proximo: { valor: 1850000, fecha: '2026-11-05', cuantas: 1 }, alDia: false }) })
    expect(r?.texto).toBe('Te toca: pagar $1850000 antes del 2026-11-05.')
  })
  it('al día: lo dice, sin botón', () => {
    expect(queTeToca({ ...base, arrienda: true, vista: vista({}) })).toEqual({ texto: 'Estás al día con tu arriendo.' })
  })
  it('mientras carga su arriendo no afirma nada', () => {
    expect(queTeToca({ ...base, arrienda: true, vista: null })).toBeNull()
  })
  it('quien busca: primero su tope, después sus postulaciones, después su catálogo', () => {
    expect(queTeToca({ ...base, arrienda: false, vista: null, aprobacionVigente: false })?.href).toBe('/inquilino/aprobacion')
    expect(queTeToca({ ...base, arrienda: false, vista: null, postulacionesEnCurso: 2 })?.texto).toContain('2 postulaciones en curso')
    expect(queTeToca({ ...base, arrienda: false, vista: null })?.href).toBe('/inquilino/para-ti')
  })
})
