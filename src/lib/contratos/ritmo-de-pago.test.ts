import { describe, it, expect } from 'vitest'

import { diasDePlazoQueRigen, ritmoDePago } from './ritmo-de-pago'

describe('ritmoDePago — «Día 21 / +2 de plazo» dicho en palabras', () => {
  it('con el día y el plazo del contrato', () => {
    expect(ritmoDePago({ paymentDueDay: 21, diasDePlazo: 2 }, null)).toBe(
      'Paga el 21 de cada mes, con 2 días de plazo.',
    )
    expect(ritmoDePago({ paymentDueDay: 5, diasDePlazo: 1 }, null)).toBe(
      'Paga el 5 de cada mes, con 1 día de plazo.',
    )
  })

  it('un cero del contrato es «sin plazo», no «hereda»', () => {
    expect(ritmoDePago({ paymentDueDay: 21, diasDePlazo: 0 }, { diasDePlazo: 5 })).toBe(
      'Paga el 21 de cada mes, sin días de plazo.',
    )
  })

  it('cuando hereda el plazo, dice de dónde sale el número', () => {
    expect(ritmoDePago({ paymentDueDay: 21, diasDePlazo: null }, { diasDePlazo: 3 })).toBe(
      'Paga el 21 de cada mes, con 3 días de plazo (los de tu inmobiliaria).',
    )
  })

  it('cuando hereda y no se sabe cuánto, no inventa un número', () => {
    expect(ritmoDePago({ paymentDueDay: 21, diasDePlazo: null }, null)).toBe(
      'Paga el 21 de cada mes, con los días de plazo de tu inmobiliaria.',
    )
  })

  it('el día de pago también se hereda', () => {
    expect(ritmoDePago({ paymentDueDay: null, diasDePlazo: 2 }, { diaDePago: 5 })).toBe(
      'Paga el 5 de cada mes (el día de tu inmobiliaria), con 2 días de plazo.',
    )
    expect(ritmoDePago({ paymentDueDay: null, diasDePlazo: 2 }, null)).toBe(
      'Paga el día que fija tu inmobiliaria, cada mes, con 2 días de plazo.',
    )
  })

  it('un contrato bimestral no dice «de cada mes»', () => {
    expect(ritmoDePago({ paymentDueDay: 21, diasDePlazo: 2, periodicidad: 'BIMESTRAL' }, null)).toBe(
      'Paga el 21, cada dos meses, con 2 días de plazo.',
    )
  })
})

describe('diasDePlazoQueRigen — contrato → inmobiliaria, como el back', () => {
  it('el del contrato pisa al de la inmobiliaria, aunque sea cero', () => {
    expect(diasDePlazoQueRigen({ diasDePlazo: 0 }, { diasDePlazo: 5 })).toBe(0)
    expect(diasDePlazoQueRigen({ diasDePlazo: 4 }, null)).toBe(4)
  })

  it('null en el contrato hereda; una inmobiliaria sin plazo es cero', () => {
    expect(diasDePlazoQueRigen({ diasDePlazo: null }, { diasDePlazo: 5 })).toBe(5)
    expect(diasDePlazoQueRigen({ diasDePlazo: undefined }, {})).toBe(0)
  })

  it('hereda y la inmobiliaria no llegó: desconocido', () => {
    expect(diasDePlazoQueRigen({ diasDePlazo: null }, null)).toBeNull()
  })
})
