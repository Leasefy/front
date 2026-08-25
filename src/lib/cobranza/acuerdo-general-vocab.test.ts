import { describe, it, expect } from 'vitest'

import {
  condicionesDe,
  cuandoAplica,
  queOfrece,
  resumenAcuerdoGeneral,
  avisosDelAcuerdoGeneral,
  type AcuerdoGeneral,
} from './acuerdo-general-vocab'

const acuerdo = (over: Partial<AcuerdoGeneral> = {}): AcuerdoGeneral => ({
  id: 'a-1',
  name: 'Cierre rápido',
  priority: 0,
  active: true,
  stages: [],
  minDaysOverdue: null,
  maxDaysOverdue: null,
  minAmountCop: null,
  maxAmountCop: null,
  discountPct: 40,
  discountKind: 'intereses_parcial',
  maxInstallments: 3,
  minInitialPct: 30,
  conditionEs: 'Firma en 7 días',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  ...over,
})

/** `toLocaleString('es-CO')` puede usar espacio duro; acá no lo comparamos. */
const sinEspacioDuro = (s: string) => s.replace(/ /g, ' ')

describe('condicionesDe', () => {
  it('sin condiciones, no dice nada', () => {
    expect(condicionesDe(acuerdo())).toEqual([])
  })

  it('nombra las etapas en español, no los códigos', () => {
    expect(condicionesDe(acuerdo({ stages: ['S2', 'S3'] }))[0]).toBe(
      'Mora administrativa, Mora pre-jurídica',
    )
  })

  it('un rango completo de días se dice como rango', () => {
    expect(condicionesDe(acuerdo({ minDaysOverdue: 16, maxDaysOverdue: 45 }))).toEqual([
      'de 16 a 45 días de mora',
    ])
  })

  it('un rango a medias se dice a medias, no se completa con un 0', () => {
    // «de 16 a 0 días» sería falso y además imposible.
    expect(condicionesDe(acuerdo({ minDaysOverdue: 16 }))).toEqual([
      'desde 16 días de mora',
    ])
    expect(condicionesDe(acuerdo({ maxDaysOverdue: 45 }))).toEqual([
      'hasta 45 días de mora',
    ])
  })

  it('«0 días» es una condición real, no una ausencia', () => {
    expect(condicionesDe(acuerdo({ minDaysOverdue: 0 }))).toEqual([
      'desde 0 días de mora',
    ])
  })

  it('los montos van con separador de miles', () => {
    const [frase] = condicionesDe(acuerdo({ minAmountCop: 500_000, maxAmountCop: 5_000_000 }))
    expect(sinEspacioDuro(frase ?? '')).toBe('entre $500.000 y $5.000.000')
  })

  it('acumula todas las condiciones que haya', () => {
    expect(
      condicionesDe(
        acuerdo({ stages: ['S2'], minDaysOverdue: 16, maxAmountCop: 5_000_000 }),
      ),
    ).toHaveLength(3)
  })
})

describe('cuandoAplica', () => {
  it('sin condiciones dice a quién aplica, no una lista vacía', () => {
    expect(cuandoAplica(acuerdo())).toBe('Cualquier deudor')
  })

  it('junta las condiciones con separador', () => {
    expect(cuandoAplica(acuerdo({ stages: ['S2'], minDaysOverdue: 16 }))).toBe(
      'Mora administrativa · desde 16 días de mora',
    )
  })
})

