import { describe, it, expect } from 'vitest'
import { ubicarTarjeta } from './TourDelPanel'

const VENTANA = { width: 1440, height: 900 }

describe('ubicarTarjeta', () => {
  it('pone la tarjeta debajo del elemento cuando cabe', () => {
    const { top } = ubicarTarjeta({ top: 100, left: 400, width: 200, height: 40 }, VENTANA, 200)
    expect(top).toBeGreaterThan(140)
  })

  it('la sube cuando abajo no cabe', () => {
    const { top } = ubicarTarjeta({ top: 800, left: 400, width: 200, height: 40 }, VENTANA, 200)
    expect(top).toBeLessThan(800)
  })

  it('la centra sobre el elemento', () => {
    const { left } = ubicarTarjeta({ top: 100, left: 600, width: 200, height: 40 }, VENTANA, 200)
    // Centro del elemento = 700; la tarjeta mide 340 ⇒ arranca en 530.
    expect(left).toBe(530)
  })

  it('nunca se sale por la izquierda', () => {
    const { left } = ubicarTarjeta({ top: 100, left: 0, width: 40, height: 40 }, VENTANA, 200)
    expect(left).toBeGreaterThanOrEqual(8)
  })

  it('nunca se sale por la derecha', () => {
    const { left } = ubicarTarjeta(
      { top: 100, left: 1400, width: 40, height: 40 },
      VENTANA,
      200,
    )
    expect(left + 340).toBeLessThanOrEqual(VENTANA.width)
  })

  it('en una ventana más angosta que la tarjeta no devuelve un left negativo', () => {
    const { left } = ubicarTarjeta(
      { top: 100, left: 10, width: 40, height: 40 },
      { width: 320, height: 600 },
      200,
    )
    expect(left).toBeGreaterThanOrEqual(0)
  })

  it('un elemento pegado arriba no empuja la tarjeta fuera de la pantalla', () => {
    const { top } = ubicarTarjeta(
      { top: 0, left: 400, width: 200, height: 20 },
      { width: 1440, height: 200 },
      400,
    )
    expect(top).toBeGreaterThanOrEqual(8)
  })
})
