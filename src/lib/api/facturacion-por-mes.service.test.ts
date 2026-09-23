/**
 * El cable de facturación por mes.
 *
 * Dos cosas que no se ven hasta que fallan en producción: que el cuerpo del
 * POST lleve SÓLO las claves que el DTO declara (`forbidNonWhitelisted: true`
 * en el back devuelve 400 y con él la corrida entera), y que el mes se escriba
 * sin pasar por `new Date('2026-09')`, que en Bogotá cae en agosto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()
const getBlobMock = vi.fn()

vi.mock('./client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    getBlob: (...a: unknown[]) => getBlobMock(...a),
  },
}))

import {
  facturacionPorMesService,
  fechaLegible,
  mesActual,
  mesLegible,
  mesesParaElegir,
} from './facturacion-por-mes.service'

/** Las claves de `GenerarFacturasDto`, escritas a mano contra el back. */
const CLAVES_DEL_DTO = ['mes', 'claves']

/** Las de `CrearResolucionDto`, igual: escritas a mano contra el back. */
const CLAVES_DE_LA_RESOLUCION = [
  'numero',
  'fechaResolucion',
  'prefijo',
  'desde',
  'hasta',
  'vigenteDesde',
  'vigenteHasta',
  'ultimoNumeroUsado',
]

beforeEach(() => {
  getMock.mockReset().mockResolvedValue({})
  postMock.mockReset().mockResolvedValue({})
})

describe('porGenerar', () => {
  it('un solo mes va como desde = hasta', () => {
    void facturacionPorMesService.porGenerar({
      desde: '2026-09',
      hasta: '2026-09',
    })
    expect(getMock).toHaveBeenCalledWith(
      '/inmobiliaria/facturacion/por-generar?desde=2026-09&hasta=2026-09',
    )
  })

  it('🔴 «hasta el 31 de diciembre» viaja tal cual: el back descarta el día', () => {
    void facturacionPorMesService.porGenerar({
      desde: '2026-09',
      hasta: '2026-12-31',
    })
    expect(getMock).toHaveBeenCalledWith(
      '/inmobiliaria/facturacion/por-generar?desde=2026-09&hasta=2026-12-31',
    )
  })

  it('sin rango no manda query: el back responde el mes en curso', () => {
    void facturacionPorMesService.porGenerar()
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/facturacion/por-generar')
  })
})

describe('generar', () => {
  it('🔴 el cuerpo lleva sólo lo que el DTO declara', () => {
    void facturacionPorMesService.generar('2026-09', ['ct-1|2026-09|INQUILINO'])
    const [, cuerpo] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(Object.keys(cuerpo).every((k) => CLAVES_DEL_DTO.includes(k))).toBe(true)
    expect(cuerpo).toEqual({
      mes: '2026-09',
      claves: ['ct-1|2026-09|INQUILINO'],
    })
  })

  it('sin claves manda sólo el mes: el back emite todas las del mes', () => {
    void facturacionPorMesService.generar('2026-09')
    expect(postMock.mock.calls[0]?.[1]).toEqual({ mes: '2026-09' })
    void facturacionPorMesService.generar('2026-09', [])
    expect(postMock.mock.calls[1]?.[1]).toEqual({ mes: '2026-09' })
  })
})

describe('los meses', () => {
  it('mesActual escribe el mes con dos dígitos', () => {
    expect(mesActual(new Date(2026, 8, 12))).toBe('2026-09')
    expect(mesActual(new Date(2026, 0, 1))).toBe('2026-01')
  })

  it('el selector va del más reciente al más viejo y cruza el año', () => {
    const meses = mesesParaElegir(3, new Date(2026, 1, 15))
    expect(meses).toEqual(['2026-02', '2026-01', '2025-12'])
  })

  it('🔴 el mes se lee en español y NO se corre un mes', () => {
    // `new Date('2026-09')` es UTC; en Bogotá (UTC−5) se renderiza agosto.
    expect(mesLegible('2026-09')).toBe('septiembre de 2026')
    expect(mesLegible('2026-01')).toBe('enero de 2026')
    expect(mesLegible('2026-12')).toBe('diciembre de 2026')
  })

  it('un mes que no se entiende se devuelve tal cual, sin inventar', () => {
    expect(mesLegible('2026-13')).toBe('2026-13')
    expect(mesLegible('septiembre')).toBe('septiembre')
  })
})

