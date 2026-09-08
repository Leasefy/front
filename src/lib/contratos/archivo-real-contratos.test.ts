/**
 * El archivo REAL de contratos entra sin una sola columna «SIN MAPEAR», y sus
 * celdas empaquetadas se leen bien.
 *
 * 🔴 Los ENCABEZADOS son los reales (nombran columnas, no personas). Las FILAS
 * son inventadas con la misma forma: los archivos con datos de gente viva no
 * entran al repo ni a los fixtures.
 */

import { describe, expect, it } from 'vitest'
import { faltantesEsenciales, mapearColumnas } from './columnas-de-contrato'
import { leerFilaDelArchivo } from './armar-fila'
import { faltantesEsencialesConDatos } from './vista-previa-de-migracion'

/** El encabezado de Contracts.csv, en su orden. */
export const ENCABEZADO_CONTRATOS = [
  'Consecutivo',
  'Propiedad',
  'Estrato Propiedad',
  'Propietario de Propiedad',
  'Inquilino',
  'Valor Canon',
  'Canon Total',
  '% Comisión',
  'Periodicidad',
  'Escenario',
  'Estado',
  'Fecha Inicio',
  'Fecha Fin',
  'Fecha de Terminación',
  'Observaciones',
  'Uso',
  'Fecha Creación',
  'Creado por',
]

/** Una fila con la MISMA forma que las reales. Personas y direcciones inventadas. */
const FILA_INVENTADA: Record<string, unknown> = {
  Consecutivo: '1',
  Propiedad: '3 - CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO',
  'Estrato Propiedad': 'Tres',
  'Propietario de Propiedad': '[1] 900111222 - CONSTRUCTORA DEL VALLE S.A.S',
  Inquilino: '[1] 71211270 - JORGE ANDRES LONDONO',
  'Valor Canon': '$1,008,403.00',
  'Canon Total': '$1,008,403.00',
  '% Comisión': '7 %',
  Periodicidad: 'Mensual',
  Escenario: 'Escenario 1 VIVIENDA O LOCAL ENTRE PERSONAS NATURALES ',
  Estado: 'Activo',
  'Fecha Inicio': '2023-03-31',
  'Fecha Fin': '2024-03-30',
  'Fecha de Terminación': '',
  Observaciones: 'Abril de 2025: incremento del 5%.\r\nOctubre de 2025: nuevo ajuste del 5%.',
  Uso: 'Vivienda',
  'Fecha Creación': '2022-04-04 17:33:13',
  'Creado por': 'YINETH VALENTINA OBANDO PARRA',
}

