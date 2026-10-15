import { describe, it, expect } from 'vitest'
import { cuentasDeCartera, cuentasSugeridas, saldosPorDocumento } from './cartera-del-sistema-anterior'
import type { RenglonDelBalance } from './balance-de-apertura'

const r = (codigo: string, documento: string, saldoFinal: number, nombreTercero = ''): RenglonDelBalance => ({
  fila: 1,
  codigo,
  nombreCuenta: codigo === '13802501' ? 'CXC TERCEROS - CANON' : 'OTRA',
  documento,
  nombreTercero,
  saldoFinal,
  ilegible: false,
})

const BALANCE = [
  r('13802501', '71.234.567', 2_000_000, 'ANA PEREZ'),
  r('13802501', '80111222', 1_500_000.5, 'BETO'),
  r('13802501', '71234567', 250_000),
  r('13802501', '90000000', 0, 'EN CERO'),
  r('13551501', '71234567', 99_000),
  r('11100501', '', 5_000_000),
  r('28150501', '71234567', -800_000),
]

describe('la cartera del sistema anterior (Juan, 15-10-2026)', () => {
  it('lista las cuentas 13 con terceros y sugiere la de cartera del arriendo', () => {
    const cuentas = cuentasDeCartera(BALANCE, 'saldo')
    expect(cuentas.map((c) => c.codigo)).toEqual(['13802501', '13551501'])
    expect(cuentas[0].terceros).toBe(2)
    expect(cuentasSugeridas(cuentas)).toEqual(['13802501'])
  })

  it('suma por documento (con o sin puntos), deja afuera los ceros y otras cuentas', () => {
    expect(saldosPorDocumento(BALANCE, 'saldo', new Set(['13802501']))).toEqual([
      { documento: '71.234.567', nombre: 'ANA PEREZ', saldoCop: 2_250_000 },
      { documento: '80111222', nombre: 'BETO', saldoCop: 1_500_000.5 },
    ])
  })

  it('sin cuentas de cartera conocidas, sugiere la de más terceros', () => {
    const cuentas = cuentasDeCartera([r('13309501', '1', 5), r('13309501', '2', 5), r('13551501', '3', 1)], 'saldo')
    expect(cuentasSugeridas(cuentas)).toEqual(['13309501'])
  })
})