describe('queOfrece', () => {
  it('descuento + cuotas + inicial', () => {
    expect(queOfrece(acuerdo())).toBe(
      '40% de descuento sobre intereses, en hasta 3 cuotas, con 30% inicial',
    )
  })

  it('un descuento en 0 no se menciona', () => {
    // «0% de descuento» suena a que hay descuento y es cero.
    expect(queOfrece(acuerdo({ discountPct: 0 }))).toBe(
      'en hasta 3 cuotas, con 30% inicial',
    )
  })

  it('sin cuotas dice «en un solo pago», no «en hasta 0 cuotas»', () => {
    expect(queOfrece(acuerdo({ maxInstallments: 0 }))).toBe(
      '40% de descuento sobre intereses, en un solo pago',
    )
  })

  it('sin cuotas no menciona el inicial: el inicial ES el total', () => {
    expect(queOfrece(acuerdo({ maxInstallments: 0, minInitialPct: 30 }))).not.toContain(
      'inicial',
    )
  })

  it('una cuota se dice en singular', () => {
    expect(queOfrece(acuerdo({ maxInstallments: 1 }))).toContain('en 1 cuota')
  })

  it('el 100% de inicial no se enuncia junto a las cuotas', () => {
    expect(queOfrece(acuerdo({ minInitialPct: 100 }))).not.toContain('inicial')
  })

  it('distingue descuento total de parcial', () => {
    expect(queOfrece(acuerdo({ discountKind: 'intereses_total' }))).toContain(
      'de los intereses',
    )
  })
})

describe('resumenAcuerdoGeneral', () => {
  it('dice a quién, qué, y que es sin preguntar', () => {
    const r = resumenAcuerdoGeneral(acuerdo({ stages: ['S2'] }))
    expect(r).toContain('Mora administrativa')
    expect(r).toContain('40% de descuento')
    expect(r).toContain('sin preguntarte')
  })

  it('sin condiciones arranca por «A cualquier deudor»', () => {
    expect(resumenAcuerdoGeneral(acuerdo())).toMatch(/^A cualquier deudor/)
  })

  /**
   * Decía «A quien esté en de 16 a 45 días de mora». La preposición sólo casaba
   * con la etapa; con el rango de días o de monto quedaba «en de» y «en desde».
   */
  it('no encadena preposiciones con ninguna condición', () => {
    const casos = [
      acuerdo({ stages: [], minDaysOverdue: 16, maxDaysOverdue: 45 }),
      acuerdo({ stages: [], minAmountCop: 500_000, maxAmountCop: null }),
      acuerdo({ stages: ['S2'], minDaysOverdue: 16, maxDaysOverdue: 45 }),
    ]
    for (const a of casos) {
      // Sólo la mitad de «a quién»: «en hasta 3 cuotas» del ofrecimiento es
      // español correcto y no tiene nada que ver con esto.
      const alcance = resumenAcuerdoGeneral(a).split(', el agente')[0]!
      expect(alcance).not.toMatch(/\ben (de|desde|hasta|entre)\b/)
    }
  })
})

describe('avisosDelAcuerdoGeneral', () => {
  it('un acuerdo normal no genera avisos', () => {
    expect(avisosDelAcuerdoGeneral(acuerdo())).toEqual([])
  })

  it('avisa que está apagado', () => {
    expect(avisosDelAcuerdoGeneral(acuerdo({ active: false }))[0]).toMatch(/apagado/)
  })

  it('avisa la contradicción de 100% inicial CON cuotas', () => {
    const avisos = avisosDelAcuerdoGeneral(acuerdo({ minInitialPct: 100, maxInstallments: 3 }))
    expect(avisos.some((a) => a.includes('no queda saldo que financiar'))).toBe(true)
  })

  it('100% inicial SIN cuotas es correcto y no avisa nada', () => {
    expect(
      avisosDelAcuerdoGeneral(acuerdo({ minInitialPct: 100, maxInstallments: 0 })),
    ).toEqual([])
  })

  it('avisa cuando sólo aplica en una etapa donde ya no se negocia', () => {
    expect(avisosDelAcuerdoGeneral(acuerdo({ stages: ['S5'] }))[0]).toMatch(/nunca se use/)
  })

  it('S5 junto a otras etapas no dispara ese aviso', () => {
    expect(avisosDelAcuerdoGeneral(acuerdo({ stages: ['S2', 'S5'] }))).toEqual([])
  })
})
