/**
 * El parser de encabezados contra los archivos que manda una inmobiliaria
 * colombiana de verdad.
 *
 * Origen: el 2026-09-03 entró un archivo de 110 contratos y las 110 filas
 * quedaron guardadas vacías —`{"direccion":"","inquilino":{"correo":"",
 * "nombre":""}}`— porque el auto-mapeo no reconoció NINGUNA columna y el
 * importador dejó continuar igual.
 *
 * Esta tabla es la medida honesta de «reconoce bien las columnas»: no un
 * puñado de casos lindos, sino las formas que llegan de verdad — acentos y
 * sin acentos, MAYÚSCULAS, abreviaturas («CC», «Tel.», «Cod.»), sinónimos
 * («tenedor», «vence», «alquiler»), unidades pegadas («Canon (COP)»,
 * «Comisión %») y encabezados compuestos («Correo electrónico del
 * arrendatario»).
 */

import { describe, it, expect } from 'vitest'

import {
  mapearColumnas,
  remapear,
  faltantesEsenciales,
  mejorFilaDeEncabezado,
  normalizarEncabezado,
  type CampoDeContrato,
} from './columnas-de-contrato'

function campoDe(encabezado: string): CampoDeContrato | null {
  return mapearColumnas([encabezado])[0].campo
}

/**
 * [encabezado tal como llega, campo esperado].
 *
 * `null` significa «no tenemos campo para esto»: quedar sin mapear es un
 * resultado CORRECTO — el error caro es mapearlo a otra cosa con confianza.
 */
