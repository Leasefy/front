/**
 * Lo que la pantalla le pregunta al interés que manda el back. La regla que se
 * protege: donde el back NO mandó el interés no se inventa un cero, y el total
 * nunca suma un interés que no llegó.
 */
import { describe, it, expect } from 'vitest'

import {
  faltanReglasDeMora,
  interesDe,
  interesPendiente,
  sumarIntereses,
  totalConInteres,
} from './interes-de-mora'
import type { InteresDeMora } from '@/lib/types/inmobiliaria'

const interes = (p: Partial<InteresDeMora> = {}): InteresDeMora => ({
  liquidadoCop: 0,
  abonadoCop: 0,
  pendienteCop: 0,
  origen: null,
  pagadaEnMora: false,
  diasDeMora: 0,
  motivo: null,
  sinReglas: false,
  ...p,
})

describe('interés de mora en la cartera', () => {
  it('sin interés del back no hay interés: `null`, y el total es el capital', () => {
    const fila = { pendingAmount: 1_000_000 }
    expect(interesDe(fila)).toBeNull()
    expect(interesPendiente(fila)).toBe(0)
    expect(totalConInteres(fila, 1_000_000)).toBe(1_000_000)
  })

  it('el total que manda el back manda; si no vino, se suma lo que sí llegó', () => {
    expect(
      totalConInteres({ interes: interes({ pendienteCop: 288_367 }), totalConInteresCop: 1_838_367 }, 1_550_000),
    ).toBe(1_838_367)
    expect(totalConInteres({ interes: interes({ pendienteCop: 288_367 }) }, 1_550_000)).toBe(1_838_367)
  })

  it('suma el interés pendiente de las filas y sabe si faltan reglas', () => {
    const filas = [
      { interes: interes({ pendienteCop: 10_000 }) },
      { interes: interes({ pendienteCop: 0, motivo: 'x', sinReglas: true }) },
      {},
    ]
    expect(sumarIntereses(filas)).toBe(10_000)
    expect(faltanReglasDeMora(filas)).toBe(true)
    expect(faltanReglasDeMora([filas[0]!, filas[2]!])).toBe(false)
  })
})
