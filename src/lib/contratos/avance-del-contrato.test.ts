import { describe, it, expect } from 'vitest'

import { avanceDelContrato, diasEntreFechas, soloElDia } from './avance-del-contrato'

/**
 * Cuánto va del contrato, por fechas. El caso que se ve en la ficha de Nico
 * (2026-09-16): 21-ago-2025 → 20-ago-2027, «vence en 338 días».
 */
describe('avanceDelContrato', () => {
  const dosAnios = { inicio: '2025-08-21', fin: '2027-08-20' }

  it('el contrato de la ficha: mes 13 de 24, quedan 11, vence en 338 días', () => {
    const a = avanceDelContrato({ ...dosAnios, hoy: '2026-09-16' })
    expect(a.tramo).toBe('EN_CURSO')
    expect(a.meses).toBe(24)
    expect(a.mesActual).toBe(13)
    expect(a.mesesRestantes).toBe(11)
    expect(a.diasParaElFin).toBe(338)
    expect(a.fraccion).toBeGreaterThan(0.5)
    expect(a.fraccion).toBeLessThan(0.55)
  })

  it('el día del inicio es el mes 1 y el día del fin sigue en curso, en el último', () => {
    expect(avanceDelContrato({ ...dosAnios, hoy: '2025-08-21' })).toMatchObject({
      tramo: 'EN_CURSO',
      mesActual: 1,
      fraccion: 0,
    })
    expect(avanceDelContrato({ ...dosAnios, hoy: '2027-08-20' })).toMatchObject({
      tramo: 'EN_CURSO',
      mesActual: 24,
      mesesRestantes: 0,
      fraccion: 1,
      diasParaElFin: 0,
    })
  })

  it('el mes cambia el día en que empieza el período, no antes', () => {
    expect(avanceDelContrato({ ...dosAnios, hoy: '2026-09-20' }).mesActual).toBe(13)
    expect(avanceDelContrato({ ...dosAnios, hoy: '2026-09-21' }).mesActual).toBe(14)
  })

  it('un día después del fin está cumplido, con todos los meses', () => {
    const a = avanceDelContrato({ ...dosAnios, hoy: '2027-08-23' })
    expect(a.tramo).toBe('CUMPLIDO')
    expect(a.mesActual).toBe(24)
    expect(a.diasParaElFin).toBe(-3)
    expect(a.fraccion).toBe(1)
  })

  it('antes del inicio no hay mes actual y dice cuánto falta', () => {
    const a = avanceDelContrato({ inicio: '2026-10-01', fin: '2027-09-30', hoy: '2026-09-16' })
    expect(a.tramo).toBe('POR_EMPEZAR')
    expect(a.mesActual).toBe(0)
    expect(a.meses).toBe(12)
    expect(a.diasParaEmpezar).toBe(15)
    expect(a.fraccion).toBe(0)
  })

  it('un año del 1 de marzo al 28 de febrero son 12 meses, no 13', () => {
    expect(avanceDelContrato({ inicio: '2026-03-01', fin: '2027-02-28', hoy: '2026-03-01' }).meses).toBe(12)
    expect(avanceDelContrato({ inicio: '2026-01-01', fin: '2027-01-01', hoy: '2026-01-01' }).meses).toBe(12)
  })

  it('un contrato del 31 cae el último día en los meses cortos', () => {
    // Períodos: 31-ene, 28-feb, 31-mar… El 1-mar ya está en el segundo.
    const a = avanceDelContrato({ inicio: '2026-01-31', fin: '2027-01-30', hoy: '2026-03-01' })
    expect(a.meses).toBe(12)
    expect(a.mesActual).toBe(2)
  })

  it('las fechas del back a medianoche UTC no se corren un día', () => {
    const a = avanceDelContrato({
      inicio: '2025-08-21T00:00:00.000Z',
      fin: '2027-08-20T00:00:00.000Z',
      hoy: '2026-09-16',
    })
    expect(a.inicio).toBe('2025-08-21')
    expect(a.fin).toBe('2027-08-20')
    expect(a.diasParaElFin).toBe(338)
  })

  it('sin una de las dos fechas, o con el fin antes del inicio, no inventa un avance', () => {
    expect(avanceDelContrato({ inicio: null, fin: '2027-08-20', hoy: '2026-09-16' })).toMatchObject({
      tramo: 'SIN_FECHAS',
      meses: 0,
      diasParaElFin: null,
    })
    expect(avanceDelContrato({ inicio: '2027-01-01', fin: '2026-01-01', hoy: '2026-09-16' }).tramo).toBe(
      'SIN_FECHAS',
    )
  })

  it('un contrato de un solo día tiene un mes', () => {
    expect(avanceDelContrato({ inicio: '2026-09-16', fin: '2026-09-16', hoy: '2026-09-16' })).toMatchObject({
      meses: 1,
      mesActual: 1,
      fraccion: 1,
    })
  })
})

describe('soloElDia y diasEntreFechas', () => {
  it('toman el día tal como viaja y cuentan sin huso horario', () => {
    expect(soloElDia('2027-08-20T00:00:00.000Z')).toBe('2027-08-20')
    expect(soloElDia('basura')).toBeNull()
    expect(diasEntreFechas('2026-02-28', '2026-03-01')).toBe(1)
    expect(diasEntreFechas('2026-09-22', '2026-09-21')).toBe(-1)
  })
})