export const CASOS_REALES: Array<[string, CampoDeContrato | null]> = [
  // ── Inmueble: dirección ──────────────────────────────────────────────────
  ['Dirección', 'direccionInmueble'],
  ['direccion', 'direccionInmueble'],
  ['DIRECCION', 'direccionInmueble'],
  ['DIRECCIÓN', 'direccionInmueble'],
  ['Dirección del inmueble', 'direccionInmueble'],
  ['Direccion Inmueble', 'direccionInmueble'],
  ['DIRECCIÓN DEL PREDIO', 'direccionInmueble'],
  ['Dirección  del\ninmueble', 'direccionInmueble'],
  ['  Dirección   del   inmueble  ', 'direccionInmueble'],
  ['Dir. Inmueble', 'direccionInmueble'],
  ['Ubicación del inmueble', 'direccionInmueble'],
  ['Dirección de la propiedad', 'direccionInmueble'],
  ['Address', 'direccionInmueble'],

  // ── Inmueble: código ─────────────────────────────────────────────────────
  ['Código del inmueble', 'codigoInmueble'],
  ['CODIGO INMUEBLE', 'codigoInmueble'],
  ['Cod. Inmueble', 'codigoInmueble'],
  ['Cód. Inmueble', 'codigoInmueble'],
  ['Id Inmueble', 'codigoInmueble'],
  ['# Inmueble', 'codigoInmueble'],
  ['No. Inmueble', 'codigoInmueble'],
  ['Nro Inmueble', 'codigoInmueble'],
  ['Código Predio', 'codigoInmueble'],

  // ── Inmueble: ciudad ─────────────────────────────────────────────────────
  ['Ciudad', 'ciudadInmueble'],
  ['CIUDAD', 'ciudadInmueble'],
  ['Municipio', 'ciudadInmueble'],
  ['Ciudad del inmueble', 'ciudadInmueble'],

  // ── Inquilino: nombre ────────────────────────────────────────────────────
  ['Arrendatario', 'inquilinoNombre'],
  ['ARRENDATARIO', 'inquilinoNombre'],
  ['arrendatario', 'inquilinoNombre'],
  ['Inquilino', 'inquilinoNombre'],
  ['Tenedor', 'inquilinoNombre'],
  ['Locatario', 'inquilinoNombre'],
  ['Nombre del arrendatario', 'inquilinoNombre'],
  ['Nombre arrendatario', 'inquilinoNombre'],
  ['NOMBRE DEL ARRENDATARIO', 'inquilinoNombre'],
  ['Nombre completo del arrendatario', 'inquilinoNombre'],
  ['Nombre del inquilino', 'inquilinoNombre'],
  ['Razón social del arrendatario', 'inquilinoNombre'],

  // ── Inquilino: correo ────────────────────────────────────────────────────
  ['Correo arrendatario', 'inquilinoCorreo'],
  ['Correo del arrendatario', 'inquilinoCorreo'],
  ['CORREO INQUILINO', 'inquilinoCorreo'],
  ['E-mail arrendatario', 'inquilinoCorreo'],
  ['Email del arrendatario', 'inquilinoCorreo'],
  ['Correo electrónico del arrendatario', 'inquilinoCorreo'],
  ['Mail inquilino', 'inquilinoCorreo'],

  // ── Inquilino: teléfono ──────────────────────────────────────────────────
  ['Celular arrendatario', 'inquilinoTelefono'],
  ['Teléfono arrendatario', 'inquilinoTelefono'],
  ['Tel. arrendatario', 'inquilinoTelefono'],
  ['Tel arrendatario', 'inquilinoTelefono'],
  ['Cel. inquilino', 'inquilinoTelefono'],
  ['Celular del inquilino', 'inquilinoTelefono'],
  ['WhatsApp arrendatario', 'inquilinoTelefono'],
  ['Teléfono de contacto del arrendatario', 'inquilinoTelefono'],

  // ── Inquilino: documento ─────────────────────────────────────────────────
  ['Cédula arrendatario', 'inquilinoDocumento'],
  ['Cedula del arrendatario', 'inquilinoDocumento'],
  ['CC arrendatario', 'inquilinoDocumento'],
  ['C.C. Arrendatario', 'inquilinoDocumento'],
  ['NIT arrendatario', 'inquilinoDocumento'],
  ['Documento del arrendatario', 'inquilinoDocumento'],
  ['Identificación arrendatario', 'inquilinoDocumento'],
  ['Documento de identidad del arrendatario', 'inquilinoDocumento'],

  // ── Fechas ───────────────────────────────────────────────────────────────
  ['Fecha de inicio', 'fechaInicio'],
  ['Fecha inicio', 'fechaInicio'],
  ['FECHA INICIO', 'fechaInicio'],
  ['Fecha inicial', 'fechaInicio'],
  ['Inicio', 'fechaInicio'],
  ['Desde', 'fechaInicio'],
  ['Vigencia desde', 'fechaInicio'],
  ['Inicio del contrato', 'fechaInicio'],
  ['Fecha de inicio del contrato', 'fechaInicio'],
  ['Fecha de terminación', 'fechaFin'],
  ['Fecha final', 'fechaFin'],
  ['Fecha fin', 'fechaFin'],
  ['Vence', 'fechaFin'],
  ['Vencimiento', 'fechaFin'],
  ['Hasta', 'fechaFin'],
  ['Terminación', 'fechaFin'],
  ['Fecha de vencimiento', 'fechaFin'],
  ['Fecha de terminación del contrato', 'fechaFin'],

  // ── Plata ────────────────────────────────────────────────────────────────
  ['Canon', 'canon'],
  ['CANON', 'canon'],
  ['Canon mensual', 'canon'],
  ['Canon de arrendamiento', 'canon'],
  ['Canon (COP)', 'canon'],
  ['Valor arriendo', 'canon'],
  ['Valor del arriendo', 'canon'],
  ['Valor del canon mensual', 'canon'],
  ['Arriendo', 'canon'],
  ['Renta', 'canon'],
  ['Alquiler', 'canon'],
  ['Depósito', 'deposito'],
  ['Deposito', 'deposito'],
  ['Garantía', 'deposito'],
  ['Depósito de garantía', 'deposito'],

  // ── Cobro ────────────────────────────────────────────────────────────────
  ['Día de pago', 'diaDePago'],
  ['Dia pago', 'diaDePago'],
  ['DIA DE PAGO', 'diaDePago'],
  ['Día límite de pago', 'diaDePago'],
  ['Día de pago del canon', 'diaDePago'],
  ['Fecha de pago', 'diaDePago'],
  ['Periodicidad', 'periodicidad'],
  ['Frecuencia', 'periodicidad'],
  ['Frecuencia de pago', 'periodicidad'],
  ['Periodicidad de pago', 'periodicidad'],
  ['Comisión', 'comision'],
  ['Comisión %', 'comision'],
  ['Comision (%)', 'comision'],
  ['% Comisión', 'comision'],
  ['% Administración', 'comision'],
  ['Comisión de administración', 'comision'],
  ['Honorarios', 'comision'],
  // La familia «cuota»: mapea, pero siempre como dudosa (ver más abajo).
  ['Cuota de administración', 'comision'],
  ['Cuota de administracion', 'comision'],
  ['CUOTA DE ADMINISTRACIÓN', 'comision'],
  ['Cuota admin', 'comision'],
  ['Cuota', 'comision'],
  ['Administración', 'comision'],
  ['ADMINISTRACION', 'comision'],
  ['Uso', 'uso'],
  ['Uso del inmueble', 'uso'],
  ['Destinación', 'uso'],
  ['Destino', 'uso'],

  // ── Propietario ──────────────────────────────────────────────────────────
  ['Propietario', 'propietarioNombre'],
  ['PROPIETARIO', 'propietarioNombre'],
  ['Arrendador', 'propietarioNombre'],
  ['Dueño', 'propietarioNombre'],
  ['Nombre del propietario', 'propietarioNombre'],
  ['Nombre del arrendador', 'propietarioNombre'],
  ['Cédula propietario', 'propietarioDocumento'],
  ['CC propietario', 'propietarioDocumento'],
  ['NIT del propietario', 'propietarioDocumento'],
  ['Documento del arrendador', 'propietarioDocumento'],
  ['Correo propietario', 'propietarioCorreo'],
  ['Email del propietario', 'propietarioCorreo'],
  ['E-mail propietario', 'propietarioCorreo'],
  ['Correo del arrendador', 'propietarioCorreo'],
  ['Celular propietario', 'propietarioTelefono'],
  ['Tel. propietario', 'propietarioTelefono'],
  ['Teléfono del arrendador', 'propietarioTelefono'],
  ['WhatsApp propietario', 'propietarioTelefono'],

  // ── Lo que NO tiene campo: quedar sin mapear es el resultado correcto ─────
  ['Dirección del propietario', null],
  ['Dirección del arrendatario', null],
  ['Dirección de notificación', null],
  ['Ciudad del propietario', null],
  ['Municipio del arrendatario', null],
  // «Valor administración» dice PLATA con todas las letras: es la cuota del
  // edificio, y para eso no hay campo.
  ['Valor administración', null],
  ['Administración mensual', null],
  ['Tipo de documento del arrendatario', null],
  ['Fecha de nacimiento', null],
  ['Código', null],
  ['Código postal', null],
  ['Código del contrato', null],
  ['Teléfono', null],
  ['Cédula', null],
  ['Matrícula inmobiliaria', null],
  ['Observaciones', null],
  ['Estrato', null],
  ['Zutano mengano', null],
]

