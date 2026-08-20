/**
 * prescoring.types.test.ts — el mapeo de estados y el parseo defensivo del
 * pre-scoring de afianzamiento.
 *
 * Lo que se protege acá:
 *  · el mapeo `order`/`evaluation` → `EstadoPreScoring` sigue la tabla que dio
 *    el backend, sin adivinar estados nuevos
 *  · el parseo NUNCA inventa un número: un campo ausente o mal tipado se
 *    convierte en `null`, nunca en `0` ni en un valor por defecto que se pueda
 *    confundir con un dato real
 */

import { describe, it, expect } from 'vitest'

import {
  mapEstadoPreScoring,
  parsePreScoringCurrent,
  tieneEstudioVigente,
  type PreScoringCurrent,
} from './prescoring.types'

describe('mapEstadoPreScoring', () => {
  it('sin current → sin_estudio', () => {
    expect(mapEstadoPreScoring(null)).toBe('sin_estudio')
    expect(mapEstadoPreScoring(undefined)).toBe('sin_estudio')
  })

  it('sin order → sin_estudio', () => {
    expect(mapEstadoPreScoring({ order: null, evaluation: null })).toBe('sin_estudio')
  })

  it('order PENDING_PAYMENT → sin_estudio', () => {
    const current: PreScoringCurrent = {
      order: { status: 'PENDING_PAYMENT', paymentStatus: null, expiresAt: null },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('sin_estudio')
  })

  it('order PAID → en_proceso', () => {
    const current: PreScoringCurrent = {
      order: { status: 'PAID', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('en_proceso')
  })

  it('order STUDY_STARTED → en_proceso', () => {
    const current: PreScoringCurrent = {
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('en_proceso')
  })

  it('evaluation.status started → en_proceso', () => {
    const current: PreScoringCurrent = {
      order: { status: 'PAID', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: { status: 'started', result: null },
    }
    expect(mapEstadoPreScoring(current)).toBe('en_proceso')
  })

  it('evaluation.status awaiting_authorization → en_proceso', () => {
    const current: PreScoringCurrent = {
      order: { status: 'PAID', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: { status: 'awaiting_authorization', result: null },
    }
    expect(mapEstadoPreScoring(current)).toBe('en_proceso')
  })

  it('completed con al menos un carrier viable → aprobado', () => {
    const current: PreScoringCurrent = {
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [
            { name: 'Fianly', productType: null, viable: false, primaMensualCop: null, stubMode: false, motivoRechazo: 'no' },
            { name: 'Sura', productType: null, viable: true, primaMensualCop: 45000, stubMode: false, motivoRechazo: null },
          ],
          fianly: { maxEntrenchmentValue: 2_800_000 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    }
    expect(mapEstadoPreScoring(current)).toBe('aprobado')
  })

  it('completed sin ningún carrier viable → rechazado', () => {
    const current: PreScoringCurrent = {
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [
            { name: 'Sura', productType: null, viable: false, primaMensualCop: null, stubMode: false, motivoRechazo: 'score bajo' },
          ],
          fianly: { maxEntrenchmentValue: null },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    }
    expect(mapEstadoPreScoring(current)).toBe('rechazado')
  })

  it('completed sin result (anómalo) → rechazado, nunca aprobado sin evidencia', () => {
    const current: PreScoringCurrent = {
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: { status: 'completed', result: null },
    }
    expect(mapEstadoPreScoring(current)).toBe('rechazado')
  })

  it('order EXPIRED → expirado', () => {
    const current: PreScoringCurrent = {
      order: { status: 'EXPIRED', paymentStatus: null, expiresAt: '2026-01-01T00:00:00Z' },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('expirado')
  })

  it('order EXPIRED manda incluso con una evaluation completed vieja', () => {
    // El backend no debería mandar las dos cosas juntas, pero si pasa, la
    // orden vencida es la que decide: no se muestra un resultado sobre una
    // ventana que ya cerró.
    const current: PreScoringCurrent = {
      order: { status: 'EXPIRED', paymentStatus: null, expiresAt: '2026-01-01T00:00:00Z' },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Sura', productType: null, viable: true, primaMensualCop: 1, stubMode: false, motivoRechazo: null }],
          fianly: { maxEntrenchmentValue: 1 },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    }
    expect(mapEstadoPreScoring(current)).toBe('expirado')
  })

  it('order ERROR → error', () => {
    const current: PreScoringCurrent = {
      order: { status: 'ERROR', paymentStatus: 'APPROVED', expiresAt: null },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('error')
  })

  it('un status desconocido no inventa un estado: cae a sin_estudio', () => {
    const current: PreScoringCurrent = {
      order: { status: 'ALGO_NUEVO_QUE_NO_CONOCEMOS', paymentStatus: null, expiresAt: null },
      evaluation: null,
    }
    expect(mapEstadoPreScoring(current)).toBe('sin_estudio')
  })

  /*
   * El contrato definitivo lista `order.status ∈ PENDING_PAYMENT | PAID |
   * STUDY_STARTED | COMPLETED | EXPIRED | ERROR`. `COMPLETED` es nuevo:
   * antes solo se derivaba de `evaluation.status === 'completed'`, y una
   * orden que llegara a `COMPLETED` sin ese detalle en `evaluation` se leía
   * como `en_proceso` para siempre — un estado terminal que nunca terminaba.
   */
  describe('order.status COMPLETED', () => {
    it('COMPLETED con al menos un carrier viable → aprobado', () => {
      const current: PreScoringCurrent = {
        order: { status: 'COMPLETED', paymentStatus: 'APPROVED', expiresAt: null },
        evaluation: {
          status: 'completed',
          result: {
            carriers: [
              { name: 'Sura', productType: null, viable: true, primaMensualCop: 45000, stubMode: false, motivoRechazo: null },
            ],
            fianly: { maxEntrenchmentValue: 2_800_000 },
            bureau: { minimumScore: null, monthlyCapacity: null },
          },
        },
      }
      expect(mapEstadoPreScoring(current)).toBe('aprobado')
    })

    it('COMPLETED sin ningún carrier viable → rechazado', () => {
      const current: PreScoringCurrent = {
        order: { status: 'COMPLETED', paymentStatus: 'APPROVED', expiresAt: null },
        evaluation: {
          status: 'completed',
          result: {
            carriers: [
              { name: 'Sura', productType: null, viable: false, primaMensualCop: null, stubMode: false, motivoRechazo: 'score bajo' },
            ],
            fianly: { maxEntrenchmentValue: null },
            bureau: { minimumScore: null, monthlyCapacity: null },
          },
        },
      }
      expect(mapEstadoPreScoring(current)).toBe('rechazado')
    })

    it('COMPLETED sin evaluation → rechazado, lectura conservadora sin evidencia', () => {
      const current: PreScoringCurrent = {
        order: { status: 'COMPLETED', paymentStatus: 'APPROVED', expiresAt: null },
        evaluation: null,
      }
      expect(mapEstadoPreScoring(current)).toBe('rechazado')
    })

    it('COMPLETED con evaluation sin result → rechazado, no inventa un aprobado', () => {
      const current: PreScoringCurrent = {
        order: { status: 'COMPLETED', paymentStatus: 'APPROVED', expiresAt: null },
        evaluation: { status: 'started', result: null },
      }
      expect(mapEstadoPreScoring(current)).toBe('rechazado')
    })

    it('EXPIRED manda incluso sobre un order.status COMPLETED', () => {
      const current: PreScoringCurrent = {
        order: { status: 'EXPIRED', paymentStatus: null, expiresAt: '2026-01-01T00:00:00Z' },
        evaluation: {
          status: 'completed',
          result: {
            carriers: [{ name: 'Sura', productType: null, viable: true, primaMensualCop: 1, stubMode: false, motivoRechazo: null }],
            fianly: { maxEntrenchmentValue: 1 },
            bureau: { minimumScore: null, monthlyCapacity: null },
          },
        },
      }
      expect(mapEstadoPreScoring(current)).toBe('expirado')
    })
  })
})

describe('parsePreScoringCurrent', () => {
  it('parsea el shape completo tal cual lo manda el back (snake_case en carriers)', () => {
    const raw = {
      order: { status: 'STUDY_STARTED', paymentStatus: 'APPROVED', expiresAt: '2026-08-14T00:00:00Z' },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [
            {
              name: 'Fianly',
              product_type: 'afianzamiento',
              viable: true,
              prima_mensual_cop: 52000,
              stub_mode: true,
              motivo_rechazo: null,
            },
            {
              name: 'Sura',
              product_type: 'afianzamiento',
              viable: false,
              prima_mensual_cop: null,
              stub_mode: false,
              motivo_rechazo: 'Score de buró insuficiente',
            },
          ],
          fianly: { maxEntrenchmentValue: 2_800_000 },
          bureau: { minimumScore: 650, monthlyCapacity: 3_000_000 },
        },
      },
    }

    const parsed = parsePreScoringCurrent(raw)

    expect(parsed.order).toEqual({
      status: 'STUDY_STARTED',
      paymentStatus: 'APPROVED',
      expiresAt: '2026-08-14T00:00:00Z',
    })
    expect(parsed.evaluation?.status).toBe('completed')
    expect(parsed.evaluation?.result?.carriers).toEqual([
      {
        name: 'Fianly',
        productType: 'afianzamiento',
        viable: true,
        primaMensualCop: 52000,
        stubMode: true,
        motivoRechazo: null,
        maxAsegurableCop: null,
      },
      {
        name: 'Sura',
        productType: 'afianzamiento',
        viable: false,
        primaMensualCop: null,
        stubMode: false,
        motivoRechazo: 'Score de buró insuficiente',
        maxAsegurableCop: null,
      },
    ])
    expect(parsed.evaluation?.result?.fianly).toEqual({ maxEntrenchmentValue: 2_800_000 })
    expect(parsed.evaluation?.result?.bureau).toEqual({ minimumScore: 650, monthlyCapacity: 3_000_000 })
  })

  it('sin order ni evaluation → los dos quedan null, no un objeto vacío inventado', () => {
    expect(parsePreScoringCurrent({})).toEqual({ order: null, evaluation: null })
  })

  it('data que no es un objeto → los dos quedan null', () => {
    expect(parsePreScoringCurrent(null)).toEqual({ order: null, evaluation: null })
    expect(parsePreScoringCurrent(undefined)).toEqual({ order: null, evaluation: null })
    expect(parsePreScoringCurrent('no-es-un-objeto')).toEqual({ order: null, evaluation: null })
  })

  it('maxEntrenchmentValue null se respeta: nunca se convierte en 0', () => {
    const raw = {
      order: { status: 'STUDY_STARTED' },
      evaluation: {
        status: 'completed',
        result: { carriers: [], fianly: { maxEntrenchmentValue: null }, bureau: {} },
      },
    }
    const parsed = parsePreScoringCurrent(raw)
    expect(parsed.evaluation?.result?.fianly.maxEntrenchmentValue).toBeNull()
    expect(parsed.evaluation?.result?.bureau).toEqual({ minimumScore: null, monthlyCapacity: null })
  })

  it('prima_mensual_cop mal tipado (string) se descarta a null, nunca se inventa', () => {
    const raw = {
      order: { status: 'STUDY_STARTED' },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [
            { name: 'Fianly', viable: true, prima_mensual_cop: 'no-es-un-numero' },
          ],
          fianly: {},
          bureau: {},
        },
      },
    }
    const parsed = parsePreScoringCurrent(raw)
    expect(parsed.evaluation?.result?.carriers[0].primaMensualCop).toBeNull()
  })

  it('un carrier sin name se descarta (dato inservible sin identidad)', () => {
    const raw = {
      order: { status: 'STUDY_STARTED' },
      evaluation: {
        status: 'completed',
        result: { carriers: [{ viable: true }], fianly: {}, bureau: {} },
      },
    }
    const parsed = parsePreScoringCurrent(raw)
    expect(parsed.evaluation?.result?.carriers).toEqual([])
  })

  it('order sin status se descarta a null', () => {
    expect(parsePreScoringCurrent({ order: {} }).order).toBeNull()
  })
})

describe('tieneEstudioVigente', () => {
  // La regla existe para una sola pregunta: ¿tiene sentido que esta persona
  // vea el formulario de /aprobacion? Si el back va a responder `reused:true`
  // al POST, no: ya hay un estudio y el formulario es un callejón sin salida.
  it('estados donde el back reusa el estudio: no se puede pedir uno nuevo', () => {
    expect(tieneEstudioVigente('en_proceso')).toBe(true)
    expect(tieneEstudioVigente('aprobado')).toBe(true)
    expect(tieneEstudioVigente('rechazado')).toBe(true)
  })

  it('sin estudio: el formulario es exactamente lo que corresponde', () => {
    expect(tieneEstudioVigente('sin_estudio')).toBe(false)
  })

  it('expirado y error: la ventana ya cerró, se puede volver a empezar', () => {
    expect(tieneEstudioVigente('expirado')).toBe(false)
    expect(tieneEstudioVigente('error')).toBe(false)
  })
})
