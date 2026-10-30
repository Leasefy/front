/**
 * La sugerencia de meses para diferir una reparación (Nico, 28-10-2026: «según la cotización… tener en cuenta el valor
 * del canon»; el tope, «configurable»).
 */
import { describe, expect, it } from 'vitest'

import { sugerenciaDeMeses } from './sugerencia-de-meses'

describe('sugerenciaDeMeses', () => {
  it('$11.000.000 con canon de $6.100.000 y tope de 30 %: 7 meses de hasta $1.830.000', () => {
    const s = sugerenciaDeMeses({ totalCop: 11_000_000, canonCop: 6_100_000, topePct: 30, mesesQueQuedan: 24 })
    expect(s).toMatchObject({ meses: 7, necesarios: 7, topeCop: 1_830_000, alcanza: true })
    expect(s!.cuotaMasAltaCop).toBeLessThanOrEqual(1_830_000)
  })

  it('cabe justo en un mes: no se sugiere diferir de más', () => {
    expect(sugerenciaDeMeses({ totalCop: 600_000, canonCop: 2_000_000, topePct: 30, mesesQueQuedan: 12 })).toMatchObject({
      meses: 1,
      alcanza: true,
    })
  })

  it('la diferencia que va al último mes también cuenta contra el tope', () => {
    // Tope $333.334,50: en 3 meses serían 333.334 + 333.334 + 333.335 (el último pasa) → hacen falta 4.
    const s = sugerenciaDeMeses({ totalCop: 1_000_003, canonCop: 1_111_115, topePct: 30, mesesQueQuedan: 12 })
    expect(s!.necesarios).toBe(4)
    expect(s!.cuotaMasAltaCop).toBeLessThanOrEqual(333_334.5)
  })

  it('el contrato no tiene tantos meses: sugiere los que quedan y dice que no alcanza', () => {
    expect(sugerenciaDeMeses({ totalCop: 11_000_000, canonCop: 6_100_000, topePct: 30, mesesQueQuedan: 4 })).toMatchObject({
      meses: 4,
      necesarios: 7,
      alcanza: false,
    })
  })

  it('sin canon, sin tope, sin total o sin meses: no sugiere nada', () => {
    expect(sugerenciaDeMeses({ totalCop: 1_000_000, canonCop: null, topePct: 30, mesesQueQuedan: 12 })).toBeNull()
    expect(sugerenciaDeMeses({ totalCop: 1_000_000, canonCop: 2_000_000, topePct: undefined, mesesQueQuedan: 12 })).toBeNull()
    expect(sugerenciaDeMeses({ totalCop: 0, canonCop: 2_000_000, topePct: 30, mesesQueQuedan: 12 })).toBeNull()
    expect(sugerenciaDeMeses({ totalCop: 1_000_000, canonCop: 2_000_000, topePct: 30, mesesQueQuedan: 0 })).toBeNull()
  })
})
