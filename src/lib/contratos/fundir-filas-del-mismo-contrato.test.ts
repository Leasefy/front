/**
 * T-0153 §4.3: un contrato con varios copropietarios llega en varias filas
 * (una por dueño). Se funden en UNA fila a migrar sólo si TODO coincide; si no,
 * quedan separadas y el back las sigue frenando. Datos inventados.
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { leerFilaDelArchivo, type FilaLeida } from './armar-fila'
import { fundirFilasDelMismoContrato } from './fundir-filas-del-mismo-contrato'

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
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
  'Prorrateado',
]
const CON_DETALLE = mapearColumnas(ENCABEZADO)
const SIN_DETALLE = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Consecutivo detalle'))
const SIN_TOTAL = mapearColumnas(ENCABEZADO.filter((h) => h !== 'Total Canon Contrato'))

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
    'Valor canon': 600000,
    '% Comisión': '7%',
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    Prorrateado: 'SI',
    ...over,
  }
}
const leer = (filas: Array<Record<string, unknown>>, mapeo = CON_DETALLE): FilaLeida[] =>
  filas.map((f) => leerFilaDelArchivo(f, mapeo))

const DOS = [
  fila(),
  fila({ 'Consecutivo detalle': 2, 'Documento Propietario': 333, 'Nombre Propietario': 'Dueño Dos', 'Valor canon': 400000 }),
]

describe('fundirFilasDelMismoContrato', () => {
  it('dos dueños del mismo contrato -> UNA fila con el reparto', () => {
    const r = fundirFilasDelMismoContrato(leer(DOS))
    expect(r).toHaveLength(1)
    const f = r[0].fila
    expect(f.monthlyRent).toBe(1000000)
    expect(f.canonPorPropietario).toEqual([600000, 400000])
    expect(f.propietario?.documento).toBe('111')
    expect(f.propietarios?.map((p) => p.documento)).toEqual(['111', '333'])
    expect(f.propietarios?.map((p) => p.participacionBps)).toEqual([6000, 4000])
    expect(f.externalId).toBe('900')
    expect(r[0].origen.propietarios.map((p) => p.documento)).toEqual(['111', '333'])
  })

  it('ordena por «Consecutivo detalle», no por el orden del archivo', () => {
    const r = fundirFilasDelMismoContrato(leer([DOS[1], DOS[0]]))
    expect(r).toHaveLength(1)
    expect(r[0].fila.propietarios?.map((p) => p.documento)).toEqual(['111', '333'])
    expect(r[0].fila.canonPorPropietario).toEqual([600000, 400000])
  })

  it('sin la columna de detalle usa el orden del archivo', () => {
    const filas = [DOS[1], DOS[0]].map(({ 'Consecutivo detalle': _d, ...resto }) => resto)
    const r = fundirFilasDelMismoContrato(leer(filas, SIN_DETALLE))
    expect(r[0].fila.propietarios?.map((p) => p.documento)).toEqual(['333', '111'])
  })

  it('sin «Total Canon Contrato» el canon es la suma de las partes', () => {
    const filas = DOS.map(({ 'Total Canon Contrato': _t, ...resto }) => resto)
    const r = fundirFilasDelMismoContrato(leer(filas, SIN_TOTAL))
    expect(r).toHaveLength(1)
    expect(r[0].fila.monthlyRent).toBe(1000000)
  })

  it('tres dueños', () => {
    const tres = [
      fila({ 'Valor canon': 500000 }),
      fila({ 'Consecutivo detalle': 2, 'Documento Propietario': 333, 'Valor canon': 300000 }),
      fila({ 'Consecutivo detalle': 3, 'Documento Propietario': 444, 'Valor canon': 200000 }),
    ]
    const r = fundirFilasDelMismoContrato(leer(tres))
    expect(r).toHaveLength(1)
    expect(r[0].fila.canonPorPropietario).toEqual([500000, 300000, 200000])
  })

  it('una fila sola y contratos distintos no se tocan, y el orden se conserva', () => {
    const otro = fila({ 'Consecutivo contrato': 901, 'Valor canon': 1000000 })
    const r = fundirFilasDelMismoContrato(leer([otro, ...DOS]))
    expect(r).toHaveLength(2)
    expect(r[0].fila.externalId).toBe('901')
    expect(r[1].fila.externalId).toBe('900')
  })

  describe('si algo no coincide, quedan SEPARADAS (el back las frena)', () => {
    const casos: Array<[string, Record<string, unknown>]> = [
      ['otro inquilino', { 'Documento Inquilino': 999 }],
      ['otro inmueble', { 'Nro. Propiedad': 8, 'Dirección Propiedad': 'Otra 1' }],
      ['otra fecha de inicio', { 'Fecha inicio': '2025-02-10' }],
      ['otra fecha fin', { 'Fecha fin': '2026-02-09' }],
      ['otra fecha de cartera', { 'Fecha Cartera': '2025-01-20' }],
      ['el mismo propietario repetido', { 'Documento Propietario': 111 }],
      ['mismo consecutivo de detalle', { 'Consecutivo detalle': 1 }],
      ['otro total del contrato', { 'Total Canon Contrato': 2000000 }],
      ['otro prorrateado', { Prorrateado: 'NO' }],
      ['otra comisión', { '% Comisión': '9%' }],
    ]
    it.each(casos)('%s', (_n, cambio) => {
      const filas = [DOS[0], { ...DOS[1], ...cambio }]
      expect(fundirFilasDelMismoContrato(leer(filas))).toHaveLength(2)
    })

    it('sin consecutivo de contrato no hay con qué agrupar', () => {
      const sin = DOS.map((f) => ({ ...f, 'Consecutivo contrato': '' }))
      expect(fundirFilasDelMismoContrato(leer(sin))).toHaveLength(2)
    })

    it('si a una fila le falta su parte del canon', () => {
      const filas = [DOS[0], { ...DOS[1], 'Valor canon': '' }]
      expect(fundirFilasDelMismoContrato(leer(filas))).toHaveLength(2)
    })

    it('si una fila no trae documento del propietario', () => {
      const filas = [DOS[0], { ...DOS[1], 'Documento Propietario': '' }]
      expect(fundirFilasDelMismoContrato(leer(filas))).toHaveLength(2)
    })
  })

  it('no manda «Consecutivo detalle» en la fila fundida', () => {
    const r = fundirFilasDelMismoContrato(leer(DOS))
    expect(Object.keys(JSON.parse(JSON.stringify(r[0].fila)))).not.toContain('consecutivoDetalle')
  })

  /*
   * T-0163 (Anexo B1): UN dueño y VARIOS inquilinos en filas distintas = un
   * contrato con inquilinos que se reparten la factura. Datos inventados.
   */
  describe('modo inquilinos (T-0163)', () => {
    const INQ_A = fila({ 'Total Canon Contrato': 2521008, 'Valor canon': 1260504 })
    const INQ_B = fila({
      'Total Canon Contrato': 2521008,
      'Consecutivo detalle': 2,
      'Documento Inquilino': 333,
      'Nombre Inquilino': 'Inquilino Dos',
      'Email inquilino': 'y@example.test',
      'Valor canon': 1260504,
    })
    const DOS_INQ = [INQ_A, INQ_B]

    it('un dueño y dos inquilinos -> UNA fila con canonPorInquilino alineado', () => {
      const r = fundirFilasDelMismoContrato(leer(DOS_INQ))
      expect(r).toHaveLength(1)
      const f = r[0].fila
      expect(f.monthlyRent).toBe(2521008)
      expect(f.canonPorInquilino).toEqual([1260504, 1260504])
      expect(f.inquilino.documento).toBe('222')
      expect(f.inquilinos).toEqual([
        { documento: '222', nombre: 'Inquilino Uno' },
        { documento: '333', nombre: 'Inquilino Dos' },
      ])
      expect(f.propietario?.documento).toBe('111')
      expect(f.canonPorPropietario).toBeUndefined()
      expect(r[0].origen.inquilinos.map((p) => p.documento)).toEqual(['222', '333'])
    })

    it('nunca manda participacionBps ni tipoDocumento de los inquilinos', () => {
      const f = JSON.parse(JSON.stringify(fundirFilasDelMismoContrato(leer(DOS_INQ))[0].fila))
      for (const t of f.inquilinos) {
        expect(Object.keys(t).sort()).toEqual(['documento', 'nombre'])
      }
      expect(Object.keys(f)).not.toContain('consecutivoDetalle')
    })

    it('tres inquilinos se ordenan por «Consecutivo detalle», no por el archivo', () => {
      const tres = [
        fila({ 'Consecutivo detalle': 3, 'Documento Inquilino': 444, 'Nombre Inquilino': 'Tres', 'Valor canon': 200000 }),
        fila({ 'Consecutivo detalle': 1, 'Valor canon': 500000 }),
        fila({ 'Consecutivo detalle': 2, 'Documento Inquilino': 333, 'Nombre Inquilino': 'Dos', 'Valor canon': 300000 }),
      ]
      const r = fundirFilasDelMismoContrato(leer(tres))
      expect(r).toHaveLength(1)
      expect(r[0].fila.inquilinos?.map((t) => t.documento)).toEqual(['222', '333', '444'])
      expect(r[0].fila.canonPorInquilino).toEqual([500000, 300000, 200000])
    })

    it('sin «Total Canon Contrato» el canon es la suma de las partes', () => {
      const filas = DOS_INQ.map(({ 'Total Canon Contrato': _t, ...resto }) => resto)
      const r = fundirFilasDelMismoContrato(leer(filas, SIN_TOTAL))
      expect(r[0].fila.monthlyRent).toBe(2521008)
    })

    it('MIXTO (dueños distintos E inquilinos distintos) queda separado', () => {
      const mixto = [INQ_A, { ...INQ_B, 'Documento Propietario': 555, 'Nombre Propietario': 'Otro Dueño' }]
      expect(fundirFilasDelMismoContrato(leer(mixto))).toHaveLength(2)
    })

    it('el mismo inquilino dos veces con el mismo dueño no se funde', () => {
      const repetido = [INQ_A, { ...INQ_A, 'Consecutivo detalle': 2 }]
      expect(fundirFilasDelMismoContrato(leer(repetido))).toHaveLength(2)
    })

    it('el modo dueños sigue igual (mismo inquilino, dueños distintos)', () => {
      const r = fundirFilasDelMismoContrato(leer(DOS))
      expect(r[0].fila.canonPorInquilino).toBeUndefined()
    })

    const noCoinciden: Array<[string, Record<string, unknown>]> = [
      ['otro inmueble', { 'Nro. Propiedad': 8, 'Dirección Propiedad': 'Otra 1' }],
      ['otra fecha de inicio', { 'Fecha inicio': '2025-02-10' }],
      ['otro prorrateado', { Prorrateado: 'NO' }],
      ['otra comisión', { '% Comisión': '9%' }],
      ['otro total del contrato', { 'Total Canon Contrato': 1 }],
      ['mismo consecutivo de detalle', { 'Consecutivo detalle': 1 }],
      ['inquilino sin documento', { 'Documento Inquilino': '' }],
      ['sin su parte del canon', { 'Valor canon': '' }],
    ]
    it.each(noCoinciden)('%s -> separadas', (_n, cambio) => {
      expect(fundirFilasDelMismoContrato(leer([INQ_A, { ...INQ_B, ...cambio }]))).toHaveLength(2)
    })
  })
})