describe('la tabla de encabezados reales', () => {
  it.each(CASOS_REALES)('«%s» → %s', (encabezado, esperado) => {
    expect(campoDe(encabezado)).toBe(esperado)
  })

  it('los 19 campos del contrato tienen al menos un encabezado que los reconoce', () => {
    const cubiertos = new Set(CASOS_REALES.map(([, campo]) => campo).filter(Boolean))
    expect(cubiertos.size).toBe(19)
  })
})

describe('normalización', () => {
  it('mayúsculas, tildes, puntuación y saltos de línea colapsan a lo mismo', () => {
    const esperado = 'direccion del inmueble'
    for (const forma of [
      'Dirección del inmueble',
      'DIRECCIÓN DEL INMUEBLE',
      'direccion  del  inmueble',
      'Dirección del\ninmueble',
      ' Dirección, del inmueble ',
    ]) {
      expect(normalizarEncabezado(forma)).toBe(esperado)
    }
  })

  it('el BOM que Excel deja al principio del CSV no rompe la primera columna', () => {
    expect(campoDe('﻿Dirección del inmueble')).toBe('direccionInmueble')
  })

  it('«%» y «#» sobreviven porque son datos, no puntuación', () => {
    expect(normalizarEncabezado('Comisión (%)')).toBe('comision %')
    expect(normalizarEncabezado('#Inmueble')).toBe('# inmueble')
  })
})

