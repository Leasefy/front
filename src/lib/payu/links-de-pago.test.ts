import { describe, expect, it } from 'vitest'

import { instanteEnBogota, mesTopeDeLosLinks } from './links-de-pago'

describe('mesTopeDeLosLinks', () => {
  it('es el mes siguiente al corriente: el aviso de «3 días antes» ya salió', () => {
    expect(mesTopeDeLosLinks('2026-10')).toBe('2026-11')
    expect(mesTopeDeLosLinks('2026-12')).toBe('2027-01')
  })
})

describe('instanteEnBogota', () => {
  it('escribe el instante en hora de Bogotá, no en la del navegador', () => {
    // 13:02 UTC = 8:02 en Bogotá (UTC-5).
    const texto = instanteEnBogota('2026-10-05T13:02:11.000Z')
    expect(texto).toContain('5')
    expect(texto).toMatch(/oct/)
    expect(texto).toContain('8:02')
  })

  it('un instante ilegible se devuelve tal cual, no como «Invalid Date»', () => {
    expect(instanteEnBogota('ayer')).toBe('ayer')
  })
})
