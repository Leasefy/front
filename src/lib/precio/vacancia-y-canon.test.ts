import { describe, expect, it } from 'vitest'

import { loQueCuestaElCanonPedido, mesesEnPalabras } from './vacancia-y-canon'

/**
 * MANOS-2 (04-10-2026): la cuenta del canon que escribe el propietario, espejo
 * de `loQueCuestaElCanonPedido` del back. 🔴 D-PV-02: nunca un canon sugerido.
 */
describe('lo que cuesta el canon que escribe el propietario', () => {
  it('bajar de A a B cuesta (A − B) × 12 y equivale a esos meses de vacancia', () => {
    expect(loQueCuestaElCanonPedido(2_400_000, 2_200_000)).toEqual({ dejaDeRecibirCop: 2_400_000, equivaleAMesesVacio: 1 })
    expect(loQueCuestaElCanonPedido(2_000_000, 1_800_000)).toEqual({ dejaDeRecibirCop: 2_400_000, equivaleAMesesVacio: 1.2 })
  })

  it('igual o más no es una bajada; vacío tampoco', () => {
    expect(loQueCuestaElCanonPedido(2_000_000, 2_000_000)).toBeNull()
    expect(loQueCuestaElCanonPedido(2_000_000, 2_500_000)).toBeNull()
    expect(loQueCuestaElCanonPedido(2_000_000, 0)).toBeNull()
  })

  it('los meses en palabras', () => {
    expect(mesesEnPalabras(1)).toBe('1 mes')
    expect(mesesEnPalabras(1.2)).toBe('1,2 meses')
    expect(mesesEnPalabras(3)).toBe('3 meses')
  })
})