/**
 * La trampa vieja: `arrendador` es el propietario y `arrendatario` el
 * inquilino, y se diferencian en dos letras. El agujero de la versión
 * anterior era que CUALQUIER encabezado con «arrendatario» que no estuviera
 * listado literalmente caía en el nombre del inquilino.
 */
describe('arrendatario nunca cae en un campo del propietario, ni al revés', () => {
  it('el celular del arrendatario es del inquilino', () => {
    expect(campoDe('Celular arrendatario')).toBe('inquilinoTelefono')
  })

  it('una abreviatura del inquilino NO se convierte en su nombre por descarte', () => {
    // Éste es el bug: «Tel. arrendatario» no estaba en la lista, empataba con
    // el término suelto «arrendatario» y se guardaba como el NOMBRE.
    expect(campoDe('Tel. arrendatario')).toBe('inquilinoTelefono')
    expect(campoDe('CC arrendatario')).toBe('inquilinoDocumento')
    expect(campoDe('E-mail arrendatario')).toBe('inquilinoCorreo')
  })

  it('y por eso mismo la columna real del nombre ya no se queda sin mapear', () => {
    const m = mapearColumnas(['Tel. arrendatario', 'Nombre del arrendatario'])
    expect(m.map((x) => x.campo)).toEqual(['inquilinoTelefono', 'inquilinoNombre'])
  })

  it('un encabezado que nombra a los dos no se asigna a ninguno', () => {
    expect(campoDe('Arrendador y arrendatario')).toBeNull()
  })

  it('gana la columna MÁS específica, no la primera', () => {
    const m = mapearColumnas(['Arrendatario', 'Nombre del arrendatario'])
    expect(m[0].campo).toBeNull()
    expect(m[1].campo).toBe('inquilinoNombre')
  })
})

describe('qué tan seguro está el auto-mapeo', () => {
  it('el encabezado que ES el término va como exacta', () => {
    expect(mapearColumnas(['Canon'])[0].certeza).toBe('exacta')
    expect(mapearColumnas(['Fecha de inicio'])[0].certeza).toBe('exacta')
    expect(mapearColumnas(['Nombre del arrendatario'])[0].certeza).toBe('exacta')
  })

  it('una abreviatura conocida no es una duda: «Tel. arrendatario» es exacta', () => {
    // Después de expandir la abreviatura queda rol + atributo y nada más. No
    // hay nada que confirmar; pedir confirmación acá sería ruido.
    expect(mapearColumnas(['Tel. arrendatario'])[0].certeza).toBe('exacta')
    expect(mapearColumnas(['CC propietario'])[0].certeza).toBe('exacta')
  })

  it('un encabezado con palabras de más va como sinónimo', () => {
    expect(mapearColumnas(['Correo electrónico del arrendatario'])[0].certeza).toBe(
      'sinonimo',
    )
    expect(mapearColumnas(['Nombre completo del arrendatario'])[0].certeza).toBe('sinonimo')
    expect(mapearColumnas(['Canon (COP)'])[0].certeza).toBe('sinonimo')
  })

  it('una palabra genérica empata pero queda marcada para confirmar', () => {
    for (const generico of ['Desde', 'Hasta', 'Ciudad', 'Honorarios', 'Fecha de pago']) {
      expect(mapearColumnas([generico])[0].certeza).toBe('dudosa')
    }
  })

  it('lo que no empató no tiene certeza que reportar', () => {
    const [m] = mapearColumnas(['Zutano'])
    expect(m.campo).toBeNull()
    expect(m.certeza).toBeNull()
    expect(m.porque).toBe('')
  })

  it('lo que eligió una persona no es una adivinanza', () => {
    const m = mapearColumnas(['Zutano'])
    expect(m[0].certeza).toBeNull()
  })
})

/**
 * 🔴 La compuerta. Ésta es la parte que faltaba el 2026-09-03: el importador
 * dejó continuar con TODO en «Ignorar» y creó 110 filas vacías.
 */
