/**
 * 🔴 02-10-2026 · El canon propuesto y el negociado de la renovación van sólo
 * en pesos enteros, con la frase EXACTA del inmueble, el mandato y el contrato
 * (Nico, hueco 4 de S2-B2). Espejo de
 * `back/src/inmobiliaria/renovaciones/dto/limites-de-la-renovacion.ts`; el
 * cajón (`RenovacionWorkflow`) pinta `erroresDeLosValores` bajo cada campo.
 *
 * La frase va escrita a mano para que cambiarla por error haga fallar esto.
 */
import { describe, expect, it } from 'vitest'
import { erroresDeLosValores, revisarValoresDeLaRenovacion } from './limites-de-la-renovacion'

const SIN_CENTAVOS = 'Escribe el canon en pesos enteros, sin centavos.'

describe('Renovación — el canon, sin centavos', () => {
  it('🔴 el canon propuesto con centavos dice la frase bajo proposedRent', () => {
    expect(erroresDeLosValores({ proposedRent: 2_100_000.5 })).toEqual({ proposedRent: SIN_CENTAVOS })
  })

  it('🔴 el canon negociado con centavos dice la frase bajo negotiatedRent', () => {
    expect(erroresDeLosValores({ negotiatedRent: 2_050_000.25 })).toEqual({ negotiatedRent: SIN_CENTAVOS })
    expect(revisarValoresDeLaRenovacion({ negotiatedRent: 2_050_000.25 })).toBe(SIN_CENTAVOS)
  })

  it('en pesos enteros no opina', () => {
    expect(erroresDeLosValores({ proposedRent: 2_100_000, negotiatedRent: 2_050_000 })).toEqual({})
  })

  it('la administración negociada no es un canon: conserva su frase', () => {
    expect(erroresDeLosValores({ negotiatedAdminFee: 350_000.5 }).negotiatedAdminFee).toBe(
      'La administración negociada debe ser un número entero de pesos, sin decimales.',
    )
  })
})
