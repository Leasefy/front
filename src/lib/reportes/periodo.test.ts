import { describe, it, expect } from 'vitest'
import {
  MAXIMO_DE_MESES,
  mesDe,
  mesesEntre,
  rangoDelPreset,
  sumarMeses,
  validarRango,
} from './periodo'

describe('periodo — aritmética de meses', () => {
  it('suma y resta cruzando el año', () => {
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
    expect(sumarMeses('2026-11', 3)).toBe('2027-02')
    expect(sumarMeses('2026-06', 0)).toBe('2026-06')
  })

  it('cuenta los meses incluyendo los dos extremos', () => {
    expect(mesesEntre('2026-01', '2026-03')).toBe(3)
    expect(mesesEntre('2025-09', '2026-08')).toBe(12)
    expect(mesesEntre('2026-05', '2026-05')).toBe(1)
  })

  it('mesDe usa la hora local, no UTC', () => {
    expect(mesDe(new Date(2026, 8, 1, 0, 30))).toBe('2026-09')
  })
})

describe('periodo — presets', () => {
  const hoy = new Date(2026, 8, 2) // 2 de septiembre de 2026

  it('«últimos N» terminan en el mes actual e incluyen N meses', () => {
    expect(rangoDelPreset('3m', hoy)).toEqual({ desde: '2026-07', hasta: '2026-09' })
    expect(rangoDelPreset('6m', hoy)).toEqual({ desde: '2026-04', hasta: '2026-09' })
    expect(rangoDelPreset('12m', hoy)).toEqual({ desde: '2025-10', hasta: '2026-09' })
  })

  it('«este año» arranca en enero', () => {
    expect(rangoDelPreset('anio', hoy)).toEqual({ desde: '2026-01', hasta: '2026-09' })
  })
})

describe('periodo — validarRango', () => {
  it('acepta un rango bien formado', () => {
    expect(validarRango('2026-01', '2026-12')).toBeNull()
  })

  it('rechaza inicio después del fin', () => {
    expect(validarRango('2026-05', '2026-04')).toMatch(/anterior o igual/)
  })

  it('rechaza más del máximo del back', () => {
    const msg = validarRango('2024-01', '2026-06')
    expect(msg).toMatch(String(MAXIMO_DE_MESES))
    expect(validarRango('2024-07', '2026-06')).toBeNull()
  })

  it('rechaza meses a medio escribir', () => {
    expect(validarRango('', '2026-04')).toMatch(/Elegí/)
    expect(validarRango('2026-13', '2026-04')).toMatch(/Elegí/)
  })
})