describe('la compuerta de lo esencial', () => {
  const ARCHIVO_COMPLETO = [
    'Dirección del inmueble',
    'Nombre del arrendatario',
    'Correo del arrendatario',
    'Fecha de inicio',
    'Fecha de terminación',
    'Canon',
    'Día de pago',
  ]

  it('un archivo con lo esencial mapeado no tiene faltantes', () => {
    expect(faltantesEsenciales(mapearColumnas(ARCHIVO_COMPLETO))).toEqual([])
  })

  it('el código del inmueble sirve igual que la dirección para identificarlo', () => {
    const sinDireccion = ARCHIVO_COMPLETO.map((h) =>
      h === 'Dirección del inmueble' ? 'Código del inmueble' : h,
    )
    expect(faltantesEsenciales(mapearColumnas(sinDireccion))).toEqual([])
  })

  it('el documento del inquilino sirve igual que el correo para identificarlo', () => {
    const conCedula = ARCHIVO_COMPLETO.map((h) =>
      h === 'Correo del arrendatario' ? 'Cédula del arrendatario' : h,
    )
    expect(faltantesEsenciales(mapearColumnas(conCedula))).toEqual([])
  })

  it('sin canon no se puede migrar, y lo dice nombrando el canon', () => {
    const sinCanon = ARCHIVO_COMPLETO.filter((h) => h !== 'Canon')
    const faltan = faltantesEsenciales(mapearColumnas(sinCanon))
    expect(faltan.map((f) => f.clave)).toEqual(['canon'])
    expect(faltan[0].etiqueta).toBe('el canon')
  })

  it('distingue «está en el archivo pero sin mapear» de «no está en el archivo»', () => {
    // La columna existe con un nombre que no reconocemos: se elige a mano.
    const conColumnaRara = [...ARCHIVO_COMPLETO.filter((h) => h !== 'Canon'), 'Vlr arrdo']
    const [faltaConColumna] = faltantesEsenciales(mapearColumnas(conColumnaRara))
    expect(faltaConColumna.clave).toBe('canon')
    expect(faltaConColumna.hayColumnaPosible).toBe(false)

    // La columna existe y habla de arriendo: hay algo que elegir.
    const conArriendo = [...ARCHIVO_COMPLETO.filter((h) => h !== 'Canon'), 'Arriendo neto']
    expect(faltantesEsenciales(mapearColumnas(conArriendo))).toEqual([])

    const conPista = [
      ...ARCHIVO_COMPLETO.filter((h) => h !== 'Día de pago'),
      'Corte facturación',
    ]
    const [faltaConPista] = faltantesEsenciales(mapearColumnas(conPista))
    expect(faltaConPista.clave).toBe('diaDePago')
    expect(faltaConPista.hayColumnaPosible).toBe(true)
  })

  it('el uso y el depósito NO bloquean: se completan después, fila por fila', () => {
    expect(faltantesEsenciales(mapearColumnas(ARCHIVO_COMPLETO))).toEqual([])
  })

  it('elegir la columna a mano destraba lo que faltaba', () => {
    const encabezados = [
      ...ARCHIVO_COMPLETO.filter((h) => h !== 'Día de pago'),
      'Corte facturación',
    ]
    const auto = mapearColumnas(encabezados)
    expect(faltantesEsenciales(auto).map((f) => f.clave)).toEqual(['diaDePago'])

    const aMano = remapear(auto, 'Corte facturación', 'diaDePago')
    expect(faltantesEsenciales(aMano)).toEqual([])
  })

  it('mandar a «Ignorar» una columna esencial vuelve a frenar el import', () => {
    const auto = mapearColumnas(ARCHIVO_COMPLETO)
    const sinCanon = remapear(auto, 'Canon', null)
    expect(faltantesEsenciales(sinCanon).map((f) => f.clave)).toEqual(['canon'])
  })

  it('🔴 el caso exacto del 2026-09-03: ninguna columna reconocida', () => {
    const mapeo = mapearColumnas(['Columna A', 'Columna B', 'Columna C'])
    expect(mapeo.every((m) => m.campo === null)).toBe(true)

    const faltan = faltantesEsenciales(mapeo)
    // Los siete: sin ninguno de ellos la fila que se crea es la fila vacía.
    expect(faltan.map((f) => f.clave)).toEqual([
      'inmueble',
      'inquilino',
      'contactoInquilino',
      'fechaInicio',
      'fechaFin',
      'canon',
      'diaDePago',
    ])
    // Y ninguna columna del archivo se parece a lo que falta: no es que haya
    // que elegir en el desplegable, es que el archivo no lo trae.
    expect(faltan.every((f) => !f.hayColumnaPosible)).toBe(true)
  })
})