describe('Contracts.csv: el encabezado real', () => {
  const mapeo = mapearColumnas(ENCABEZADO_CONTRATOS)
  const porColumna = Object.fromEntries(mapeo.map((m) => [m.columna, m.campo]))

  it('no deja NINGUNA de las 18 columnas sin mapear', () => {
    const sinCampo = mapeo.filter((m) => m.campo === null).map((m) => m.columna)
    expect(sinCampo).toEqual([])
    expect(mapeo).toHaveLength(18)
  })

  it('cada columna cae en su campo, no en el de al lado', () => {
    expect(porColumna).toEqual({
      Consecutivo: 'consecutivoContrato',
      Propiedad: 'propiedadCodigoYDireccion',
      'Estrato Propiedad': 'estratoInmueble',
      'Propietario de Propiedad': 'propietarioNombre',
      Inquilino: 'inquilinoNombre',
      'Valor Canon': 'canon',
      'Canon Total': 'canonTotal',
      '% Comisión': 'comision',
      Periodicidad: 'periodicidad',
      Escenario: 'escenario',
      Estado: 'estadoContrato',
      'Fecha Inicio': 'fechaInicio',
      'Fecha Fin': 'fechaFin',
      'Fecha de Terminación': 'fechaTerminacion',
      Observaciones: 'observaciones',
      Uso: 'uso',
      'Fecha Creación': 'fechaCreacionOrigen',
      'Creado por': 'creadoPor',
    })
  })

  /*
   * La columna que nombra al dueño se llama «Propietario de Propiedad»: dice
   * «propiedad» y también «propietario». Sin la regla de TÉRMINOS_SIN_PERSONA,
   * el diccionario le ganaba al empate por persona y el propietario entraba
   * como si fuera la dirección del inmueble.
   */
  it('«Propietario de Propiedad» es una persona, no la dirección del inmueble', () => {
    expect(porColumna['Propietario de Propiedad']).toBe('propietarioNombre')
  })

  it('«Fecha Fin» y «Fecha de Terminación» no se pelean el mismo campo', () => {
    expect(porColumna['Fecha Fin']).toBe('fechaFin')
    expect(porColumna['Fecha de Terminación']).toBe('fechaTerminacion')
  })

  it('sin «Fecha Fin» al lado, «Fecha de terminación» sigue siendo el fin del contrato', () => {
    const solo = mapearColumnas(['Fecha de inicio', 'Fecha de terminación'])
    expect(solo[1].campo).toBe('fechaFin')
  })

  it('ningún campo se lo reparten dos columnas', () => {
    const usados = mapeo.map((m) => m.campo).filter(Boolean)
    expect(new Set(usados).size).toBe(usados.length)
  })

  /*
   * `faltantesEsenciales` es la compuerta que frena el import. El archivo real
   * NO trae ni el correo ni el día de pago: eso tiene que seguir frenando —
   * decirlo antes es la diferencia entre corregir el archivo y crear 1.850
   * contratos vacíos.
   */
  it('dice honestamente qué le falta al archivo para poder migrar', () => {
    const faltan = faltantesEsenciales(mapeo).map((f) => f.clave)
    expect(faltan).toEqual(['contactoInquilino', 'diaDePago'])
  })

  /*
   * 🔴 El falso bloqueo. El archivo NO trae una columna de cédula del
   * inquilino: el documento viene DENTRO de «Inquilino» («[1] 71211270 -
   * NOMBRE»). Mirando sólo el mapeo, la compuerta frenaba 1.851 contratos que
   * sí traían el documento en 1.847 de sus filas.
   */
  it('mirando los datos, el documento del inquilino ya NO frena el archivo', () => {
    const faltan = faltantesEsencialesConDatos([FILA_INVENTADA], mapeo).map((f) => f.clave)
    expect(faltan).toEqual(['diaDePago'])
  })

  it('lo que de verdad no está sigue frenando', () => {
    // Sin día de pago en ninguna fila, la compuerta lo dice igual.
    const faltan = faltantesEsencialesConDatos([FILA_INVENTADA], mapeo)
    expect(faltan.map((f) => f.clave)).toContain('diaDePago')
  })
})