describe('la resolución de facturación', () => {
  const datos = {
    numero: '18764003394379',
    fechaResolucion: '2026-01-15',
    prefijo: 'FE',
    desde: 1,
    hasta: 5000,
    vigenteDesde: '2026-01-15',
    vigenteHasta: '2028-01-15',
  }

  it('listar pega en /resolucion', () => {
    void facturacionPorMesService.resoluciones()
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/facturacion/resolucion')
  })

  it('🔴 el cuerpo lleva sólo lo que el DTO declara', () => {
    void facturacionPorMesService.crearResolucion(datos)
    const [, cuerpo] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(
      Object.keys(cuerpo).every((k) => CLAVES_DE_LA_RESOLUCION.includes(k)),
    ).toBe(true)
    expect(cuerpo).toEqual(datos)
  })

  it('sin «último número usado» la clave NO viaja: el back la trata como ausente', () => {
    void facturacionPorMesService.crearResolucion(datos)
    expect(postMock.mock.calls[0]?.[1]).not.toHaveProperty('ultimoNumeroUsado')
    void facturacionPorMesService.crearResolucion({
      ...datos,
      ultimoNumeroUsado: 1199,
    })
    expect(postMock.mock.calls[1]?.[1]).toHaveProperty('ultimoNumeroUsado', 1199)
  })

  it('🔴 anular pega en la ruta de la resolución y manda SÓLO el motivo', () => {
    // `AnularResolucionDto` exige `motivo`; con `forbidNonWhitelisted` una
    // clave de más también es 400. El cuerpo vacío de antes hoy es un 400.
    void facturacionPorMesService.anularResolucion(
      'res-1',
      'La DIAN autorizó un rango nuevo.',
    )
    expect(postMock).toHaveBeenCalledWith(
      '/inmobiliaria/facturacion/resolucion/res-1/anular',
      { motivo: 'La DIAN autorizó un rango nuevo.' },
    )
    const cuerpo = postMock.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(Object.keys(cuerpo)).toEqual(['motivo'])
  })
})

describe('fechaLegible', () => {
  it('🔴 lee el día del texto, sin construir un Date', () => {
    // Un `@db.Date` llega como `...T00:00:00.000Z` y en Bogotá (UTC−5) un
    // `new Date()` lo pinta el día anterior. Una vigencia que dice el día
    // equivocado es el defecto que no se puede tener en una resolución.
    expect(fechaLegible('2028-01-15T00:00:00.000Z')).toBe('15/01/2028')
    expect(fechaLegible('2028-01-15')).toBe('15/01/2028')
  })

  it('sin fecha devuelve una raya, no «Invalid Date»', () => {
    expect(fechaLegible(null)).toBe('—')
  })
})

/**
 * 🔴 Nico, 22-09: «dónde puedo descargar el lote o esa factura en sí». Las dos
 * rutas existen en el back (`GET :id/pdf` y `GET documentos.zip`, en
 * `rutas-del-back.json`); acá se fija la forma exacta en que se piden.
 */
describe('el documento de la factura', () => {
  it('el PDF de una factura va a /facturacion/:id/pdf', () => {
    void facturacionPorMesService.pdfDeLaFactura('fac-3')
    expect(getBlobMock).toHaveBeenCalledWith('/inmobiliaria/facturacion/fac-3/pdf')
  })

  it('el lote va a documentos.zip con los ids separados por comas', () => {
    void facturacionPorMesService.zipDeFacturas(['fac-3', 'fac-4'])
    expect(getBlobMock).toHaveBeenCalledWith(
      '/inmobiliaria/facturacion/documentos.zip?ids=fac-3,fac-4',
    )
  })
})
