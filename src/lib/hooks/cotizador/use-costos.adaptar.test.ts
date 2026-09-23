/**
 * La pantalla de Costos lee lo que el agente MANDA (22-09): antes esperaba
 * `key`/`label`/`sources`/`kpis` que el agente nunca mandó y se caía al primer
 * dato. Ver el bloque 🔴 de `use-costos.ts`.
 */
import { describe, it, expect } from 'vitest'
import { resumenDesdeElAgente, serieMensualDesdeDias } from './use-costos'

describe('resumenDesdeElAgente', () => {
  const delAgente = {
    costPerQuoteUsd: 0.42,
    monthlyBurnUsd: 12.5,
    forecast30dUsd: null,
    anthropicTotal: '10.2500',
    carrierApiTotal: '2.0000',
    sekureCommissionTotal: '0.2500',
    datacreditoTotal: '0.0000',
    costSources: [
      { source: 'anthropic', populated: true, computationStrategyNote: null },
      { source: 'carrier_api', populated: false, computationStrategyNote: 'Sin API todavía' },
      { source: 'fuente_nueva', populated: true, computationStrategyNote: null },
    ],
    generatedAt: '2026-09-22T00:00:00Z',
  }

  it('toma los KPI y los totales de donde el agente los pone, como números', () => {
    const r = resumenDesdeElAgente(delAgente)
    expect(r.kpis).toEqual({ costPerQuoteUsd: 0.42, monthlyBurnUsd: 12.5, forecast30dUsd: null })
    expect(r.sources).toEqual({
      anthropicTotal: 10.25,
      carrierApiTotal: 2,
      sekureCommissionTotal: 0.25,
      datacreditoTotal: 0,
    })
  })

  it('cada fuente trae una `key` que la pantalla puede usar, y un nombre', () => {
    const r = resumenDesdeElAgente(delAgente)
    expect(r.costSources.map((f) => f.key)).toEqual(['anthropic', 'carrier_api', 'fuente_nueva'])
    expect(r.costSources[1]).toMatchObject({ label: 'API de las aseguradoras', populated: false, notes: 'Sin API todavía' })
    // Una fuente que no conocemos muestra su nombre crudo, no «undefined».
    expect(r.costSources[2].label).toBe('fuente_nueva')
  })
})

describe('serieMensualDesdeDias', () => {
  it('suma los días del agente por mes, en orden, con el rótulo del gráfico', () => {
    const dia = (day: string, total: string) => ({
      day,
      anthropicCostUsd: total,
      carrierApiCostUsd: '0',
      sekureCommissionUsd: '0',
      datacreditoCostUsd: '0',
      totalCostUsd: total,
      quoteCount: 1,
    })
    const s = serieMensualDesdeDias([
      dia('2026-09-02 00:00:00+00', '1.5'),
      dia('2026-08-30 00:00:00+00', '2'),
      dia('2026-09-10 00:00:00+00', '0.5'),
    ])
    expect(s.rows.map((r) => [r.period, r.total])).toEqual([
      ['Aug 26', 2],
      ['Sep 26', 2],
    ])
  })

  it('sin días no hay filas (y nada que se caiga)', () => {
    expect(serieMensualDesdeDias([]).rows).toEqual([])
  })
})
