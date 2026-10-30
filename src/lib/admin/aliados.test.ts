import { describe, expect, it } from 'vitest'
import { conversionDelAliado, estadoDelEnlace } from './aliados'

const base = { activa: true, validaHasta: null, maxUsos: null, usos: 10 }
describe('Los aliados en el admin', () => {
  it('la conversión: de los que entraron, cuántos ya pagan; sin usos no hay cifra', () => {
    expect(conversionDelAliado({ usos: 20, pagan: 5 })).toBe(25)
    expect(conversionDelAliado({ usos: 0, pagan: 0 })).toBeNull()
  })
  it('el estado del enlace: pausado, vencido, sin cupos o vigente', () => {
    const hoy = new Date('2026-10-28T12:00:00Z')
    expect(estadoDelEnlace({ ...base, activa: false }, hoy).texto).toBe('Pausado')
    expect(estadoDelEnlace({ ...base, validaHasta: '2026-10-01' }, hoy).texto).toBe('Vencido')
    expect(estadoDelEnlace({ ...base, maxUsos: 10 }, hoy).texto).toBe('Sin cupos')
    expect(estadoDelEnlace({ ...base, maxUsos: 50, validaHasta: '2026-12-31' }, hoy)).toEqual({ texto: 'Vigente', tono: 'ok' })
  })
})
