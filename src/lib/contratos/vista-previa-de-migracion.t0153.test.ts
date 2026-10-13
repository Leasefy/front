/**
 * T-0153 (WU-2): la vista previa dice la regla de cobro de la fecha de cartera,
 * la renovación, y avisa cuando la comisión del archivo no cuadra. Datos inventados.
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { comisionQueNoCuadra, vistaPreviaDeFilas } from './vista-previa-de-migracion'

const ENCABEZADO = [
  'Consecutivo contrato',
  'Nro. Propiedad',
  'Dirección Propiedad',
  'Nombre Inquilino',
  'Email inquilino',
  'Valor canon',
  '% Comisión',
  'Valor comisión',
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
  'Prorrateado',
  'Renovación automática',
  'Día de pago',
]
const mapeo = mapearColumnas(ENCABEZADO)
const mearCols = () => mapearColumnas([...ENCABEZADO, 'Impuestos asumidos'])

function fila(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'Consecutivo contrato': 1,
    'Nro. Propiedad': 3,
    'Dirección Propiedad': 'Calle Falsa 123',
    'Nombre Inquilino': 'Inquilino Uno',
    'Email inquilino': 'x@example.test',
    'Valor canon': 1000000,
    '% Comisión': '7.5%',
    'Valor comisión': 75000,
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    Prorrateado: 'SI',
    'Renovación automática': 'SI',
    'Día de pago': '',
    ...over,
  }
}
const valor = (campo: string, f: Record<string, unknown>, m = mapeo) =>
  vistaPreviaDeFilas([f], m).find((r) => r.campo === campo)?.valores[0]

describe('fecha de cartera con su regla', () => {
  it('SI: se cobra el 1 de cada mes y el primer cobro se prorratea', () => {
    expect(valor('fechaDeCartera', fila())).toBe(
      '2025-01-15 · se cobra el 1 de cada mes; primer cobro prorrateado desde esa fecha',
    )
  })
  it('NO: corte el día de la cartera', () => {
    expect(valor('fechaDeCartera', fila({ Prorrateado: 'NO' }))).toBe('2025-01-15 · corte el día 15 de cada mes')
  })
  it('NO con cartera el 31: el día se topa en 28', () => {
    expect(valor('fechaDeCartera', fila({ Prorrateado: 'NO', 'Fecha Cartera': '2025-01-31' }))).toBe(
      '2025-01-31 · corte el día 28 de cada mes',
    )
  })
  it('un día de pago explícito manda sobre la derivación', () => {
    expect(valor('fechaDeCartera', fila({ Prorrateado: 'NO', 'Día de pago': 5 }))).toBe(
      '2025-01-15 · corte el día 5 de cada mes',
    )
  })
  it('sin prorrateo definido lo dice, no inventa', () => {
    expect(valor('fechaDeCartera', fila({ Prorrateado: '' }))).toBe(
      '2025-01-15 · falta definir si se prorratea el primer mes',
    )
  })
})

describe('prorrateado y renovación en la vista previa', () => {
  it('prorrateado vacío se ve como «Falta definir», no como un No', () => {
    expect(valor('prorrateado', fila({ Prorrateado: '' }))).toBe('Falta definir')
    expect(valor('prorrateado', fila({ Prorrateado: 'x?' }))).toBe('Falta definir («x?»)')
    expect(valor('prorrateado', fila())).toBe('Sí')
  })
  it('renovación automática -> «Se prorroga al vencer»', () => {
    expect(valor('renovacionAutomatica', fila({ 'Renovación automática': 'SI' }))).toBe(
      'Se prorroga al vencer: Sí',
    )
    expect(valor('renovacionAutomatica', fila({ 'Renovación automática': 'NO' }))).toBe(
      'Se prorroga al vencer: No (al vencer queda en alerta y no se generan cuotas)',
    )
    expect(valor('renovacionAutomatica', fila({ 'Renovación automática': '' }))).toBeNull()
  })
  it('impuestos asumidos -> quién asume el 4x1000 del giro', () => {
    const m = mearCols()
    expect(valor('impuestosAsumidos', fila({ 'Impuestos asumidos': 'SI' }), m)).toBe('4x1000 del giro: lo asume el propietario')
    expect(valor('impuestosAsumidos', fila({ 'Impuestos asumidos': 'NO' }), m)).toBe('4x1000 del giro: lo asume la inmobiliaria')
    expect(valor('impuestosAsumidos', fila({ 'Impuestos asumidos': '' }), m)).toBeNull()
  })
  it('tipo de interés -> interés de mora por día o monto fijo', () => {
    const m = mapearColumnas([...ENCABEZADO, 'Tipo de interés'])
    expect(valor('tipoDeInteres', fila({ 'Tipo de interés': 'Interés prorrateado' }), m)).toBe('Interés de mora: por día de mora')
    expect(valor('tipoDeInteres', fila({ 'Tipo de interés': 'Interés completo' }), m)).toBe('Interés de mora: monto fijo')
    expect(valor('tipoDeInteres', fila({ 'Tipo de interés': '' }), m)).toBeNull()
  })
  it('valor de la comisión se muestra como plata', () => {
    expect(valor('valorComision', fila())).toBe('$ 75.000')
  })
})

describe('comisionQueNoCuadra (§4.4, no bloquea)', () => {
  it('cuadra cuando valor = canon x % (tolerancia de 1 peso)', () => {
    expect(comisionQueNoCuadra([fila(), fila({ 'Valor comisión': 75001 })], mapeo)).toEqual([])
  })
  it('avisa por fila cuando no cuadra, con la fila de la hoja', () => {
    const filas = [fila(), { ...fila({ 'Valor comisión': 80000 }), _rowIndex: 5 }]
    const r = comisionQueNoCuadra(filas, mapeo)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ indice: 1, filaDelArchivo: 6, valorDelArchivo: 80000, esperado: 75000 })
  })
  it('sin la columna, o sin % o sin valor, no hay nada que cruzar', () => {
    const sin = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Valor comisión'))
    expect(comisionQueNoCuadra([fila({ 'Valor comisión': 1 })], sin)).toEqual([])
    expect(comisionQueNoCuadra([fila({ '% Comisión': '' })], mapeo)).toEqual([])
    expect(comisionQueNoCuadra([fila({ 'Valor comisión': '' })], mapeo)).toEqual([])
  })
  it('en filas de copropietarios acepta la comisión sobre la parte o sobre el total', () => {
    const m = mapearColumnas([...ENCABEZADO, 'Total Canon Contrato'])
    const parte = fila({ 'Total Canon Contrato': 1000000, 'Valor canon': 600000, 'Valor comisión': 45000 })
    const total = fila({ 'Total Canon Contrato': 1000000, 'Valor canon': 600000, 'Valor comisión': 75000 })
    expect(comisionQueNoCuadra([parte, total], m)).toEqual([])
  })
})
