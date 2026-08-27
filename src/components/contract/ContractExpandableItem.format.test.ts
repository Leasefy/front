import { describe, it, expect } from 'vitest'
import { formatCanon, formatVigencia } from './ContractExpandableItem.format'

/**
 * `ContractExpandableItem` lista los contratos del landlord tradicional
 * (`/panel/(landlord)/contratos`) — un contrato MIGRADO sparse (T-0031)
 * puede aparecer ahí con `monthlyRent`/`startDate`/`endDate` en `null`.
 */
describe('formatCanon', () => {
  it('nunca muestra "$ 0" para un canon ausente', () => {
    expect(formatCanon(null)).not.toBe('$ 0')
    expect(formatCanon(undefined)).not.toBe('$ 0')
  })

  it('formatea un canon real', () => {
    expect(formatCanon(1200000)).toBe('$ 1.200.000')
  })
})

describe('formatVigencia', () => {
  it('nunca cae al epoch UNIX cuando faltan las dos fechas', () => {
    expect(formatVigencia(null, null)).not.toContain('1970')
  })

  it('muestra un placeholder legible cuando faltan las dos fechas', () => {
    expect(formatVigencia(null, null)).toBe('—')
  })

  it('formatea el rango cuando ambas fechas están presentes', () => {
    expect(formatVigencia('2026-01-01', '2027-01-01')).toContain('2026')
    expect(formatVigencia('2026-01-01', '2027-01-01')).toContain('2027')
  })
})
