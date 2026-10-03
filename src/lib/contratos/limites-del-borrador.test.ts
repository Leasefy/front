/**
 * 🔴 02-10-2026 · El reajuste anual del borrador (`reajustePorcentaje`) con
 * los topes y las frases del back (Nico, hueco 4 de S2-B2). Las frases van
 * escritas a mano para que cambiarlas por error haga fallar esto.
 */
import { describe, expect, it } from 'vitest'
import { errorDelReajuste } from './limites-del-borrador'

describe('errorDelReajuste', () => {
  it.each([[0], [5.1], [13.12], [100], [undefined], [null]])('acepta %s', (valor) => {
    expect(errorDelReajuste(valor)).toBeNull()
  })

  it('🔴 un «510» (5,10 sin la coma) dice la frase del tope', () => {
    expect(errorDelReajuste(510)).toBe('El reajuste anual no puede pasar de 100 %. Revisa que no sobre una cifra.')
  })

  it('🔴 negativo dice la suya', () => {
    expect(errorDelReajuste(-1)).toBe('El reajuste anual no puede ser negativo.')
  })

  it('🔴 lo que no es un número dice que va un número', () => {
    expect(errorDelReajuste(Number.NaN)).toBe('El reajuste anual debe ser un número, por ejemplo 5,2.')
  })
})
