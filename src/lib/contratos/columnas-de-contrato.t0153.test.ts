/**
 * T-0153 (WU-2): el encabezado REAL de «contratos por detalles» (32 columnas,
 * sólo encabezados: ninguna celda de gente viva entra al repo) y los alias
 * nuevos del contrato congelado §4.1.
 */
import { describe, expect, it } from 'vitest'
import {
  NO_SE_MIGRA_EL_CODEUDOR,
  mapearColumnas,
  type CampoDeContrato,
} from './columnas-de-contrato'

const ENCABEZADO_POR_DETALLES = [
  'Consecutivo contrato',
  'Total Canon Contrato',
  'Consecutivo detalle',
  'Nro. Propiedad',
  'Dirección Propiedad',
  'Documento Propietario',
  'Nombre Propietario',
  'Teléfono propietario',
  'Email propietario',
  'Documento Inquilino',
  'Nombre Inquilino',
  'Teléfono inquilino',
  'Email inquilino',
  'Codeudores',
  'Valor canon',
  '% Comisión',
  'Valor comisión',
  'Total arrendamiento',
  'Periodicidad',
  'Días de Plazo',
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
  'Tipo de Uso',
  'Escenario',
  'Prorrateado',
  'Renovación automática',
  'Impuestos asumidos',
  'Cobro de Intereses',
  'Tipo de interés',
  'Observaciones',
  'Estado',
]

const campoDe = (encabezado: string, todos = [encabezado]): CampoDeContrato | null =>
  mapearColumnas(todos).find((m) => m.columna === encabezado)?.campo ?? null

describe('T-0153: el encabezado real de «contratos por detalles»', () => {
  const mapeo = mapearColumnas(ENCABEZADO_POR_DETALLES)
  const de = (col: string) => mapeo.find((m) => m.columna === col)!

  it.each([
    ['Consecutivo contrato', 'consecutivoContrato'],
    ['Total Canon Contrato', 'canonTotal'],
    ['Consecutivo detalle', 'consecutivoDetalle'],
    ['Nro. Propiedad', 'codigoInmueble'],
    ['Dirección Propiedad', 'direccionInmueble'],
    ['Documento Propietario', 'propietarioDocumento'],
    ['Nombre Propietario', 'propietarioNombre'],
    ['Documento Inquilino', 'inquilinoDocumento'],
    ['Nombre Inquilino', 'inquilinoNombre'],
    ['Email inquilino', 'inquilinoCorreo'],
    ['Valor canon', 'canon'],
    ['% Comisión', 'comision'],
    ['Valor comisión', 'valorComision'],
    ['Periodicidad', 'periodicidad'],
    ['Días de Plazo', 'diasDePlazo'],
    ['Fecha inicio', 'fechaInicio'],
    ['Fecha fin', 'fechaFin'],
    ['Fecha Cartera', 'fechaDeCartera'],
    ['Tipo de Uso', 'uso'],
    ['Escenario', 'escenario'],
    ['Prorrateado', 'prorrateado'],
    ['Renovación automática', 'renovacionAutomatica'],
    ['Impuestos asumidos', 'impuestosAsumidos'],
    ['Observaciones', 'observaciones'],
    ['Estado', 'estadoContrato'],
  ])('«%s» -> %s', (columna, campo) => {
    expect(de(columna).campo).toBe(campo)
  })

  it('Codeudores (plural) dice que no se migra, en vez de un guion mudo', () => {
    expect(de('Codeudores').campo).toBeNull()
    expect(de('Codeudores').noSeMigra).toBe(NO_SE_MIGRA_EL_CODEUDOR)
  })

  it.each(['Total arrendamiento', 'Cobro de Intereses', 'Tipo de interés'])(
    '«%s» se reconoce y dice por qué no se migra',
    (columna) => {
      expect(de(columna).campo).toBeNull()
      expect(de(columna).noSeMigra).toBeTruthy()
    },
  )
})

describe('T-0153: alias nuevos (§4.1)', () => {
  it.each(['Fecha de liquidación', 'Fecha de liquidacion', 'FECHA LIQUIDACION', 'Fecha liquidación'])(
    '«%s» es la fecha de cartera',
    (h) => expect(campoDe(h)).toBe('fechaDeCartera'),
  )

  it('«liquidación» a secas NO es la fecha de cartera', () => {
    expect(campoDe('Liquidación del propietario')).not.toBe('fechaDeCartera')
    expect(campoDe('Liquidación')).not.toBe('fechaDeCartera')
  })

  it.each(['Nro. Propiedad', 'Número de propiedad', 'Numero de la propiedad', 'No. Propiedad'])(
    '«%s» es el código del inmueble, no la dirección',
    (h) => expect(campoDe(h, [h, 'Dirección Propiedad'])).toBe('codigoInmueble'),
  )

  it('«Propiedad» a secas sigue siendo código y dirección', () => {
    expect(campoDe('Propiedad')).toBe('propiedadCodigoYDireccion')
  })

  it.each(['Consecutivo detalle', 'Número detalle', 'Detalle consecutivo', 'Consecutivo de detalle'])(
    '«%s» es el consecutivo del detalle',
    (h) => expect(campoDe(h)).toBe('consecutivoDetalle'),
  )

  it.each(['Renovación automática', 'Renovacion automatica', 'Se renueva', 'Renovación'])(
    '«%s» es la renovación automática',
    (h) => expect(campoDe(h)).toBe('renovacionAutomatica'),
  )

  it.each(['Impuestos asumidos', 'Impuestos asumidos por el propietario', 'Asume impuestos', '4x1000', 'GMF'])(
    '«%s» es el 4x1000 del giro (A2)',
    (h) => expect(campoDe(h)).toBe('impuestosAsumidos'),
  )

  it.each(['Codeudores', 'Coodeudores', 'Fiadores'])('«%s» no se migra', (h) => {
    const m = mapearColumnas([h])[0]
    expect(m.campo).toBeNull()
    expect(m.noSeMigra).toBe(NO_SE_MIGRA_EL_CODEUDOR)
  })

  it('no cambia el destino de los encabezados que ya andaban', () => {
    expect(campoDe('Fecha Cartera')).toBe('fechaDeCartera')
    expect(campoDe('Consecutivo')).toBe('consecutivoContrato')
    expect(campoDe('Comisión')).toBe('comision')
    expect(campoDe('% Comisión')).toBe('comision')
    expect(campoDe('Código inmueble')).toBe('codigoInmueble')
  })
})
