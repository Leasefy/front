import { describe, expect, it } from 'vitest'

import {
  conLosDiasDeGracia,
  diasDeGraciaValidos,
  fraseDelCierre,
  type CierreDeLaPromesa,
} from './promesas-de-pago'

const pesos = (n: number) => `$${n}`

function cierre(over: Partial<CierreDeLaPromesa> = {}): CierreDeLaPromesa {
  return {
    resultado: 'incumplida',
    pagado: 0,
    hasta: '2026-10-14',
    diasDeGracia: 7,
    cerradaAt: '2026-10-15T11:30:00.000Z',
    ...over,
  }
}

describe('diasDeGraciaValidos', () => {
  it('acepta de 0 a 60, sin decimales ni signos', () => {
    expect(diasDeGraciaValidos('0')).toBe(0)
    expect(diasDeGraciaValidos(' 7 ')).toBe(7)
    expect(diasDeGraciaValidos('60')).toBe(60)
    for (const malo of ['', '61', '-1', '2.5', '2,5', 'siete', '007']) {
      expect(diasDeGraciaValidos(malo)).toBeNull()
    }
  })
})

describe('conLosDiasDeGracia', () => {
  it('dice el número con su gramática', () => {
    expect(conLosDiasDeGracia(0)).toBe('sin días de gracia')
    expect(conLosDiasDeGracia(1)).toBe('con 1 día de gracia')
    expect(conLosDiasDeGracia(7)).toBe('con 7 días de gracia')
  })
})

describe('fraseDelCierre', () => {
  it('cumplida dice lo que pagó y hasta cuándo', () => {
    const f = fraseDelCierre(cierre({ resultado: 'cumplida', pagado: 500000 }), 500000, pesos)
    expect(f).toMatch(/^Cumplida: pagó \$500000 hasta el .+ \(con 7 días de gracia\)\.$/)
  })

  it('un pago parcial es incumplida y dice lo que sigue debiendo', () => {
    const f = fraseDelCierre(cierre({ pagado: 200000 }), 500000, pesos)
    expect(f).toContain('Incumplida: pagó $200000 de $500000 hasta el')
    expect(f).toContain('Sigue debiendo $300000.')
  })

  it('sin ningún pago lo dice así, sin «pagó $0»', () => {
    const f = fraseDelCierre(cierre({ diasDeGracia: 0 }), 500000, pesos)
    expect(f).toMatch(/^Incumplida: no entró ningún pago hasta el .+ \(sin días de gracia\)\.$/)
  })
})
