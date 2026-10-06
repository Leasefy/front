/**
 * COLA-FRONT (04-10-2026), CR-31: con la inmobiliaria sin plazo fijado no corre
 * mora; «sin días de plazo» (la mora corre ese mismo día) sería falso.
 */
import { describe, expect, it } from 'vitest'

import { ritmoDePago } from './ritmo-de-pago'

describe('ritmoDePago sin plazo fijado', () => {
  it('🔴 dice que no corre mora mientras la inmobiliaria no fije sus días', () => {
    expect(
      ritmoDePago({ prorratearPrimerMes: true, diasDePlazo: null }, { diasDePlazo: 0, plazoSinFijar: true }),
    ).toBe('Se genera el 1 de cada mes, sin mora mientras tu inmobiliaria no fije sus días de plazo.')
  })

  it('con el plazo fijado, como siempre', () => {
    expect(ritmoDePago({ prorratearPrimerMes: true, diasDePlazo: null }, { diasDePlazo: 0 })).toBe(
      'Se genera el 1 de cada mes, sin días de plazo (como tu inmobiliaria).',
    )
  })
})
