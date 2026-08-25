import { describe, it, expect } from 'vitest'

import { parsePreScoringCurrent } from './prescoring.types'
import { mapPreScoringToAprobacion } from './aprobacion-from-prescoring'

/**
 * The tope aprobado is the MAX backing across every carrier
 * (`carriers[].max_asegurable_cop`), not just Fianly — so a mock/future carrier
 * that respalda hasta $X keeps the person aprobado hasta $X even when Fianly
 * rejected. Fianly's `maxEntrenchmentValue` is only a fallback for an old micro
 * build that doesn't yet send `max_asegurable_cop`.
 */

interface RawCarrier {
  name: string
  viable: boolean
  stub_mode?: boolean
  max_asegurable_cop?: number | null
}

function rawCurrent(
  carriers: RawCarrier[],
  fianlyMax: number | null = null,
  orderStatus = 'COMPLETED',
) {
  return {
    order: { status: orderStatus, paymentStatus: null, expiresAt: null },
    evaluation: {
      status: 'completed',
      result: {
        carriers,
        fianly: { maxEntrenchmentValue: fianlyMax },
        bureau: { minimumScore: null, monthlyCapacity: null },
      },
    },
  }
}

describe('parsePreScoringCurrent — max_asegurable_cop', () => {
  it('maps snake_case max_asegurable_cop → maxAsegurableCop', () => {
    const current = parsePreScoringCurrent(
      rawCurrent([{ name: 'sura', viable: true, max_asegurable_cop: 3_000_000 }]),
    )
    expect(current.evaluation?.result?.carriers[0]?.maxAsegurableCop).toBe(3_000_000)
  })

  it('defaults maxAsegurableCop to null when absent or malformed', () => {
    const current = parsePreScoringCurrent(
      rawCurrent([
        { name: 'fianly', viable: false },
        { name: 'mapfre', viable: true, max_asegurable_cop: null },
      ]),
    )
    const byName = Object.fromEntries(
      (current.evaluation?.result?.carriers ?? []).map((c) => [c.name, c]),
    )
    expect(byName.fianly?.maxAsegurableCop).toBeNull()
    expect(byName.mapfre?.maxAsegurableCop).toBeNull()
  })
})

describe('mapPreScoringToAprobacion — tope = max across carriers', () => {
  it('takes the highest backing across carriers (mock wins when Fianly rejects)', () => {
    const ap = mapPreScoringToAprobacion(
      parsePreScoringCurrent(
        rawCurrent([
          { name: 'fianly', viable: false, stub_mode: false, max_asegurable_cop: null },
          { name: 'sura', viable: true, stub_mode: true, max_asegurable_cop: 2_500_000 },
          { name: 'mapfre', viable: true, stub_mode: true, max_asegurable_cop: 2_000_000 },
        ]),
      ),
    )
    // A viable mock → aprobado; tope = max(2.5M, 2.0M) = 2.5M.
    expect(ap.estado).toBe('aprobado')
    expect(ap.topeAprobadoCop).toBe(2_500_000)
  })

  it('falls back to fianly.maxEntrenchmentValue when no carrier sends max_asegurable_cop', () => {
    const ap = mapPreScoringToAprobacion(
      parsePreScoringCurrent(
        rawCurrent([{ name: 'fianly', viable: true }], 838_980),
      ),
    )
    expect(ap.estado).toBe('aprobado')
    expect(ap.topeAprobadoCop).toBe(838_980)
  })

  it('never invents a number: all-null backing → topeAprobadoCop null', () => {
    const ap = mapPreScoringToAprobacion(
      parsePreScoringCurrent(
        rawCurrent([{ name: 'sura', viable: true, max_asegurable_cop: null }], null),
      ),
    )
    expect(ap.estado).toBe('aprobado')
    expect(ap.topeAprobadoCop).toBeNull()
  })

  it('rejected study → topeAprobadoCop null even if a carrier leaked a value', () => {
    const ap = mapPreScoringToAprobacion(
      parsePreScoringCurrent(
        rawCurrent([
          { name: 'fianly', viable: false, max_asegurable_cop: 1_800_000 },
        ]),
      ),
    )
    expect(ap.estado).toBe('rechazado')
    expect(ap.topeAprobadoCop).toBeNull()
  })
})
