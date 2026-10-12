/**
 * El cable de `POST /contracts/migrar/preparar`: qué claves salen de acá y
 * cómo se llaman.
 *
 * ── Por qué este test y no los otros ────────────────────────────────────────
 *
 * `armar-fila.test.ts` prueba que cada celda se LEE bien. Eso no dice nada
 * sobre el nombre con el que el valor viaja, y ahí es donde este boundary
 * duele: `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `whitelist: true` **y `forbidNonWhitelisted: true`**. Una clave que
 * `MigrarContratoDto` no declara NO se ignora — devuelve 400, y con él el LOTE
 * ENTERO. Una sola letra de más en `escenarioOrigen` y las 1.851 filas del
 * archivo real se caen juntas, con un mensaje que no nombra la fila porque no
 * hay ninguna fila culpable.
 *
 * `CLAVES_DEL_DTO` es una copia escrita a mano de
 * `back-erp/src/contracts/dto/migrar-contrato.dto.ts`, leída de ahí y no de un
 * resumen. Es el mismo patrón que `contabilidad.service.ts` ya usa para sus
 * DTOs: sin codegen en este boundary, la única forma de que el espejo no se
 * desvíe en silencio es compararlo contra una lista que alguien tuvo que
 * mirar.
 *
 * 🔴 Que este archivo esté verde NO prueba que los nombres sean los que el
 * back declara — prueba que son los que ESTA lista dice. La evidencia de que
 * la lista está bien es `back-erp`'s `migracion-archivo-completo.spec.ts`, que
 * corre el `ValidationPipe` de verdad sobre este mismo payload.
 */

import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'
import { armarFilaAMigrar } from './armar-fila'
import { prepararFilasParaMigrar } from './preparar-filas-para-migrar'

/**
 * El encabezado real de Contracts.csv, en su orden. Escrito acá y no
 * importado de `archivo-real-contratos.test.ts`: importar un archivo de
 * pruebas desde otro hace que vitest corra sus 21 casos otra vez, con lo cual
 * un fallo aparece dos veces y en el archivo que no es.
 *
 * 🔴 Los ENCABEZADOS son los reales (nombran columnas, no personas).
 */
