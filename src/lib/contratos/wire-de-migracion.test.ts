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
  'inquilinos',
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
const CLAVES_DEL_TERCERO = new Set(['documento', 'nombre'])

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
    expect(payload.propietarios).toEqual([
      { documento: '43090971', nombre: 'LUZ ADRIANA PEREZ' },
      { documento: '42979803', nombre: 'MARIA VICTORIA PEREZ' },
    ])
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
