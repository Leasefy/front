/**
 * El día en que vence una cuota del acuerdo (PRUEBAS-PAGOS, 03-10-2026, hallado
 * en el portal del inquilino del laboratorio): el micro manda la fecha como
 * medianoche UTC y en Colombia decía «Vence el 2 de noviembre» de una cuota que
 * vence el 3.
 */
import { describe, expect, it } from 'vitest'

import { formatDiaDeLaCuota } from './CuotaPlanTable'

describe('formatDiaDeLaCuota', () => {
  it('medianoche UTC es ESE día, no el anterior (el huso no corre un día sin hora)', () => {
    expect(formatDiaDeLaCuota('2026-11-03T00:00:00.000Z', 'es')).toBe('3 de noviembre de 2026')
    expect(formatDiaDeLaCuota('2027-01-03T00:00:00.000Z', 'es')).toBe('3 de enero de 2027')
  })

  it('un AAAA-MM-DD también', () => {
    expect(formatDiaDeLaCuota('2026-12-31', 'es')).toBe('31 de diciembre de 2026')
  })

  it('algo que no es una fecha no revienta', () => {
    expect(formatDiaDeLaCuota('mañana', 'es')).toBe('')
  })
})
