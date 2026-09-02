import { describe, it, expect } from 'vitest'
import { formatMiles, parseMiles, reformatearMiles, soloDigitos } from './formato-miles'

describe('formato-miles', () => {
  it('formatea con puntos de miles es-CO', () => {
    expect(formatMiles(2600000)).toBe('2.600.000')
    expect(formatMiles(180000)).toBe('180.000')
    expect(formatMiles(0)).toBe('0')
    expect(formatMiles(null)).toBe('')
  })
  it('parsea quitando puntos', () => {
    expect(parseMiles('2.600.000')).toBe(2600000)
    expect(parseMiles('$ 180.000')).toBe(180000)
    expect(parseMiles('')).toBeNull()
    expect(parseMiles('abc')).toBeNull()
  })
  it('soloDigitos limpia todo lo no numérico', () => {
    expect(soloDigitos('2.600.000')).toBe('2600000')
    expect(soloDigitos('1a2b3')).toBe('123')
  })
  it('reformatear deja vacío como vacío (no fuerza 0)', () => {
    expect(reformatearMiles('2600000')).toBe('2.600.000')
    expect(reformatearMiles('')).toBe('')
  })
})
