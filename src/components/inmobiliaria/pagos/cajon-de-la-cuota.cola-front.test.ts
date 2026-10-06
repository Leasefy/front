/**
 * COLA-FRONT (04-10-2026): el rótulo de una cuota con sus dos marcas nuevas del
 * back.
 *   · CR-31 (Nico: «Sin plazo… avisar en notificaciones»): `plazoSinFijar` →
 *     «Vencida», no «Vencido, en plazo».
 *   · Nico (03-10): `saldadaPorNota` → «Saldada por nota crédito NC-12» aunque
 *     `estado` siga PENDIENTE.
 */
import { describe, it, expect } from 'vitest'

import { nombreDeLaFila, saldadaPorNotaEnPalabras, varianteDeLaFila } from './cajon-de-la-cuota'

describe('nombreDeLaFila', () => {
  it('🔴 vencida sin plazo fijado se rotula «Vencida»', () => {
    expect(nombreDeLaFila({ cajon: 'VENCIDA_EN_PLAZO', plazoSinFijar: true })).toBe('Vencida')
  })

  it('vencida con plazo fijado sigue siendo «Vencido, en plazo»', () => {
    expect(nombreDeLaFila({ cajon: 'VENCIDA_EN_PLAZO' })).toBe('Vencido, en plazo')
  })

  it('🔴 saldada por nota crédito, con y sin número', () => {
    expect(
      nombreDeLaFila({ cajon: 'SIN_DEUDA', saldadaPorNota: { notaCreditoId: 'n1', numero: 'NC-12' } }),
    ).toBe('Saldada por nota crédito NC-12')
    expect(saldadaPorNotaEnPalabras({ notaCreditoId: 'n1', numero: null })).toBe('Saldada por nota crédito')
    // No se pinta «Pagada» en verde: no se pagó.
    expect(varianteDeLaFila({ cajon: 'SIN_DEUDA', saldadaPorNota: { notaCreditoId: 'n1', numero: 'NC-12' } })).toBe(
      'secondary',
    )
  })

  it('el siniestro manda sobre lo demás, como antes', () => {
    expect(nombreDeLaFila({ cajon: 'CARTERA', enSiniestro: true })).toBe('En siniestro')
  })
})
