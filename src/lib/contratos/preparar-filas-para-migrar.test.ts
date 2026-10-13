/**
 * T-0153 §3.4: lo que sale hacia el back. Una fila sin prorrateo decidido NO
 * se manda; las que traen SI/NO siguen; la decisión de la agencia viaja como un
 * `prorratearPrimerMes` explícito. Datos inventados.
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { conLaMismaDecision, prepararFilasParaMigrar } from './preparar-filas-para-migrar'

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
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
  'Prorrateado',
]
const mapeo = mapearColumnas(ENCABEZADO)
const sinColumna = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Prorrateado'))

function fila(n: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'Consecutivo contrato': n,
    'Total Canon Contrato': 1000000,
    'Consecutivo detalle': 1,
    'Nro. Propiedad': n,
    'Dirección Propiedad': `Calle ${n}`,
    'Documento Propietario': 100 + n,
    'Nombre Propietario': `Dueño ${n}`,
    'Documento Inquilino': 200 + n,
    'Nombre Inquilino': `Inquilino ${n}`,
    'Email inquilino': `i${n}@example.test`,
    'Valor canon': 1000000,
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    Prorrateado: 'SI',
    _rowIndex: n + 1,
    ...over,
  }
}
const sinDecisiones = new Map<number, boolean>()

describe('prepararFilasParaMigrar', () => {
  it('con todo reconocido, todo se manda y nada queda por decidir', () => {
    const r = prepararFilasParaMigrar([fila(1), fila(2, { Prorrateado: 'NO' })], mapeo, {}, sinDecisiones)
    expect(r.pendientes).toEqual([])
    expect(r.aMigrar.map((f) => f.prorratearPrimerMes)).toEqual([true, false])
  })

  it('vacío y no reconocido NO se mandan, y las demás siguen', () => {
    const filas = [fila(1), fila(2, { Prorrateado: '' }), fila(3, { Prorrateado: 'a veces' })]
    const r = prepararFilasParaMigrar(filas, mapeo, {}, sinDecisiones)
    expect(r.aMigrar).toHaveLength(1)
    expect(r.aMigrar[0].externalId).toBe('1')
    expect(r.pendientes.map((p) => p.indice)).toEqual([1, 2])
    expect(r.pendientes[0]).toMatchObject({ filaDelArchivo: 4, inmueble: 'Calle 2', inquilino: 'Inquilino 2' })
    expect(r.pendientes[1].texto).toBe('a veces')
  })

  it('sin la columna, todas las filas quedan por decidir', () => {
    const r = prepararFilasParaMigrar([fila(1), fila(2)], sinColumna, {}, sinDecisiones)
    expect(r.aMigrar).toEqual([])
    expect(r.pendientes).toHaveLength(2)
  })

  it('lo que la agencia decide viaja como un prorratearPrimerMes explícito', () => {
    const filas = [fila(1, { Prorrateado: '' }), fila(2, { Prorrateado: '' })]
    const r = prepararFilasParaMigrar(filas, mapeo, {}, new Map([[0, true], [1, false]]))
    expect(r.pendientes).toEqual([])
    // Siguen listadas (para poder cambiarlas) pero ya con su decisión.
    expect(r.porDefinir.map((p) => p.decision)).toEqual([true, false])
    expect(r.aMigrar.map((f) => f.prorratearPrimerMes)).toEqual([true, false])
  })

  it('una decisión sobre una fila decidida por el archivo no la pisa', () => {
    const r = prepararFilasParaMigrar([fila(1, { Prorrateado: 'SI' })], mapeo, {}, new Map([[0, false]]))
    expect(r.aMigrar[0].prorratearPrimerMes).toBe(true)
  })

  it('funde copropietarios y la decisión se toma por contrato (primera fila)', () => {
    const base = { Prorrateado: '', 'Consecutivo contrato': 7, 'Nro. Propiedad': 7, 'Dirección Propiedad': 'Calle 7' }
    const filas = [
      fila(9),
      fila(7, { ...base, 'Valor canon': 600000 }),
      fila(7, { ...base, 'Consecutivo detalle': 2, 'Documento Propietario': 555, 'Valor canon': 400000 }),
    ]
    const sin = prepararFilasParaMigrar(filas, mapeo, {}, sinDecisiones)
    expect(sin.fundidas).toBe(1)
    expect(sin.pendientes.map((p) => p.indice)).toEqual([1])
    const con = prepararFilasParaMigrar(filas, mapeo, {}, new Map([[1, false]]))
    expect(con.aMigrar).toHaveLength(2)
    expect(con.aMigrar[1].propietarios).toHaveLength(2)
    expect(con.aMigrar[1].prorratearPrimerMes).toBe(false)
    expect(con.posiciones).toEqual([0, 1])
  })

  it('T-0158: copias exactas del mismo contrato se unen y se cuentan aparte de los copropietarios', () => {
    const filas = [fila(4), fila(4, { _rowIndex: 9 }), fila(5)]
    const r = prepararFilasParaMigrar(filas, mapeo, {}, sinDecisiones)
    expect(r.repetidas).toBe(1)
    expect(r.fundidas).toBe(0)
    expect(r.aMigrar).toHaveLength(2)
    expect(r.posiciones).toEqual([0, 2])
  })

  it('T-0158: co-inquilinos (otro documento de inquilino) no se unen', () => {
    const filas = [fila(4), fila(4, { 'Documento Inquilino': 999, 'Nombre Inquilino': 'Otro' })]
    const r = prepararFilasParaMigrar(filas, mapeo, {}, sinDecisiones)
    expect(r.repetidas).toBe(0)
    expect(r.aMigrar).toHaveLength(2)
  })

  it('conLaMismaDecision aplica un valor a TODAS las elegidas y a ninguna más', () => {
    const antes = new Map<number, boolean>([[5, false]])
    const despues = conLaMismaDecision(antes, [1, 2, 3], true)
    expect([...despues.entries()]).toEqual([
      [5, false],
      [1, true],
      [2, true],
      [3, true],
    ])
    expect(antes.size).toBe(1)
  })
})

describe('filas fundidas por inquilinos (T-0163)', () => {
  it('cuenta aparte las filas que se unieron por inquilinos', () => {
    const base = { 'Consecutivo contrato': 50, 'Nro. Propiedad': 5, 'Dirección Propiedad': 'Calle 5', 'Documento Propietario': 105 }
    const filas = [
      fila(1),
      fila(5, { ...base, 'Consecutivo detalle': 1, 'Documento Inquilino': 301, 'Valor canon': 400000, 'Total Canon Contrato': 1000000 }),
      fila(5, { ...base, 'Consecutivo detalle': 2, 'Documento Inquilino': 302, 'Valor canon': 600000, 'Total Canon Contrato': 1000000 }),
    ]
    const r = prepararFilasParaMigrar(filas, mapeo, {}, sinDecisiones)
    expect(r.aMigrar).toHaveLength(2)
    expect(r.fundidas).toBe(1)
    expect(r.fundidasPorInquilinos).toBe(1)
  })

  it('las filas fundidas por dueños no cuentan como fundidas por inquilinos', () => {
    const r = prepararFilasParaMigrar([fila(1)], mapeo, {}, sinDecisiones)
    expect(r.fundidasPorInquilinos).toBe(0)
  })
})
