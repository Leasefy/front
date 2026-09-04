import { describe, it, expect } from 'vitest'

import type { ConciliacionSummaryTaxonomy } from './use-conciliacion-summary'
import {
  etiquetaDeRevision,
  fraseDeHallazgos,
  hallazgosPorTipo,
  totalClasificado,
} from './hallazgos'

function taxonomia(sobre: Partial<ConciliacionSummaryTaxonomy> = {}): ConciliacionSummaryTaxonomy {
  return {
    parciales: 0,
    duplicados: 0,
    diferencias_monto: 0,
    fuera_de_fecha: 0,
    sin_identificar: 0,
    ...sobre,
  }
}

describe('hallazgosPorTipo', () => {
  it('deja fuera los tipos en cero y ordena del más numeroso al menos', () => {
    const h = hallazgosPorTipo(taxonomia({ parciales: 2, duplicados: 5, fuera_de_fecha: 1 }))
    expect(h.map((x) => [x.tipo, x.cantidad])).toEqual([
      ['duplicados', 5],
      ['parciales', 2],
      ['fuera_de_fecha', 1],
    ])
  })

  it('con empate manda el orden canónico, para que la lista no baile entre refrescos', () => {
    const h = hallazgosPorTipo(taxonomia({ sin_identificar: 3, parciales: 3, duplicados: 3 }))
    expect(h.map((x) => x.tipo)).toEqual(['parciales', 'duplicados', 'sin_identificar'])
  })

  it('sin taxonomía (el back todavía no la trae) devuelve la lista vacía', () => {
    expect(hallazgosPorTipo(null)).toEqual([])
    expect(hallazgosPorTipo(undefined)).toEqual([])
    expect(totalClasificado(null)).toBe(0)
  })

  it('totalClasificado suma sólo lo que la taxonomía sabe', () => {
    expect(totalClasificado(taxonomia({ parciales: 2, duplicados: 1 }))).toBe(3)
  })
})

describe('fraseDeHallazgos', () => {
  it('sin cola no hay frase: la tarjeta dice otra cosa', () => {
    expect(fraseDeHallazgos(0, taxonomia())).toBe('')
    expect(fraseDeHallazgos(0, taxonomia({ parciales: 4 }))).toBe('')
  })

  it('el ejemplo de Nico: 2 parciales + 1 duplicado sobre 3 en cola', () => {
    expect(fraseDeHallazgos(3, taxonomia({ parciales: 2, duplicados: 1 }))).toBe(
      '3 movimientos necesitan tu ojo: 2 pagos parciales y 1 duplicado.',
    )
  })

  it('un solo tipo que explica toda la cola se nombra por su tipo', () => {
    expect(fraseDeHallazgos(3, taxonomia({ parciales: 3 }))).toBe(
      '3 pagos parciales necesitan tu ojo.',
    )
    expect(fraseDeHallazgos(1, taxonomia({ duplicados: 1 }))).toBe('1 duplicado necesita tu ojo.')
  })

  it('cola sin taxonomía: dice el total y no inventa el desglose', () => {
    // `case_type` es aditiva; hasta que la migración esté aplicada el back la
    // omite fail-soft. Decir «nada pendiente» acá sería mentir sobre plata.
    expect(fraseDeHallazgos(4, taxonomia())).toBe('4 movimientos necesitan tu ojo.')
    expect(fraseDeHallazgos(1, null)).toBe('1 movimiento necesita tu ojo.')
  })

  it('nombra tres tipos como mucho y agrupa el resto', () => {
    expect(
      fraseDeHallazgos(
        12,
        taxonomia({
          parciales: 4,
          duplicados: 3,
          diferencias_monto: 3,
          fuera_de_fecha: 1,
          sin_identificar: 1,
        }),
      ),
    ).toBe(
      '12 movimientos necesitan tu ojo: 4 pagos parciales, 3 duplicados, 3 diferencias de monto y 2 casos más.',
    )
  })

  it('la taxonomía puede quedar corta contra la cola y la frase no la fuerza', () => {
    // 5 en cola pero sólo 2 clasificados: se dice el total real y lo que se sabe.
    expect(fraseDeHallazgos(5, taxonomia({ parciales: 2 }))).toBe(
      '5 movimientos necesitan tu ojo: 2 pagos parciales.',
    )
  })
})

describe('etiquetaDeRevision', () => {
  it('concuerda en número', () => {
    expect(etiquetaDeRevision(1)).toBe('Revisar 1 caso')
    expect(etiquetaDeRevision(3)).toBe('Revisar 3 casos')
  })
})