describe('Contracts.csv: los valores', () => {
  const mapeo = mapearColumnas(ENCABEZADO_CONTRATOS)
  const { fila, origen } = leerFilaDelArchivo(FILA_INVENTADA, mapeo)

  it('parte «3 - CR 50 …» en código de origen y dirección', () => {
    expect(origen.codigoDeOrigen).toBe('3')
    expect(fila.direccion).toBe('CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO')
  })

  it('el inquilino entra con su nombre, no con «[1] 71211270 - …»', () => {
    expect(fila.inquilino.nombre).toBe('JORGE ANDRES LONDONO')
    expect(fila.inquilino.documento).toBe('71211270')
  })

  it('el propietario entra con su documento, que es lo que resuelve la ficha', () => {
    expect(fila.propietario).toEqual({
      documento: '900111222',
      nombre: 'CONSTRUCTORA DEL VALLE S.A.S',
      correo: undefined,
      telefono: undefined,
    })
  })

  it('lee el canon, la comisión, las fechas y el uso', () => {
    expect(fila.monthlyRent).toBe(1008403)
    expect(fila.comisionPorcentaje).toBe(7)
    expect(fila.startDate).toBe('2023-03-31')
    expect(fila.endDate).toBe('2024-03-30')
    expect(fila.usoInmueble).toBe('VIVIENDA')
    expect(fila.periodicidad).toBe('MENSUAL')
  })

  it('lee todo lo demás del archivo, en vez de tirarlo', () => {
    expect(origen.consecutivo).toBe('1')
    expect(origen.estrato).toBe(3)
    expect(origen.estado).toBe('Activo')
    expect(origen.escenario).toContain('Escenario 1')
    expect(origen.fechaCreacion).toBe('2022-04-04')
    expect(origen.creadoPor).toBe('YINETH VALENTINA OBANDO PARRA')
    expect(origen.observaciones).toContain('Octubre de 2025')
  })

  /*
   * 🔴 El código de origen SÍ viaja en `codigoInmueble` desde el 2026-09-08
   * (back `48e30bb`): el campo dejó de ser el consecutivo de Leasefy y pasó a
   * ser, primero, el «Código» de la inmobiliaria (`Property.externalId`) — que
   * es exactamente lo que trae la columna «Propiedad». Es la asociación buena:
   * la dirección es sólo el respaldo.
   */
  it('manda el código de origen como codigoInmueble', () => {
    expect(fila.codigoInmueble).toBe('3')
  })

  /*
   * El «Consecutivo» es la llave de idempotencia del contrato: sin él,
   * reimportar el archivo duplica el historial y los comprobantes contables
   * viejos no saben de qué contrato colgarse.
   */
  it('manda el consecutivo del contrato como externalId', () => {
    expect(fila.externalId).toBe('1')
  })

  it('manda las listas completas de propietarios e inquilinos, sin el `orden` del front', () => {
    expect(fila.propietarios).toEqual([
      { documento: '900111222', nombre: 'CONSTRUCTORA DEL VALLE S.A.S' },
    ])
    expect(fila.inquilinos).toEqual([
      { documento: '71211270', nombre: 'JORGE ANDRES LONDONO' },
    ])
  })

  it('manda el escenario, el estado y las observaciones tal como los escribió la inmobiliaria', () => {
    expect(fila.escenarioOrigen).toContain('Escenario 1')
    expect(fila.estadoOrigen).toBe('Activo')
    expect(fila.observaciones).toContain('Octubre de 2025')
    expect(fila.creadoPor).toBe('YINETH VALENTINA OBANDO PARRA')
    expect(fila.fechaCreacionOrigen).toBe('2022-04-04')
  })

  it('con dos propietarios, el titular es el [1] y el otro queda a la vista', () => {
    const { fila: f, origen: o } = leerFilaDelArchivo(
      {
        ...FILA_INVENTADA,
        'Propietario de Propiedad':
          '[1] 43090971 - LUZ ADRIANA PEREZ, [2] 42979803 - MARIA VICTORIA PEREZ',
        'Valor Canon': '$504,201.00, $504,202.00',
      },
      mapeo,
    )
    expect(f.propietario?.documento).toBe('43090971')
    expect(o.propietarios).toHaveLength(2)
    expect(o.propietarios[1].documento).toBe('42979803')
    // Y los dos viajan: el [1] es el titular del mandato y el [2] queda como
    // copropietario en partes iguales.
    expect(f.propietarios).toEqual([
      { documento: '43090971', nombre: 'LUZ ADRIANA PEREZ' },
      { documento: '42979803', nombre: 'MARIA VICTORIA PEREZ' },
    ])
    // El canon repartido no es UN número: manda «Canon Total».
    expect(f.monthlyRent).toBe(1008403)
  })

  it('un contrato terminado trae su fecha de terminación aparte del fin pactado', () => {
    const { fila: f, origen: o } = leerFilaDelArchivo(
      { ...FILA_INVENTADA, Estado: 'Terminado', 'Fecha de Terminación': '2024-04-30' },
      mapeo,
    )
    expect(f.endDate).toBe('2024-03-30')
    expect(o.fechaTerminacion).toBe('2024-04-30')
    expect(o.estado).toBe('Terminado')
    // Y viajan las dos: `endDate` es lo pactado, `fechaTerminacion` es cuándo
    // terminó de verdad. El back migra el contrato como histórico.
    expect(f.fechaTerminacion).toBe('2024-04-30')
    expect(f.estadoOrigen).toBe('Terminado')
  })

  it('sin «Canon Total», el canon suelto sigue sirviendo', () => {
    const sinTotal = mapearColumnas(ENCABEZADO_CONTRATOS.filter((h) => h !== 'Canon Total'))
    const { fila: f } = leerFilaDelArchivo(FILA_INVENTADA, sinTotal)
    expect(f.monthlyRent).toBe(1008403)
  })
})
