/**
 * T-0153 (WU-2): lo que la fila de «contratos por detalles» deja en la fila a
 * migrar. Encabezados reales, celdas INVENTADAS.
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import {
  armarFilaAMigrar,
  leerFilaDelArchivo,
  noSeProrrogaDeCelda,
  prorrateadoNoReconocido,
} from './armar-fila'

const ENCABEZADO = [
  'Consecutivo contrato',
  'Total Canon Contrato',
  'Consecutivo detalle',
  'Nro. Propiedad',
  'Dirección Propiedad',
  'Documento Propietario',
  'Nombre Propietario',
  'Documento Inquilino',
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
  'Impuestos asumidos',
]
const mapeo = mapearColumnas(ENCABEZADO)

function fila(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'Consecutivo contrato': 900,
    'Total Canon Contrato': 1000000,
    'Consecutivo detalle': 1,
    'Nro. Propiedad': 3,
    'Dirección Propiedad': 'Calle Falsa 123',
    'Documento Propietario': 111,
    'Nombre Propietario': 'Dueña Uno',
    'Documento Inquilino': 222,
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
    ...over,
  }
}

describe('Nro. Propiedad -> codigoInmueble', () => {
  it('el número viaja como TEXTO y la dirección sigue siendo la dirección', () => {
    const f = armarFilaAMigrar(fila(), mapeo)
    expect(f.codigoInmueble).toBe('3')
    expect(typeof f.codigoInmueble).toBe('string')
    expect(f.direccion).toBe('Calle Falsa 123')
  })
})

describe('% Comisión con la forma real', () => {
  it.each([
    ['7.5%', 7.5],
    ['6.76%', 6.76],
    ['0%', 0],
    ['7,5 %', 7.5],
  ])('«%s» -> %s', (celda, esperado) => {
    expect(armarFilaAMigrar(fila({ '% Comisión': celda }), mapeo).comisionPorcentaje).toBe(esperado)
  })
})

describe('Prorrateado: vacío, ausente o no reconocido = la agencia decide', () => {
  it('SI y NO se leen y viajan explícitos', () => {
    expect(armarFilaAMigrar(fila({ Prorrateado: 'SI' }), mapeo).prorratearPrimerMes).toBe(true)
    expect(armarFilaAMigrar(fila({ Prorrateado: 'No' }), mapeo).prorratearPrimerMes).toBe(false)
  })

  it('celda vacía: no viaja valor (nunca un default) y no es «no reconocido»', () => {
    const f = armarFilaAMigrar(fila({ Prorrateado: '' }), mapeo)
    expect(f.prorratearPrimerMes).toBeUndefined()
    expect(prorrateadoNoReconocido('')).toBe(false)
    expect(prorrateadoNoReconocido(undefined)).toBe(false)
  })

  it('texto que no se entiende: no viaja valor y se marca no reconocido', () => {
    expect(armarFilaAMigrar(fila({ Prorrateado: 'a veces' }), mapeo).prorratearPrimerMes).toBeUndefined()
    expect(prorrateadoNoReconocido('a veces')).toBe(true)
    expect(prorrateadoNoReconocido('SI')).toBe(false)
  })

  it('el origen dice si falta definir y con qué texto', () => {
    expect(leerFilaDelArchivo(fila({ Prorrateado: 'SI' }), mapeo).origen.prorrateo).toEqual({ estado: 'si' })
    expect(leerFilaDelArchivo(fila({ Prorrateado: 'NO' }), mapeo).origen.prorrateo).toEqual({ estado: 'no' })
    expect(leerFilaDelArchivo(fila({ Prorrateado: '' }), mapeo).origen.prorrateo).toEqual({ estado: 'sinDecidir' })
    expect(leerFilaDelArchivo(fila({ Prorrateado: 'a veces' }), mapeo).origen.prorrateo).toEqual({
      estado: 'sinDecidir',
      texto: 'a veces',
    })
  })

  it('sin la columna, todas quedan por decidir', () => {
    const sin = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Prorrateado'))
    const l = leerFilaDelArchivo(fila(), sin)
    expect(l.fila.prorratearPrimerMes).toBeUndefined()
    expect(l.origen.prorrateo).toEqual({ estado: 'sinDecidir' })
  })
})

describe('Renovación automática -> noSeProrroga (contrato A1)', () => {
  it('NO -> true, SI -> false', () => {
    expect(armarFilaAMigrar(fila({ 'Renovación automática': 'NO' }), mapeo).noSeProrroga).toBe(true)
    expect(armarFilaAMigrar(fila({ 'Renovación automática': 'SI' }), mapeo).noSeProrroga).toBe(false)
  })

  it('vacío, no reconocido o sin columna: la CLAVE no viaja', () => {
    for (const celda of ['', 'tal vez']) {
      const f = armarFilaAMigrar(fila({ 'Renovación automática': celda }), mapeo)
      expect('noSeProrroga' in JSON.parse(JSON.stringify(f))).toBe(false)
    }
    const sin = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Renovación automática'))
    expect('noSeProrroga' in JSON.parse(JSON.stringify(armarFilaAMigrar(fila(), sin)))).toBe(false)
    expect(noSeProrrogaDeCelda('')).toBeUndefined()
  })
})

describe('Impuestos asumidos -> trasladaGmfAlPropietario (contrato A2)', () => {
  const clave = (celda: unknown) =>
    JSON.parse(JSON.stringify(armarFilaAMigrar(fila({ 'Impuestos asumidos': celda }), mapeo)))

  it('SI -> true, NO -> false', () => {
    expect(clave('SI').trasladaGmfAlPropietario).toBe(true)
    expect(clave('No').trasladaGmfAlPropietario).toBe(false)
  })

  it('vacío o no reconocido: la CLAVE no viaja', () => {
    expect('trasladaGmfAlPropietario' in clave('')).toBe(false)
    expect('trasladaGmfAlPropietario' in clave('quizá')).toBe(false)
  })
})

describe('lo que queda sólo en el origen (nunca viaja)', () => {
  it('consecutivo del detalle, canon de la fila, total y valor de la comisión', () => {
    const { fila: f, origen } = leerFilaDelArchivo(fila({ 'Consecutivo detalle': 2 }), mapeo)
    expect(origen.consecutivoDetalle).toBe('2')
    expect(origen.canonDeLaFila).toBe(1000000)
    expect(origen.canonTotal).toBe(1000000)
    expect(origen.valorComision).toBe(75000)
    const claves = Object.keys(JSON.parse(JSON.stringify(f)))
    expect(claves).not.toContain('consecutivoDetalle')
    expect(claves).not.toContain('valorComision')
  })
})
