/**
 * 02-10-2026 · El espejo de los topes de la renovación: las MISMAS cifras y
 * frases que `back/src/inmobiliaria/renovaciones/dto/limites-de-la-renovacion.ts`.
 */
import { describe, expect, it } from 'vitest'
import {
  MENSAJES_DE_LA_RENOVACION as M,
  VALOR_MAXIMO_DE_LA_RENOVACION_COP,
  erroresDeLosValores,
  revisarValoresDeLaRenovacion,
} from './limites-de-la-renovacion'

describe('revisarValoresDeLaRenovacion', () => {
  it('los valores que caben pasan; los ausentes no opinan', () => {
    expect(revisarValoresDeLaRenovacion({ proposedRent: 2_100_000, negotiatedAdminFee: undefined })).toBeUndefined()
    expect(revisarValoresDeLaRenovacion({})).toBeUndefined()
  })

  it('el tope justo pasa y un peso más dice la frase de su campo', () => {
    const tope = VALOR_MAXIMO_DE_LA_RENOVACION_COP
    expect(revisarValoresDeLaRenovacion({ proposedRent: tope })).toBeUndefined()
    expect(revisarValoresDeLaRenovacion({ proposedRent: tope + 1 })).toBe(M.canonPropuestoMaximo)
    expect(revisarValoresDeLaRenovacion({ negotiatedRent: tope + 1 })).toBe(M.canonNegociadoMaximo)
    expect(revisarValoresDeLaRenovacion({ negotiatedAdminFee: tope + 1 })).toBe(M.administracionMaxima)
  })

  it('negativos y decimales dicen su frase', () => {
    expect(revisarValoresDeLaRenovacion({ negotiatedRent: -1 })).toBe(M.canonNegociadoNegativo)
    expect(revisarValoresDeLaRenovacion({ proposedRent: 1.5 })).toBe(M.canonPropuestoEntero)
  })

  it('el tope cabe en la columna int4', () => {
    expect(VALOR_MAXIMO_DE_LA_RENOVACION_COP).toBeLessThanOrEqual(2_147_483_647)
  })
})

describe('erroresDeLosValores', () => {
  it('🔴 dice la frase de CADA campo que no cabe, con el nombre del DTO (para pintarla bajo su campo)', () => {
    const tope = VALOR_MAXIMO_DE_LA_RENOVACION_COP
    expect(
      erroresDeLosValores({ proposedRent: tope + 1, negotiatedRent: 1_600_000, negotiatedAdminFee: -5 }),
    ).toEqual({
      proposedRent: M.canonPropuestoMaximo,
      negotiatedAdminFee: M.administracionNegativa,
    })
  })

  it('sin problemas (o sin valores) no hay errores', () => {
    expect(erroresDeLosValores({ proposedRent: 1_600_000 })).toEqual({})
    expect(erroresDeLosValores({})).toEqual({})
  })
})
