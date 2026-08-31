import { describe, it, expect } from 'vitest'
import { formatCanon, formatFecha, mesesHastaFin } from './format'

/**
 * VERIFY-batch-2 (contract.md), Finding 1, sibling de menor severidad: esta
 * pantalla (el panel landlord tradicional) puede mostrar un contrato
 * MIGRADO sparse (T-0031) — `activeContract.monthlyRent`/`startDate`/
 * `endDate`/`paymentDueDay` pueden ser `null`. Antes de este fix, "Día de
 * pago: null" se mostraba literal (interpolación de template string no
 * null-safe) y el canon/las fechas caían a "$ 0"/epoch.
 */
describe('formatCanon', () => {
  it('nunca muestra "$ 0" (formato COP) para un canon ausente', () => {
    expect(formatCanon(null)).not.toMatch(/\$\s*0\b/)
    expect(formatCanon(undefined)).not.toMatch(/\$\s*0\b/)
  })

  it('formatea un canon real', () => {
    expect(formatCanon(1800000)).toContain('1.800.000')
  })

  it('un canon real de $0 formatea como $0, no como "Sin definir"', () => {
    expect(formatCanon(0)).toMatch(/\$\s*0\b/)
  })
})

describe('formatFecha', () => {
  it('nunca cae al epoch UNIX para una fecha ausente', () => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    expect(formatFecha(null, opts)).toBeNull()
    expect(formatFecha(undefined, opts)).toBeNull()
  })

  it('formatea una fecha real', () => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    expect(formatFecha('2026-05-01', opts)).toContain('2026')
  })
})

describe('mesesHastaFin', () => {
  it('devuelve null para una fecha de fin ausente — nunca NaN', () => {
    expect(mesesHastaFin(null)).toBeNull()
    expect(mesesHastaFin(undefined)).toBeNull()
  })
})
