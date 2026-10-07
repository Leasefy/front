/**
 * 🔴 N-08 (QA-PAGOS-95, 05-10-2026): Conciliación › Movimientos decía «Último
 * extracto 5 de oct» a las 22:30 del 4 en Bogotá: `diaLegible` pintaba en UTC
 * también los INSTANTES (cuándo se cargó, cuándo se armó o aprobó un lote).
 * El día de un movimiento (`@db.Date`) sigue en UTC, como siempre.
 */
import { describe, expect, it } from 'vitest'
import { diaLegible } from './formato'

describe('diaLegible', () => {
  it('🔴 un instante de la noche en Bogotá es de ESE día, no del siguiente en UTC', () => {
    expect(diaLegible('2026-10-05T03:30:00.000Z')).toBe(diaLegible('2026-10-04'))
    expect(diaLegible('2026-10-05T03:30:00.000Z')).toMatch(/^4\b/)
  })

  it('el día de un movimiento (@db.Date) no se corre', () => {
    expect(diaLegible('2026-10-04')).toMatch(/^4\b.*oct.*2026/)
    expect(diaLegible('2026-10-04T00:00:00.000Z')).toBe(diaLegible('2026-10-04'))
  })

  it('un instante de la tarde da el mismo día en los dos husos', () => {
    expect(diaLegible('2026-10-04T15:00:00.000Z')).toBe(diaLegible('2026-10-04'))
  })

  it('lo que no es fecha se devuelve tal cual', () => {
    expect(diaLegible('no-es-fecha')).toBe('no-es-fecha')
  })
})
