import { describe, expect, it } from 'vitest'

import {
  cuentaDelRepartoEnUnaLinea,
  fraseDeLaSuma,
  porcentajeEntero,
  problemaDelReparto,
  sumaDePorcentajes,
} from './reparto-de-cuentas'

/**
 * «El 50 % en Bancolombia, otro 20 % en Nubank y otro 30 % en Banco de
 * Occidente» (Nico, 22-09). El botón dice cuánto falta ANTES de enviar, con la
 * misma frase que devolvería el back.
 */

const cuenta = (banco: string, numero: string, porcentaje: string) => ({ banco, numero, porcentaje })

describe('problemaDelReparto', () => {
  it('el ejemplo de Nico se puede enviar', () => {
    expect(
      problemaDelReparto([
        cuenta('bancolombia', '0012344521', '50'),
        cuenta('nu', '77001234', '20'),
        cuenta('occidente', '990001234', '30'),
      ]),
    ).toBeNull()
  })

  it('si no suma 100 dice cuánto falta o cuánto sobra (la frase del back)', () => {
    expect(problemaDelReparto([cuenta('a', '1', '50'), cuenta('b', '2', '30')])).toEqual({
      tipo: 'suma',
      mensaje: 'Los porcentajes suman 80 %: falta repartir 20 %.',
    })
    expect(fraseDeLaSuma(110)).toBe('Los porcentajes suman 110 %: sobran 10 %.')
  })

  it('un porcentaje con decimales o vacío se señala en su cuenta', () => {
    expect(problemaDelReparto([cuenta('a', '1', '50'), cuenta('b', '2', '33,5')])).toMatchObject({
      tipo: 'porcentaje',
      indice: 1,
    })
    expect(problemaDelReparto([cuenta('a', '1', ''), cuenta('b', '2', '100')])).toMatchObject({
      tipo: 'porcentaje',
      indice: 0,
    })
  })

  it('la misma cuenta dos veces se rechaza aunque el número traiga guiones', () => {
    expect(
      problemaDelReparto([cuenta('bancolombia', '001-234', '50'), cuenta('bancolombia', '001234', '50')]),
    ).toMatchObject({ tipo: 'repetida', indice: 1 })
  })

  it('una sola cuenta o más de cinco no es un reparto', () => {
    expect(problemaDelReparto([cuenta('a', '1', '100')])).toMatchObject({ tipo: 'cantidad' })
  })
})

it('la suma ignora lo que no es un entero, y el entero va de 1 a 100', () => {
  expect(sumaDePorcentajes([cuenta('a', '1', '40'), cuenta('b', '2', 'x')])).toBe(40)
  expect(porcentajeEntero('0')).toBeNull()
  expect(porcentajeEntero('101')).toBeNull()
  expect(porcentajeEntero(' 25 ')).toBe(25)
})

it('una cuenta del reparto en una línea, con los últimos 4', () => {
  expect(
    cuentaDelRepartoEnUnaLinea({
      porcentaje: 50,
      bankName: 'Bancolombia',
      bankAccountType: 'Ahorros',
      bankAccountNumber: '0012344521',
    }),
  ).toBe('50 % · Bancolombia · Ahorros · •••• 4521')
})
