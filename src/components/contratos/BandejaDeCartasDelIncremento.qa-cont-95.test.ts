import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({ cicloDeVidaApi: {} }))

import { fechaCorta } from './BandejaDeCartasDelIncremento'

describe('QA-CONT-95 · la bandeja de cartas escribe la fecha como la casa', () => {
  it('🔴 «1 nov 2026», sin el cero de «01 nov 2026»', () => {
    expect(fechaCorta('2026-11-01')).toBe('1 nov 2026')
    expect(fechaCorta('2026-10-21')).toBe('21 oct 2026')
  })
})
