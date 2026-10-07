/**
 * 🔴 02-10-2026 · El porcentaje del incremento de un local comercial (tasa
 * pactada e incremento digitado) con los topes y las frases del back
 * (`TasaAnualPactadaDto`, `IncrementoDigitadoDto`; Nico, hueco 4 de S2-B2).
 * Las frases van escritas a mano para que cambiarlas por error haga fallar
 * esto.
 */
import { describe, expect, it } from 'vitest'
import { errorDelPorcentajeDelIncremento } from './limites-del-contrato-vigente'

const casos = [
  {
    cual: 'tasaPactada' as const,
    maximo: 'La tasa pactada no puede pasar de 100 %. Revisa que no sobre una cifra.',
    minimo: 'La tasa pactada no puede ser menor que −99,999 %.',
    numero: 'La tasa pactada debe ser un número con hasta tres decimales, por ejemplo 5,5.',
  },
  {
    cual: 'incremento' as const,
    maximo: 'El incremento no puede pasar de 100 %. Revisa que no sobre una cifra.',
    minimo: 'El incremento no puede ser menor que −99,999 %.',
    numero: 'El incremento debe ser un número con hasta tres decimales, por ejemplo 5,5.',
  },
]

describe.each(casos)('errorDelPorcentajeDelIncremento($cual)', (caso) => {
  it.each([['5,5'], ['5.5'], ['0'], ['100'], ['-99,999'], ['5,125'], [''], ['  ']])('acepta «%s»', (texto) => {
    expect(errorDelPorcentajeDelIncremento(texto, caso.cual)).toBeNull()
  })

  it('🔴 «550» (5,50 sin la coma) dice la frase del tope', () => {
    expect(errorDelPorcentajeDelIncremento('550', caso.cual)).toBe(caso.maximo)
    expect(errorDelPorcentajeDelIncremento('100,001', caso.cual)).toBe(caso.maximo)
  })

  it('🔴 una rebaja de más de 99,999 % dice la frase del piso', () => {
    expect(errorDelPorcentajeDelIncremento('-100', caso.cual)).toBe(caso.minimo)
  })

  it('🔴 cuatro decimales o un texto dicen que va un número con hasta tres decimales', () => {
    expect(errorDelPorcentajeDelIncremento('5,1234', caso.cual)).toBe(caso.numero)
    expect(errorDelPorcentajeDelIncremento('cinco', caso.cual)).toBe(caso.numero)
  })
})
