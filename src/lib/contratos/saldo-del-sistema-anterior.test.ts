/**
 * 🔴 Columna «Saldo» en el archivo de contratos (Nico, 10-10-2026): lo que el
 * inquilino debía en el sistema anterior a la fecha de corte. Entra a la
 * cartera como «Saldo del sistema anterior». Se lee TAL CUAL: con su signo y
 * sus centavos; lo que no es plata no viaja.
 */
import { describe, expect, it } from 'vitest'

import { armarFilaAMigrar } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const campoDe = (encabezado: string) => mapearColumnas([encabezado])[0]

describe('la columna «Saldo» se reconoce', () => {
  it.each([
    'Saldo',
    'Saldo inicial',
    'Saldo anterior',
    'Saldo a la fecha de corte',
    'Saldo pendiente',
    'Saldo del sistema anterior',
  ])('«%s» → saldo', (encabezado) => {
    expect(campoDe(encabezado).campo).toBe('saldo')
  })

  it('«Saldo a la fecha de corte» no se confunde con la fecha de corte (fecha de cartera)', () => {
    const mapeo = mapearColumnas(['Fecha de corte', 'Saldo a la fecha de corte'])
    expect(mapeo.map((m) => m.campo)).toEqual(['fechaDeCartera', 'saldo'])
  })

  it('«Deuda» y «Cartera» a secas se proponen, pero alguien confirma', () => {
    expect(campoDe('Deuda')).toMatchObject({ campo: 'saldo', certeza: 'dudosa' })
    expect(campoDe('Cartera')).toMatchObject({ campo: 'saldo', certeza: 'dudosa' })
  })

  it('«Fecha cartera» sigue siendo la fecha de cartera', () => {
    expect(campoDe('Fecha cartera').campo).toBe('fechaDeCartera')
  })

  it('un saldo A FAVOR no es la deuda: no se mapea solo', () => {
    expect(campoDe('Saldo a favor').campo).toBeNull()
  })
})

describe('el saldo viaja tal cual', () => {
  const fila = (valor: unknown) =>
    armarFilaAMigrar({ Saldo: valor }, mapearColumnas(['Saldo'])).saldoInicial

  it('pesos con puntos de miles', () => {
    expect(fila('$ 4.500.000')).toBe(4_500_000)
  })

  it('con centavos, sin redondear', () => {
    expect(fila('1.234.567,89')).toBe(1_234_567.89)
  })

  it('negativo (a favor del inquilino), como lo escribe el export', () => {
    expect(fila('$-4,500.00')).toBe(-4_500)
  })

  it('un cero es un cero (el archivo dice que no debe nada)', () => {
    expect(fila('0')).toBe(0)
  })

  it('lo que no es plata no viaja: la fila sigue sin saldo', () => {
    expect(fila('')).toBeUndefined()
    expect(fila('Sin saldo')).toBeUndefined()
    expect(fila(undefined)).toBeUndefined()
  })

  it('sin la columna, no hay saldo', () => {
    expect(armarFilaAMigrar({ Canon: '1000000' }, mapearColumnas(['Canon'])).saldoInicial).toBeUndefined()
  })
})
