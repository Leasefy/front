import { describe, it, expect } from 'vitest'
import { fmtCop } from './format'

/**
 * F3 (contract.md VERIFY-batch-2) — la lista de contratos de la agencia es
 * la compañera directa de la pantalla de detalle donde se encontró el
 * "$ 0"/epoch. Un contrato MIGRADO sparse (T-0031) puede tener
 * `monthlyRent` en `null`.
 */
describe('fmtCop (lista de contratos de la agencia)', () => {
  it('nunca muestra un monto formateado en $ 0 para un canon ausente', () => {
    expect(fmtCop(null)).not.toMatch(/\$\s?0/)
    expect(fmtCop(undefined)).not.toMatch(/\$\s?0/)
  })

  it('un canon real de $0 sigue formateando como $0', () => {
    expect(fmtCop(0)).toMatch(/\$\s?0/)
  })

  it('formatea un canon real', () => {
    expect(fmtCop(3200000)).toContain('3.200.000')
  })
})
