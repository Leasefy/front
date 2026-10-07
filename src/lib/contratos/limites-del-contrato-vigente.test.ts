/**
 * 02-10-2026 · El espejo de `back/src/contracts/limites-del-contrato-vigente.ts`.
 * Las cifras y las frases son las del back: si una prueba de acá cambia, la
 * del back (`limites-del-contrato-vigente.spec.ts`) cambia con ella.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_NUEVOS_PROPIETARIOS,
  MENSAJES_DEL_CONTRATO_VIGENTE,
  VALOR_MAXIMO_COP,
  VALOR_MAXIMO_DE_LA_REGLA_DE_MORA,
  topeDePesos,
} from './limites-del-contrato-vigente'

describe('los topes del contrato vigente', () => {
  it('son los del back: $2.000.000.000, 99.999.999 y 20 dueños', () => {
    expect(VALOR_MAXIMO_COP).toBe(2_000_000_000)
    expect(VALOR_MAXIMO_COP).toBeLessThanOrEqual(2_147_483_647)
    expect(VALOR_MAXIMO_DE_LA_REGLA_DE_MORA).toBe(99_999_999)
    expect(MAX_NUEVOS_PROPIETARIOS).toBe(20)
  })

  it('la frase del dinero dice el tope y qué revisar, igual que el back', () => {
    expect(MENSAJES_DEL_CONTRATO_VIGENTE.valorDelConceptoMaximo).toBe(
      'El valor del concepto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    )
    expect(MENSAJES_DEL_CONTRATO_VIGENTE.penalidadMaxima).toBe(
      'La penalidad no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    )
  })
})

describe('topeDePesos', () => {
  const frase = MENSAJES_DEL_CONTRATO_VIGENTE.primaMaxima

  it('el tope exacto pasa; un peso más, no', () => {
    expect(topeDePesos(VALOR_MAXIMO_COP, frase)).toBeNull()
    expect(topeDePesos(VALOR_MAXIMO_COP + 1, frase)).toBe(frase)
  })

  it('🔴 una cifra con ceros de más dice la frase del back', () => {
    expect(topeDePesos(30_000_000_000, frase)).toBe(frase)
  })

  it('vacío no opina: de «falta el valor» se encarga el formulario', () => {
    expect(topeDePesos(null, frase)).toBeNull()
    expect(topeDePesos(undefined, frase)).toBeNull()
    expect(topeDePesos(Number.NaN, frase)).toBeNull()
  })
})
