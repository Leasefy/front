import { describe, it, expect } from 'vitest'
import { formatDate, formatCanon } from './format'

/**
 * F3 (contract.md VERIFY-batch-2, Finding 1) — un contrato migrado sparse
 * (T-0031) puede llegar con `startDate`/`endDate`/`monthlyRent` en `null`.
 * Antes de este fix, la pantalla de detalle los formateaba como si fueran
 * datos reales: `new Date(null)` cae al epoch UNIX ("1 ene 1970") y
 * `formatCurrency(null)` resuelve a "$ 0" — un dato ausente mostrado con
 * total confianza como un hecho falso.
 *
 * Estos tests afirman la AUSENCIA de esa mentira, no sólo la presencia de un
 * placeholder cualquiera.
 */
describe('formatDate (detalle de contrato)', () => {
  it('nunca cae al epoch UNIX para una fecha ausente', () => {
    expect(String(formatDate(null))).not.toContain('1970')
    expect(String(formatDate(undefined))).not.toContain('1970')
  })

  it('devuelve null para una fecha ausente — el llamador decide cómo mostrar "no se sabe"', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate(undefined)).toBeNull()
  })

  it('formatea una fecha real sin cambios', () => {
    expect(formatDate('2026-03-15')).toContain('2026')
    expect(formatDate('2026-03-15')).not.toBeNull()
  })
})

describe('formatCanon (detalle de contrato)', () => {
  it('nunca muestra "$ 0" para un canon ausente', () => {
    expect(formatCanon(null)).not.toBe('$ 0')
    expect(formatCanon(undefined)).not.toBe('$ 0')
  })

  it('devuelve null para un canon ausente — distinto de un cero real', () => {
    expect(formatCanon(null)).toBeNull()
    expect(formatCanon(undefined)).toBeNull()
  })

  it('un canon real de $0 sigue siendo un dato, no se confunde con ausente', () => {
    expect(formatCanon(0)).toBe('$ 0')
  })

  it('formatea un canon real sin cambios', () => {
    expect(formatCanon(1500000)).toBe('$ 1.500.000')
  })
})
