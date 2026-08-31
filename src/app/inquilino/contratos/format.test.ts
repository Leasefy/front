import { describe, it, expect } from 'vitest'
import { formatCanon, formatDate } from './format'

/**
 * Un inquilino puede estar asignado (tiene `tenantId`) a un contrato
 * MIGRADO sparse (T-0031) al que le falte el canon o las fechas — D2 exige
 * los CINCO campos para crear el `Lease`, así que faltar uno solo no impide
 * que el `Contract` (y por lo tanto esta pantalla) exista con `tenantId`
 * seteado. Antes de este fix, esta lista formateaba esos campos ausentes
 * como si fueran datos reales.
 */
describe('formatCanon (lista de contratos del inquilino)', () => {
  it('nunca muestra "$ 0" para un canon ausente', () => {
    expect(formatCanon(null)).not.toBe('$ 0')
    expect(formatCanon(undefined)).not.toBe('$ 0')
  })

  it('un canon real de $0 sigue siendo un dato', () => {
    expect(formatCanon(0)).toBe('$ 0')
  })

  it('formatea un canon real', () => {
    expect(formatCanon(2500000)).toBe('$ 2.500.000')
  })
})

describe('formatDate (lista de contratos del inquilino)', () => {
  it('nunca cae al epoch UNIX para una fecha ausente', () => {
    expect(String(formatDate(null))).not.toContain('1970')
    expect(String(formatDate(undefined))).not.toContain('1970')
  })

  it('devuelve null para una fecha ausente', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate(undefined)).toBeNull()
  })
})