const ENCABEZADO_CONTRATOS = [
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

/** Las claves de primer nivel de `MigrarContratoDto`, copiadas del DTO. */
const CLAVES_DEL_DTO = new Set([
  'direccion',
  'propertyId',
  'codigoInmueble',
  'ciudad',
  'inquilino',
  'startDate',
  'endDate',
  'monthlyRent',
  'deposit',
  'paymentDay',
  'usoInmueble',
  'periodicidad',
  'comisionPorcentaje',
  'propietario',
  'invitar',
  'pdfPath',
  'propietarios',
  'canonPorPropietario',
  'inquilinos',
  'canonPorInquilino',
  'escenarioOrigen',
  'estadoOrigen',
  'fechaTerminacion',
  'observaciones',
  'externalId',
  'creadoPor',
  'fechaCreacionOrigen',
])

/** `InquilinoMigradoDto`. */
const CLAVES_DEL_INQUILINO = new Set(['nombre', 'correo', 'telefono', 'documento'])
/** `PropietarioDelArchivoDto`. */
const CLAVES_DEL_PROPIETARIO = new Set(['nombre', 'documento', 'correo', 'telefono'])
/** `TerceroDelArchivoDto` — dos claves, y ninguna más. */
const CLAVES_DEL_TERCERO = new Set(['documento', 'nombre', 'participacionBps'])

/**
 * Una fila con la forma del archivo real (Contracts.csv), con dos
 * propietarios y dos inquilinos: es el caso que más claves nuevas usa.
 * Personas y direcciones inventadas.
 */
const FILA: Record<string, unknown> = {
  Consecutivo: '1050',
  Propiedad: '3 - CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO',
  'Estrato Propiedad': 'Tres',
  'Propietario de Propiedad':
    '[1] 43090971 - LUZ ADRIANA PEREZ, [2] 42979803 - MARIA VICTORIA PEREZ',
  Inquilino: '[1] 71211270 - JORGE ANDRES LONDONO, [2] 1020304050 - ANA SOFIA RUIZ',
  'Valor Canon': '$504,201.00, $504,202.00',
  'Canon Total': '$1,008,403.00',
  '% Comisión': '7 %',
  Periodicidad: 'Mensual',
  Escenario:
    'Escenario 3 PROPIETARIO RESPONSABLE DE IVA HACE RETENCION- INQUILINO PERSONA NATURAL NO HACE RETENCION',
  Estado: 'Terminado',
  'Fecha Inicio': '2023-03-31',
  'Fecha Fin': '2024-03-30',
  'Fecha de Terminación': '2024-04-30',
  Observaciones: 'Abril de 2025: incremento del 5%.\r\nOctubre de 2025: nuevo ajuste del 5%.',
  Uso: 'Vivienda',
  'Fecha Creación': '2022-04-04 17:33:13',
  'Creado por': 'YINETH VALENTINA OBANDO PARRA',
}

/**
 * Lo que de verdad sale por el cable: `JSON.stringify` borra las claves con
 * `undefined`, y el `ValidationPipe` nunca las ve. Medir el objeto en memoria
 * contaría como «clave presente» un campo que el back jamás recibe.
 */
function loQueViaja(fila: Record<string, unknown>): Record<string, unknown> {
  const mapeo = mapearColumnas(ENCABEZADO_CONTRATOS)
  return JSON.parse(JSON.stringify(armarFilaAMigrar(fila, mapeo))) as Record<string, unknown>
}

describe('el payload de migración no lleva ninguna clave que el DTO no declare', () => {
  const payload = loQueViaja(FILA)

  it('todas las claves de primer nivel están en MigrarContratoDto', () => {
    const intrusas = Object.keys(payload).filter((k) => !CLAVES_DEL_DTO.has(k))
    expect(
      intrusas,
      'Estas claves no las declara MigrarContratoDto: con forbidNonWhitelisted ' +
        'el back devuelve 400 para el LOTE entero, no para la fila.',
    ).toEqual([])
  })

  it('el inquilino y el propietario tampoco', () => {
    const inquilino = payload.inquilino as Record<string, unknown>
    expect(Object.keys(inquilino).filter((k) => !CLAVES_DEL_INQUILINO.has(k))).toEqual([])
    const propietario = payload.propietario as Record<string, unknown>
    expect(Object.keys(propietario).filter((k) => !CLAVES_DEL_PROPIETARIO.has(k))).toEqual([])
  })

  /*
   * `PersonaDeOrigen` del front tiene un tercer campo, `orden`, con el `[1]` /
   * `[2]` que el archivo escribe. Es lo que el front usa para saber quién es
   * el titular — y `TerceroDelArchivoDto` NO lo declara. Mandarlo dentro de la
   * lista es el mismo 400 del lote entero, escondido un nivel más abajo.
   */
  it('las listas de terceros viajan sólo con documento y nombre, sin el `orden`', () => {
    for (const lista of ['propietarios', 'inquilinos'] as const) {
      const terceros = payload[lista] as Array<Record<string, unknown>>
      expect(terceros.length, lista).toBe(2)
      for (const t of terceros) {
        expect(Object.keys(t).filter((k) => !CLAVES_DEL_TERCERO.has(k)), lista).toEqual([])
      }
    }
  })
})

describe('el payload lleva, campo por campo, lo que el archivo dijo', () => {
  const payload = loQueViaja(FILA)

  it('el inmueble va por su código de origen, y la dirección queda de respaldo', () => {
    expect(payload.codigoInmueble).toBe('3')
    expect(payload.direccion).toBe('CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO')
  })

  it('el consecutivo del contrato va como externalId (la llave de idempotencia)', () => {
    expect(payload.externalId).toBe('1050')
  })

  it('las dos listas van completas y en el orden del archivo', () => {
    // Los dueños llevan su parte: «Valor Canon» ($504.201 + $504.202) cuadra
    // con «Canon Total», así que cada uno viaja con su % en puntos básicos.
    expect(payload.propietarios).toEqual([
      { documento: '43090971', nombre: 'LUZ ADRIANA PEREZ', participacionBps: 5000 },
      { documento: '42979803', nombre: 'MARIA VICTORIA PEREZ', participacionBps: 5000 },
    ])
    expect(payload.canonPorPropietario).toEqual([504201, 504202])
    expect(payload.inquilinos).toEqual([
      { documento: '71211270', nombre: 'JORGE ANDRES LONDONO' },
      { documento: '1020304050', nombre: 'ANA SOFIA RUIZ' },
    ])
  })

  it('el titular sigue siendo el [1] de cada lista', () => {
    expect((payload.inquilino as { documento: string }).documento).toBe('71211270')
    expect((payload.propietario as { documento: string }).documento).toBe('43090971')
  })

  it('el escenario tributario viaja ENTERO, sin interpretar', () => {
    expect(payload.escenarioOrigen).toBe(
      'Escenario 3 PROPIETARIO RESPONSABLE DE IVA HACE RETENCION- INQUILINO PERSONA NATURAL NO HACE RETENCION',
    )
  })

  it('un contrato terminado manda su estado y su fecha real de terminación', () => {
    expect(payload.estadoOrigen).toBe('Terminado')
    expect(payload.fechaTerminacion).toBe('2024-04-30')
    // `endDate` es lo PACTADO y no se toca: son dos fechas distintas.
    expect(payload.endDate).toBe('2024-03-30')
  })

  it('las observaciones viajan con sus saltos de línea', () => {
    expect(payload.observaciones).toContain('\n')
    expect(payload.observaciones).toContain('Octubre de 2025')
  })

  it('quién y cuándo lo creó el sistema anterior', () => {
    expect(payload.creadoPor).toBe('YINETH VALENTINA OBANDO PARRA')
    expect(payload.fechaCreacionOrigen).toBe('2022-04-04')
  })
})

describe('lo que el archivo NO trae no viaja en blanco', () => {
  it('las celdas vacías desaparecen del cable, nunca llegan como ""', () => {
    const payload = loQueViaja({
      ...FILA,
      Consecutivo: '',
      Escenario: '',
      Estado: '   ',
      'Fecha de Terminación': '',
      Observaciones: '',
      'Creado por': '',
      'Fecha Creación': '',
    })
    for (const clave of [
      'externalId',
      'escenarioOrigen',
      'estadoOrigen',
      'fechaTerminacion',
      'observaciones',
      'creadoPor',
      'fechaCreacionOrigen',
    ]) {
      expect(payload, clave).not.toHaveProperty(clave)
    }
  })

  it('sin listas de terceros, las claves ni aparecen (no un arreglo vacío)', () => {
    const payload = loQueViaja({
      ...FILA,
      'Propietario de Propiedad': '',
      Inquilino: '',
    })
    expect(payload).not.toHaveProperty('propietarios')
    expect(payload).not.toHaveProperty('inquilinos')
  })
})

/*
 * T-0163 §3.5: «una fila por inquilino» se funde en UN contrato. Lo único
 * nuevo en el cable es `canonPorInquilino`; el reparto en % lo deriva el back
 * y el front NUNCA manda `participacionBps` ni `tipoDocumento` de inquilinos.
 */
describe('una fila por inquilino -> un contrato con canonPorInquilino', () => {
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
  const base = {
    'Consecutivo contrato': 1149,
    'Total Canon Contrato': 2521008,
    'Nro. Propiedad': 7,
    'Dirección Propiedad': 'Calle Falsa 123',
    'Documento Propietario': 111,
    'Nombre Propietario': 'Dueña Uno',
    'Valor canon': 1260504,
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    Prorrateado: 'SI',
  }
  const filas = [
    { ...base, 'Consecutivo detalle': 1, 'Documento Inquilino': 222, 'Nombre Inquilino': 'Inquilino A', 'Email inquilino': 'a@example.test' },
    { ...base, 'Consecutivo detalle': 2, 'Documento Inquilino': 333, 'Nombre Inquilino': 'Inquilino B', 'Email inquilino': 'b@example.test' },
  ]
  const r = prepararFilasParaMigrar(filas, mapearColumnas(ENCABEZADO), {}, new Map())
  const payload = JSON.parse(JSON.stringify(r.aMigrar[0])) as Record<string, unknown>

  it('manda canonPorInquilino alineado con inquilinos, y esa clave existe en el DTO', () => {
    expect(r.aMigrar).toHaveLength(1)
    expect(payload.canonPorInquilino).toEqual([1260504, 1260504])
    expect(payload.monthlyRent).toBe(2521008)
    expect((payload.inquilinos as unknown[]).length).toBe(2)
    expect(CLAVES_DEL_DTO.has('canonPorInquilino')).toBe(true)
  })

  it('jamás manda participacionBps ni tipoDocumento de los inquilinos', () => {
    for (const t of payload.inquilinos as Array<Record<string, unknown>>) {
      expect(Object.keys(t).filter((k) => !CLAVES_DEL_TERCERO.has(k))).toEqual([])
      expect(t).not.toHaveProperty('participacionBps')
      expect(t).not.toHaveProperty('tipoDocumento')
    }
  })

  it('una fila normal no lleva canonPorInquilino', () => {
    expect(loQueViaja(FILA)).not.toHaveProperty('canonPorInquilino')
  })
})
