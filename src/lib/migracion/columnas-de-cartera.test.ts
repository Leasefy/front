import { describe, expect, it } from 'vitest'

import { puntajeDeEncabezado } from '@/components/migracion/encabezado-del-archivo'

import {
  COLUMNAS_DE_CARTERA,
  columnasQueFaltan,
  esDeUnPropietario,
  mapearColumnasDeCartera,
  opcionesParaLaColumna,
  remapearCartera,
  type CampoDeCartera,
} from './columnas-de-cartera'
import { ENCABEZADOS_DEL_INFORME_DE_CARTERA } from './cartera-por-factura.fixture'

/** columna -> campo, sólo las que se reconocieron. */
const reconocidas = (encabezados: readonly string[]) =>
  Object.fromEntries(
    mapearColumnasDeCartera([...encabezados])
      .filter((m) => m.campo !== null)
      .map((m) => [m.columna, m.campo]),
  )

describe('columnas de la cartera por factura (T-0168)', () => {
  it('el informe real: vencimiento, documento y nombre del INQUILINO, concepto y saldo pendiente', () => {
    expect(reconocidas(ENCABEZADOS_DEL_INFORME_DE_CARTERA)).toEqual({
      'Fecha de Vencimiento': 'fechaVencimiento',
      'Fecha de Factura': 'fechaFactura',
      'Documento Inquilino': 'documento',
      'Nombre Inquilino': 'nombre',
      Concepto: 'concepto',
      'Saldo Pendiente': 'valor',
    })
    expect(columnasQueFaltan(mapearColumnasDeCartera([...ENCABEZADOS_DEL_INFORME_DE_CARTERA]))).toEqual([])
  })

  it('nunca toma "Valor Total" como el monto, aunque sea la única columna de plata', () => {
    const m = mapearColumnasDeCartera(['Documento Inquilino', 'Nombre Inquilino', 'Concepto', 'Fecha de Vencimiento', 'Valor Total', 'Valor'])
    expect(m.find((x) => x.campo === 'valor')).toBeUndefined()
    expect(columnasQueFaltan(m)).toEqual(['valor'])
  })

  it('nunca toma las columnas del propietario como el inquilino', () => {
    const m = mapearColumnasDeCartera(['Documento Propietario', 'Nombre Propietario', 'Concepto', 'Fecha de Vencimiento', 'Saldo Pendiente'])
    expect(m.find((x) => x.campo === 'documento')).toBeUndefined()
    expect(m.find((x) => x.campo === 'nombre')).toBeUndefined()
    expect(columnasQueFaltan(m)).toEqual(['documento', 'nombre'])
    for (const t of ['propietario', 'Arrendador', 'Dueño', 'Owner', 'Beneficiario']) {
      expect(esDeUnPropietario(`Documento ${t}`)).toBe(true)
    }
    expect(esDeUnPropietario('Documento Inquilino')).toBe(false)
  })

  it('un documento o nombre genérico, sin decir de quién, no se toma solo', () => {
    const m = mapearColumnasDeCartera(['Documento', 'Nombre', 'NIT', 'Concepto', 'Saldo', 'Fecha de Vencimiento'])
    expect(m.find((x) => x.campo === 'documento')).toBeUndefined()
    expect(m.find((x) => x.campo === 'nombre')).toBeUndefined()
  })

  it('sin vencimiento, la fecha de la factura hace de fecha', () => {
    const m = mapearColumnasDeCartera(['Fecha de Factura', 'Documento Inquilino', 'Nombre Inquilino', 'Concepto', 'Saldo Pendiente'])
    expect(m.find((x) => x.campo === 'fechaFactura')?.columna).toBe('Fecha de Factura')
    expect(columnasQueFaltan(m)).toEqual([])
  })

  it('sin ninguna de las dos fechas, falta la fecha', () => {
    const m = mapearColumnasDeCartera(['Documento Inquilino', 'Nombre Inquilino', 'Concepto', 'Saldo Pendiente'])
    expect(columnasQueFaltan(m)).toEqual(['fecha'])
  })

  it('segunda pasada, por contención: "Cédula del Inquilino", "Nombre completo del arrendatario", "Vencim."', () => {
    expect(reconocidas(['Cédula del Inquilino', 'Nombre completo del arrendatario', 'F. Vencimiento 2', 'Concepto facturado', 'Saldo por cobrar CxC'])).toEqual({
      'Cédula del Inquilino': 'documento',
      'Nombre completo del arrendatario': 'nombre',
      'F. Vencimiento 2': 'fechaVencimiento',
      'Concepto facturado': 'concepto',
      'Saldo por cobrar CxC': 'valor',
    })
  })

  it('la coincidencia exacta le gana a la de contención', () => {
    const m = reconocidas(['Detalle del cobro', 'Concepto', 'Saldo del mes', 'Saldo Pendiente'])
    expect(m['Concepto']).toBe('concepto')
    expect(m['Saldo Pendiente']).toBe('valor')
    expect(m['Saldo del mes']).toBeUndefined()
  })

  it('una columna sólo tiene un campo y un campo sólo una columna al remapear', () => {
    const inicial = mapearColumnasDeCartera([...ENCABEZADOS_DEL_INFORME_DE_CARTERA])
    const a = remapearCartera(inicial, 'Valor Total', 'valor')
    expect(a.find((m) => m.columna === 'Valor Total')?.campo).toBe('valor')
    expect(a.find((m) => m.columna === 'Saldo Pendiente')?.campo).toBeNull()
    const b = remapearCartera(a, 'Valor Total', null)
    expect(b.find((m) => m.columna === 'Valor Total')?.campo).toBeNull()
  })

  it('el selector no ofrece documento ni nombre para una columna del propietario, y remapear lo rechaza', () => {
    const opciones = opcionesParaLaColumna('Documento Propietario')
    expect(opciones).not.toContain<CampoDeCartera>('documento')
    expect(opciones).not.toContain<CampoDeCartera>('nombre')
    expect(opciones).toContain<CampoDeCartera>('concepto')
    expect(opcionesParaLaColumna('Cédula')).toContain<CampoDeCartera>('documento')
    const inicial = mapearColumnasDeCartera([...ENCABEZADOS_DEL_INFORME_DE_CARTERA])
    const igual = remapearCartera(inicial, 'Documento Propietario', 'documento')
    expect(igual).toEqual(inicial)
  })

  it('el reconocedor de la hoja ve el informe como una tabla de cartera', () => {
    const p = puntajeDeEncabezado([...ENCABEZADOS_DEL_INFORME_DE_CARTERA], COLUMNAS_DE_CARTERA)
    expect(p.obligatorias).toBeGreaterThanOrEqual(4)
    const otra = puntajeDeEncabezado(['x', 'y'], COLUMNAS_DE_CARTERA)
    expect(otra.obligatorias).toBe(0)
  })
})
