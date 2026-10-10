/**
 * T-0158 (#4): filas del MISMO contrato que son idénticas salvo la fila del
 * archivo y las observaciones son repetidas del archivo: se unen en una.
 * Datos inventados.
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { leerFilaConHoja, type FilaLeida } from './armar-fila'
import { unirFilasRepetidas } from './unir-filas-repetidas'

const ENCABEZADO = [
  'Consecutivo contrato',
  'Nro. Propiedad',
  'Dirección Propiedad',
  'Documento Propietario',
  'Nombre Propietario',
  'Documento Inquilino',
  'Nombre Inquilino',
  'Valor canon',
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
  'Prorrateado',
  'Observaciones',
]
const MAPEO = mapearColumnas(ENCABEZADO)

function fila(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'Consecutivo contrato': 900,
    'Nro. Propiedad': 3,
    'Dirección Propiedad': 'Calle Falsa 123',
    'Documento Propietario': 111,
    'Nombre Propietario': 'Dueña Uno',
    'Documento Inquilino': 222,
    'Nombre Inquilino': 'Inquilino Uno',
    'Valor canon': 1000000,
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    Prorrateado: 'SI',
    ...over,
  }
}
const leer = (filas: Array<Record<string, unknown>>): FilaLeida[] =>
  filas.map((f, i) => leerFilaConHoja({ ...f, _rowIndex: i + 1 }, MAPEO))

describe('unirFilasRepetidas', () => {
  it('dos filas idénticas -> una, y cuenta la repetida', () => {
    const r = unirFilasRepetidas(leer([fila(), fila()]))
    expect(r.filas).toHaveLength(1)
    expect(r.repetidas).toBe(1)
  })

  it('idénticas salvo observaciones -> una, con las observaciones distintas unidas', () => {
    const r = unirFilasRepetidas(leer([fila({ Observaciones: 'Nota A' }), fila({ Observaciones: 'Nota B' }), fila({ Observaciones: 'Nota A' })]))
    expect(r.filas).toHaveLength(1)
    expect(r.repetidas).toBe(2)
    expect(r.filas[0].fila.observaciones).toBe('Nota A\nNota B')
    expect(r.filas[0].origen.observaciones).toBe('Nota A\nNota B')
  })

  it('conserva la primera fila: la fila del archivo es la de la primera aparición', () => {
    const r = unirFilasRepetidas(leer([fila(), fila()]))
    expect(r.filas[0].fila.filaDelArchivo).toBe(2)
  })

  it('otro inquilino (co-inquilino) NO se une', () => {
    const r = unirFilasRepetidas(leer([fila(), fila({ 'Documento Inquilino': 999, 'Nombre Inquilino': 'Otro' })]))
    expect(r.filas).toHaveLength(2)
    expect(r.repetidas).toBe(0)
  })

  it('otro propietario (copropietario) NO se une', () => {
    const r = unirFilasRepetidas(leer([fila(), fila({ 'Documento Propietario': 333 })]))
    expect(r.filas).toHaveLength(2)
    expect(r.repetidas).toBe(0)
  })

  it('otro canon NO se une', () => {
    const r = unirFilasRepetidas(leer([fila(), fila({ 'Valor canon': 1100000 })]))
    expect(r.filas).toHaveLength(2)
  })

  it('contratos distintos y filas sin consecutivo no se tocan; el orden se conserva', () => {
    const r = unirFilasRepetidas(
      leer([fila({ 'Consecutivo contrato': 1 }), fila({ 'Consecutivo contrato': 2 }), fila({ 'Consecutivo contrato': 1 }), fila({ 'Consecutivo contrato': '' }), fila({ 'Consecutivo contrato': '' })]),
    )
    expect(r.filas.map((l) => l.fila.externalId)).toEqual(['1', '2', undefined, undefined])
    expect(r.repetidas).toBe(1)
  })
})