/**
 * Un export real no siempre empieza en A1: arriba puede venir el nombre de la
 * inmobiliaria o el rango de fechas. Sin esto, los encabezados son «REPORTE
 * DE CONTRATOS» y celdas en blanco — cero columnas reconocidas.
 */
describe('dónde están los encabezados de verdad', () => {
  it('se queda en la primera fila cuando ahí están', () => {
    expect(
      mejorFilaDeEncabezado([
        ['Dirección', 'Arrendatario', 'Canon', 'Fecha de inicio'],
        ['Calle 1', 'Ana', '1000000', '2026-01-01'],
      ]),
    ).toBe(0)
  })

  it('encuentra la fila de encabezados debajo de un título y una fila en blanco', () => {
    expect(
      mejorFilaDeEncabezado([
        ['REPORTE DE CONTRATOS VIGENTES', '', '', ''],
        ['', '', '', ''],
        ['Dirección', 'Arrendatario', 'Canon', 'Fecha de inicio'],
        ['Calle 1', 'Ana', '1000000', '2026-01-01'],
      ]),
    ).toBe(2)
  })

  it('no se muda por un empate flojo: menos de tres campos no alcanza', () => {
    expect(
      mejorFilaDeEncabezado([
        ['Col A', 'Col B', 'Col C'],
        ['Bogotá', 'x', 'y'],
      ]),
    ).toBe(0)
  })

  it('un archivo sin nada reconocible se queda en la primera fila', () => {
    expect(mejorFilaDeEncabezado([['a', 'b'], ['c', 'd']])).toBe(0)
  })
})

/**
 * La cuota de administración. Nico (2026-09-04): «la cuota es porcentaje».
 *
 * En el mercado colombiano esa misma columna suele ser la cuota del edificio
 * EN PESOS, que se le paga a la copropiedad. Por eso mapea, pero pidiendo
 * confirmación y cediendo el campo a cualquier columna que lo diga sin
 * ambigüedad.
 */
describe('la cuota de administración', () => {
  it('mapea a comisión, pero nunca con confianza alta', () => {
    for (const h of ['Cuota de administración', 'Cuota', 'Cuota admin', 'Administración']) {
      const [m] = mapearColumnas([h])
      expect(m.campo).toBe('comision')
      expect(m.certeza).toBe('dudosa')
    }
  })

  it('«Comisión» le gana el campo aunque empate con menos palabras', () => {
    const m = mapearColumnas(['Cuota de administración', 'Comisión'])
    expect(m.map((x) => x.campo)).toEqual([null, 'comision'])
    // Y la que perdió queda libre para asignarla a mano, no borrada.
    expect(m[0].columna).toBe('Cuota de administración')
  })

  it('«Honorarios» también le gana, venga antes o después en el archivo', () => {
    expect(mapearColumnas(['Honorarios', 'Cuota']).map((x) => x.campo)).toEqual([
      'comision',
      null,
    ])
    expect(mapearColumnas(['Cuota', 'Honorarios']).map((x) => x.campo)).toEqual([
      null,
      'comision',
    ])
  })

  it('sin otra columna de comisión, la cuota SÍ se queda con el campo', () => {
    const m = mapearColumnas(['Dirección del inmueble', 'Cuota de administración'])
    expect(m[1].campo).toBe('comision')
  })

  it('«% Administración» no es débil: el signo lo dice sin ambigüedad', () => {
    const m = mapearColumnas(['% Administración', 'Cuota de administración'])
    expect(m.map((x) => x.campo)).toEqual(['comision', null])
  })
})
