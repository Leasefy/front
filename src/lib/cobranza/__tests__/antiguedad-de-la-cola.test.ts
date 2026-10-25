import { describe, it, expect } from 'vitest'
import { antiguedadDeLaCola, diasDesde, diasEnPalabras } from '../antiguedad-de-la-cola'

const AHORA = new Date('2026-10-23T12:00:00Z')

describe('antigüedad de la cola (revisora r27, K1 y K2)', () => {
  it('reparte por días de espera, no por estado', () => {
    const a = antiguedadDeLaCola(
      ['2026-10-22T12:00:00Z', '2026-10-16T12:00:00Z', '2026-10-10T12:00:00Z', '2026-09-01T12:00:00Z'],
      { es: true, ahora: AHORA },
    )
    expect(a.cuantos).toBe(4)
    expect(a.masVieja).toBe(52)
    expect(a.tramos.map((t) => [t.clave, t.monto])).toEqual([
      ['hasta-7', 2],
      ['hasta-30', 1],
      ['mas-de-30', 1],
    ])
  })

  it('una fecha que no se lee no cuenta', () => {
    const a = antiguedadDeLaCola([null, 'no es fecha', undefined], { es: true, ahora: AHORA })
    expect(a.cuantos).toBe(0)
    expect(a.masVieja).toBeNull()
    expect(diasDesde('x', AHORA)).toBeNull()
  })

  it('con montos, los tramos suman la plata de cada antigüedad', () => {
    const a = antiguedadDeLaCola(['2026-10-22T12:00:00Z', '2026-09-01T12:00:00Z', '2026-10-20T12:00:00Z'], {
      es: true,
      ahora: AHORA,
      montos: [100_000, 250_000, null],
      formato: (n) => `$ ${n}`,
    })
    expect(a.tramos.map((t) => [t.clave, t.monto, t.cifra])).toEqual([
      ['hasta-7', 100_000, '$ 100000'],
      ['hasta-30', 0, '$ 0'],
      ['mas-de-30', 250_000, '$ 250000'],
    ])
  })

  it('dice los días en palabras', () => {
    expect(diasEnPalabras(0, true)).toBe('hoy')
    expect(diasEnPalabras(1, true)).toBe('1 día')
    expect(diasEnPalabras(6, true)).toBe('6 días')
    expect(diasEnPalabras(6, false)).toBe('6 days')
  })
})
