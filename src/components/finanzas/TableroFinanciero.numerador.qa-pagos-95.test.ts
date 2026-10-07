/**
 * 🔴 N-06 (QA-PAGOS-95, 05-10-2026): el Tablero decía «% recaudado 9,7 %» al
 * lado de «Entró en el mes $ 31.191.000» y «Se debe del mes $ 162.341.531»,
 * y 31.191.000 ÷ 162.341.531 es 19,2 %. El porcentaje mide lo que entró a las
 * cuotas DEL MES; ahora la tarjeta dice cuánto de cuánto y por qué no es la
 * caja del mes. Sin el numerador (back anterior), la frase de siempre.
 */
import { describe, expect, it } from 'vitest'
import { definicionDeLaTasa } from './TableroFinanciero'
import type { TableroFinanciero } from '@/lib/api/finanzas.types'

const recaudo = (extra: Partial<TableroFinanciero['recaudo']> = {}): TableroFinanciero['recaudo'] => ({
  delDiaCop: 0,
  delMesCop: 31_191_000,
  causadoDelMesCop: 162_341_531,
  abonadoDelMesCop: 15_750_000,
  tasaPct: 9.7017,
  base: 'CAUSADO',
  rotulo: 'Recaudo sobre lo causado',
  mesAnterior: { mes: '2026-09', recaudadoCop: 40_000_000, causadoCop: 160_000_000, abonadoCop: 30_000_000, tasaPct: 18.75 },
  variacionPct: null,
  ...extra,
})

describe('N-06 · el % de recaudo dice su numerador', () => {
  it('🔴 «$ 15.750.000 de $ 162.341.531 de las cuotas de octubre…» y por qué no es «Entró en el mes»', () => {
    const t = definicionDeLaTasa(recaudo(), '2026-10', 'lo causado').replace(/ /g, ' ')
    expect(t).toContain('$ 15.750.000 de $ 162.341.531 de las cuotas de octubre de 2026 ya entraron')
    expect(t).toContain('Entró en el mes')
    expect(t).not.toContain('31.191.000')
  })

  it('con base EMITIDO habla de los cobros emitidos', () => {
    expect(definicionDeLaTasa(recaudo({ base: 'EMITIDO' }), '2026-10', 'lo emitido')).toContain('de los cobros emitidos de octubre')
  })

  it('un back sin el numerador: la frase de antes', () => {
    expect(definicionDeLaTasa(recaudo({ abonadoDelMesCop: undefined }), '2026-10', 'lo que el mes hizo deber (lo causado)')).toBe(
      'Qué parte de lo que el mes hizo deber (lo causado) llegó. Recaudo sobre lo causado',
    )
  })
})
