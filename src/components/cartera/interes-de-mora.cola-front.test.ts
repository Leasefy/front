/**
 * COLA-FRONT (04-10-2026), CR-31: una cuota vencida sin plazo fijado no corre
 * interés. Aunque el back todavía mande el liquidado de un cobro viejo, la fila
 * no dice «+ $X de intereses» ni lo suma.
 */
import { describe, it, expect } from 'vitest'

import { interesDe, interesPendiente, sumarIntereses, totalConInteres } from './interes-de-mora'

const interes = {
  liquidadoCop: 250_000,
  abonadoCop: 0,
  pendienteCop: 250_000,
  origen: 'COBRO' as const,
  pagadaEnMora: false,
  diasDeMora: 4,
  motivo: null,
  sinReglas: false,
}

describe('interés de una fila sin plazo fijado', () => {
  it('🔴 no hay interés que mostrar ni sumar', () => {
    const fila = { plazoSinFijar: true as const, interes, totalConInteresCop: 12_750_000 }
    expect(interesDe(fila)).toBeNull()
    expect(interesPendiente(fila)).toBe(0)
    expect(totalConInteres(fila, 12_500_000)).toBe(12_500_000)
  })

  it('las demás filas, igual que antes', () => {
    const filas = [{ interes }, { plazoSinFijar: true as const, interes }]
    expect(sumarIntereses(filas)).toBe(250_000)
  })
})
