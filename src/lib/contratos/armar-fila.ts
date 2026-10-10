/**
 * armar-fila — construir lo que se manda al back a partir de una fila del
 * archivo y su mapeo de columnas.
 *
 * Separado de `MigrarContratos.tsx` por lo mismo que `leer-celdas.ts`: es
 * donde un dato ausente puede convertirse, en silencio, en un dato inventado.
 * `back/src/contracts/dto/migrar-contrato.dto.ts` valida con
 * `@IsOptional()` — que sólo salta `null`/`undefined`, NUNCA `''` — y con
 * `whitelist: true, forbidNonWhitelisted: true` en el pipe global
 * (`back/src/main.ts`). Un campo mandado como `''` en vez de ausente no se ve
 * como "no lo sé": choca contra `@IsDateString()`/`@IsEnum()` y tira TODO el
 * lote con 400, no sólo esa fila.
 *
 * Por eso cada campo opcional se manda `undefined` cuando no hay valor, y
 * NUNCA un default inventado (el 1 de pago, "vivienda", canon 0) — eso es
 * exactamente lo que el back necesita para poder marcar la fila con el
 * `faltante` correcto en vez de darla por buena con un dato que nadie puso.
 */

import type { CampoDeContrato, MapeoDeColumna } from './columnas-de-contrato'
import type { FilaAMigrar, TerceroDelArchivo } from '@/lib/api/contracts.service'
import {
  codigoYDireccion,
  estratoDePalabras,
  fechaDeOrigen,
  listaDePersonas,
  listaDePlata,
  plataDeOrigen,
  repartoEnBps,
  type PersonaDeOrigen,
} from '@/lib/migracion/valores-de-origen'
import { aCentavos } from '@/lib/plata/plata'
import {
  comoEntero,
  comoFecha,
  comoPeriodicidad,
  comoPorcentaje,
  comoUso,
  hayValor,
  MAX_COP_POR_MOVIMIENTO,
  textoOpcional,
  valorDe,
} from './leer-celdas'

/**
 * 🔴 Una cifra con letras de magnitud no se lee. «2.1M», «1,5 millones»,
 * «850k» o «2 mil» son plata escrita por una persona, y `comoEntero` tira las
 * letras: «2.1M» quedaba en **$2** — un canon inventado que se ve como dato
 * (QA-MIG-A, MG-07). Lo único escrito que se tolera es la moneda («COP»,
 * «pesos», «M/CTE»); cualquier otra letra deja la celda sin leer y la fila
 * pide el canon, en vez de cobrar una cifra que nadie escribió.
 */
export function plataConLetras(v: unknown): boolean {
  if (typeof v === 'number') return false
  const sinMoneda = String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(cop|col|pesos?|m\s*\/\s*cte|mcte|cte)\b/g, '')
  return /[a-z]/.test(sinMoneda)
}

/**
 * Plata de contrato: además de legible tiene que ser POSIBLE. Un canon
 * negativo no es un canon (y contra el `@Min(0)` del back tumba el lote
 * entero con 400, no la fila), y uno que supera el INT4 de Postgres tampoco.
 * Los dos casos vuelven ausentes → faltante visible de ESA fila.
 */
function plataDeContrato(v: unknown, conCentavos = false): number | undefined {
  if (!hayValor(v)) return undefined
  if (plataConLetras(v)) return undefined
  const n = conCentavos ? plataConCentavosDeLaCelda(v) : comoEntero(v)
  if (n === undefined || n < 0 || n > MAX_COP_POR_MOVIMIENTO) return undefined
  return n
}

/**
 * 🔴 EN-38 (QA-MIGRACION-95, 06-10-2026; misma regla que NI-07 en inmuebles):
 * con la llave de los contratos APAGADA, una celda con centavos de verdad
 * («2.500.000,29») NO se redondea en silencio. `comoEntero` la volvía
 * 2.500.000 y el contrato quedaba guardado así, sin decir nada. Ahora el canon
 * no viaja y viaja la celda tal cual (`canonConCentavosDelArchivo`): el back
 * frena la fila con su motivo y la persona escribe el canon al peso.
 */
export function traeCentavosSinLlave(v: unknown, conCentavos: boolean): boolean {
  if (conCentavos || !hayValor(v) || plataConLetras(v)) return false
  const n = plataConCentavosDeLaCelda(v)
  return typeof n === 'number' && Number.isFinite(n) && !Number.isInteger(n)
}

/**
 * «Centavos en todo» (C3-FRONT; P14 a «que no se redondee, se trae tal
 * cual»): con la llave de los contratos, la celda trae sus centavos
 * («$2.350.000,29» → 2350000.29). Un entero se lee EXACTAMENTE como siempre
 * (`comoEntero`); con más de dos decimales la celda no se adivina ni se
 * redondea: queda ausente y la fila sale con su faltante.
 */
function plataConCentavosDeLaCelda(v: unknown): number | undefined {
  const exacta = plataDeOrigen(v)
  if (exacta === undefined || Number.isInteger(exacta)) return comoEntero(v)
  try {
    return aCentavos(exacta, { talCual: true }) / 100
  } catch {
    return undefined
  }
}

/**
 * La llave de los contratos para leer la plata del archivo (la misma de
 * `MigrarContratoDto` en el back: `contratos_y_cuotas`). Ausente = pesos
 * enteros, como hoy.
 */
export interface OpcionesDeLaLectura {
  conCentavos?: boolean
}

/**
 * «Prorrateado» tal como lo escribe una inmobiliaria: `SI`/`NO`, con o sin
 * tilde, `X`, `1`/`0`, o un booleano si la celda vino de un Excel con
 * casillas. Lo que no se entiende queda `undefined` —«no lo sabemos»— y el
 * contrato entra sin prorrateo, que es cobrar el mes completo: nunca un `''`
 * que tumbe el lote contra el `@IsBoolean()` del back.
 */
export function siONoDeCelda(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : undefined
  if (!hayValor(v)) return undefined
  const t = String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
  if (!t) return undefined
  if (['SI', 'S', 'YES', 'Y', 'TRUE', 'VERDADERO', 'X', '1'].includes(t)) return true
  if (['NO', 'N', 'FALSE', 'FALSO', '0'].includes(t)) return false
  return undefined
}

/**
 * T-0153 §3.4: la celda de «Prorrateado» TIENE algo, pero no se entiende
 * («a veces», «2», «Parcial»). Distinto de la celda vacía: las dos dejan la
 * fila «por decidir», pero a ésta se le muestra el texto que trae.
 */
export function prorrateadoNoReconocido(v: unknown): boolean {
  return hayValor(v) && siONoDeCelda(v) === undefined
}

/**
 * T-0153 (A1): «Renovación automática» -> `noSeProrroga`, ya INVERTIDO. NO ->
 * `true` (al vencer queda en alerta y no se generan cuotas); SI -> `false`;
 * vacío o no reconocido -> `undefined` (la clave ni viaja: rige la prórroga
 * legal).
 */
export function noSeProrrogaDeCelda(v: unknown): boolean | undefined {
  const renueva = siONoDeCelda(v)
  return renueva === undefined ? undefined : !renueva
}

/**
 * «Días de Plazo»: un entero de 0 a 365. Lo que no es un plazo (vacío,
 * «N/A», negativo, un año entero) viaja ausente y el contrato hereda el
 * plazo de la agencia — igual que cuando la columna no viene.
 */
export function diasDePlazoDeCelda(v: unknown): number | undefined {
  if (!hayValor(v)) return undefined
  const n = comoEntero(v)
  if (n === undefined || n < 0 || n > 365) return undefined
  return n
}

/**
 * Lo que el archivo del sistema viejo trae, ya leído.
 *
 * Es el modelo de LECTURA del front: lo usan la vista previa y el resumen del
 * paso para mostrar el dato antes de guardar nada. Casi todo viaja además al
 * back —`MigrarContratoDto` los declara desde el 2026-09-08 (`48e30bb`)— y
 * `leerFilaDelArchivo` los copia a la fila con los nombres del DTO.
 *
 * Lo único que se queda acá es `estrato`: el contrato no tiene dónde guardarlo
 * (es del inmueble, y ahí sí entra por la importación de inmuebles).
 *
 * 🔴 `codigoDeOrigen` merecía un párrafo aparte y ya no: hasta el 2026-09-08
 * `codigoInmueble` era un `@IsInt()` que significaba el consecutivo de Leasefy
 * (el «#144» de Inmuebles), y mandar ahí el código del sistema viejo no daba
 * error — asociaba el contrato al inmueble EQUIVOCADO. Hoy el campo es texto y
 * significa PRIMERO `Property.externalId`, así que este código es exactamente
 * lo que va.
 */
export interface DatosDeOrigenDeContrato {
  /** «Consecutivo»: el número del contrato en el sistema viejo. */
  consecutivo?: string
  /** El código del inmueble en el sistema viejo (lo de antes del primer « - »). */
  codigoDeOrigen?: string
  /** Todos los propietarios del contrato, en el orden del archivo. El [1] es el titular. */
  propietarios: PersonaDeOrigen[]
  /** Todos los inquilinos, igual. */
  inquilinos: PersonaDeOrigen[]
  /** El texto del escenario tributario, tal cual. */
  escenario?: string
  /** «Activo» / «Terminado» / «En Construcción», tal cual. */
  estado?: string
  /** Cuándo se terminó de verdad (distinta de la fecha fin pactada). */
  fechaTerminacion?: string
  /** Notas del contrato. Multilínea en el archivo real. */
  observaciones?: string
  estrato?: number
  fechaCreacion?: string
  creadoPor?: string
  /**
   * ── T-0153: lo que se lee y NUNCA viaja ──────────────────────────────────
   * El «Consecutivo detalle» ordena a los copropietarios; el canon de la fila
   * y el total sirven para fundir sus filas (§4.3); el valor de la comisión
   * sólo se cruza contra canon × % (§4.4).
   */
  consecutivoDetalle?: string
  canonDeLaFila?: number
  canonTotal?: number
  valorComision?: number
  /**
   * 🔴 §3.4: el sistema NUNCA asume el prorrateo. `sinDecidir` = celda vacía,
   * columna ausente o texto que no se entiende; la agencia lo define en la
   * vista previa.
   */
  prorrateo: { estado: 'si' | 'no' | 'sinDecidir'; texto?: string }
}

/** Lo que sale de una fila: lo que viaja y lo que todavía no. */
export interface FilaLeida {
  fila: FilaAMigrar
  origen: DatosDeOrigenDeContrato
}

export function armarFilaAMigrar(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
  opciones: OpcionesDeLaLectura = {},
): FilaAMigrar {
  return leerFilaConHoja(fila, mapeo, opciones).fila
}

/** `leerFilaDelArchivo` + la fila de la HOJA en `filaDelArchivo` (lo que arma el payload). */
export function leerFilaConHoja(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
  opciones: OpcionesDeLaLectura = {},
): FilaLeida {
  const leida = leerFilaDelArchivo(fila, mapeo, opciones)
  const armada = leida.fila
  /*
   * QA-MIGRACION-95 (C14, como ER-01 en terceros): la fila de la HOJA viaja
   * aparte para que la lista diga la fila que ve la persona en Excel («Fila 4»
   * con el encabezado en la fila 3), no la posición entre los datos.
   * `_rowIndex` es base 0 de SheetJS: la fila del Excel es `_rowIndex + 1`.
   */
  const filaDeLaHoja = fila._rowIndex
  if (typeof filaDeLaHoja === 'number' && Number.isInteger(filaDeLaHoja) && filaDeLaHoja >= 1) {
    return { ...leida, fila: { ...armada, filaDelArchivo: filaDeLaHoja + 1 } }
  }
  return leida
}

/**
 * Lee una fila COMPLETA: lo que viaja al back y lo que el archivo trae y
 * todavía no tiene dónde ir.
 */
/**
 * El día del mes en que se paga — venga como número o como FECHA.
 *
 * 🔴 Los exports reales llenan esa columna con una fecha completa
 * («2022-08-01»), no con un «1» (Nico, 2026-09-10: 1.851 de 1.851 filas con
 * valor y las 1.851 rechazadas). `comoEntero` de un «2022-08-01» no da un día
 * del 1 al 28, así que el dato se tiraba entero.
 *
 * 🔴 La fecha se lee con `comoFecha`, el MISMO parser que el resto del
 * archivo: acepta `dd/mm/aaaa` con barras, puntos o guiones, `aaaa-mm-dd` y
 * objetos Date, y además valida que la fecha exista (un 31 de febrero no pasa).
 * Reutilizarlo —en vez de traer reglas propias— es lo que hace que cualquier
 * formato nuevo se resuelva en un solo lugar (Nico: «deberías poder recibir
 * cualquier tipo de formato de fecha»).
 *
 * Un número suelto se lee como día antes de intentar la fecha: «15» es el 15,
 * no un año. Y lo que no es ni fecha ni número queda `undefined` — «no lo sé»,
 * nunca un día inventado.
 */
export function diaDelMesDe(valor: unknown): number | undefined {
  const texto = String(valor ?? '').trim()
  if (!texto) return undefined

  // Un número suelto (1-31) es el día, no una fecha.
  if (/^\d{1,2}$/.test(texto)) return comoEntero(texto)

  const fecha = comoFecha(valor)
  if (fecha) return Number(fecha.slice(8, 10))

  /*
   * Si TIENE forma de fecha pero `comoFecha` la rechazó, es una fecha que no
   * existe (un 31 de febrero). No cae al entero: `comoEntero('31/02/2024')`
   * barre los separadores y devuelve 31022024, que no es un día de nada.
   */
  if (/[/.-]/.test(texto)) return undefined

  return comoEntero(texto)
}

export function leerFilaDelArchivo(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
  { conCentavos = false }: OpcionesDeLaLectura = {},
): FilaLeida {
  const v = (campo: CampoDeContrato) => valorDe(fila, mapeo, campo)

  const rawInicio = v('fechaInicio')
  const rawCartera = v('fechaDeCartera')
  const rawFin = v('fechaFin')
  const rawDeposito = v('deposito')
  const rawDia = v('diaDePago')
  const rawUso = v('uso')

  const dia = hayValor(rawDia) ? diaDelMesDe(rawDia) : undefined

  /*
   * «Propiedad» = «3 - CR 50 127 SUR 61 OF 502». Una sola celda con el código
   * del inmueble y su dirección. Si el archivo además trae columnas propias de
   * dirección o de código, ésas mandan: son datos, no una deducción.
   */
  const propiedad = codigoYDireccion(v('propiedadCodigoYDireccion'))
  const direccion = textoOpcional(v('direccionInmueble')) ?? propiedad.direccion ?? ''

  /*
   * «Propietario de Propiedad» e «Inquilino» vienen como
   * «[1] 43090971 - LUZ ADRIANA, [2] 42979803 - MARIA»: la lista completa en
   * una celda. El [1] es el titular del contrato; los demás quedan en `origen`
   * para que la pantalla los muestre y el back los cree como copropietarios /
   * co-inquilinos cuando tenga el campo.
   */
  /*
   * 🔴 Dos personas en la MISMA celda de documento (QA-MIG-A, MG-11): un
   * archivo hecho a mano escribe los copropietarios «Ana / Luis» con
   * «43987654 / 98765432», o los co-arrendatarios «Juan y Daniela» con
   * «1128444555 y 1128444556». Leída como un documento, la llave quedaba
   * «4398765498765432»: un documento que no es de nadie. Si nombres y
   * documentos se parten en la misma cantidad, son esas personas, en orden;
   * si no se pueden emparejar, el documento NO viaja (la fila pide el dato).
   */
  const propietariosDeDosColumnas = personasEnDosColumnas(v('propietarioNombre'), v('propietarioDocumento'))
  const inquilinosDeDosColumnas = personasEnDosColumnas(v('inquilinoNombre'), v('inquilinoDocumento'))
  const propietarios = propietariosDeDosColumnas?.length
    ? propietariosDeDosColumnas
    : listaDePersonas(v('propietarioNombre'))
  const inquilinos = inquilinosDeDosColumnas?.length
    ? inquilinosDeDosColumnas
    : listaDePersonas(v('inquilinoNombre'))
  const vDocumento = (campo: CampoDeContrato): unknown => {
    if (campo === 'propietarioDocumento' && propietariosDeDosColumnas) {
      return propietariosDeDosColumnas[0]?.documento
    }
    if (campo === 'inquilinoDocumento' && inquilinosDeDosColumnas) {
      return inquilinosDeDosColumnas[0]?.documento
    }
    if (campo === 'propietarioNombre' && propietariosDeDosColumnas?.length) {
      return propietariosDeDosColumnas[0].nombre
    }
    if (campo === 'inquilinoNombre' && inquilinosDeDosColumnas?.length) {
      return inquilinosDeDosColumnas[0].nombre
    }
    return v(campo)
  }

  /*
   * El canon: manda «Canon Total». «Valor Canon» es el mismo canon repartido
   * entre los dueños y en los contratos con dos llega como una LISTA
   * («$451,000.00, $649,000.00»), que no es UN número.
   *
   * 🔴 Esa lista ya no se tira (Nico, 2026-09-13: «múltiples propietarios con
   * diferentes % del canon»): ahí está el porcentaje REAL de cada dueño
   * (451000/1100000 = 41 %). Viaja cruda como `canonPorPropietario`, en el
   * orden de `propietarios`, y el back decide: si cuadra, escribe el reparto
   * proporcional; si no, frena la fila con su motivo. Con un solo valor la
   * celda es el canon de siempre y no viaja ninguna lista.
   *
   * Sin «Canon Total», la suma de las partes ES el canon: son los números
   * del archivo, no un invento — y sin ella el contrato quedaba en $0.
   */
  const rawCanon = v('canon')
  const listaDelCanon = listaDePlata(rawCanon, { conCentavos })
  const canonPorPropietario =
    listaDelCanon && listaDelCanon.length >= 2 && listaDelCanon.every((n) => n >= 0)
      ? listaDelCanon
      : undefined
  const canonTotal = plataDeContrato(v('canonTotal'), conCentavos)
  const canonSuelto = canonPorPropietario ? undefined : plataDeContrato(rawCanon, conCentavos)
  const sumaDeLasPartes = canonPorPropietario
    ? plataDeContrato(
        // Con centavos, la suma exacta al centavo (con enteros, la de siempre).
        conCentavos
          ? canonPorPropietario.reduce((a, n) => a + aCentavos(n), 0) / 100
          : canonPorPropietario.reduce((a, n) => a + n, 0),
        conCentavos,
      )
    : undefined
  // EN-38: la celda con centavos (sin la llave) no se redondea: no viaja canon.
  const celdaConCentavos = [v('canonTotal'), canonPorPropietario ? undefined : rawCanon].find((c) =>
    traeCentavosSinLlave(c, conCentavos),
  )
  const monthlyRent =
    celdaConCentavos !== undefined ? undefined : (canonTotal ?? canonSuelto ?? sumaDeLasPartes)

  /*
   * Lo que el archivo dice del contrato más allá del canon: el consecutivo, el
   * escenario tributario, el estado, las observaciones. Se lee una vez y se
   * usa para las dos cosas —la vista previa y el payload— porque tener dos
   * lecturas del mismo dato es tener una pantalla que muestra una cosa y un
   * back que recibe otra.
   */
  const consecutivo = textoDeOrigen(v('consecutivoContrato'))
  /*
   * 🔴 Con qué número paga el inquilino. Se manda aparte del consecutivo
   * aunque el archivo traiga la misma columna en los dos: el consecutivo es
   * cómo la inmobiliaria llama al contrato, la referencia es lo que el banco
   * escribe en el extracto, y el cruce busca la segunda.
   */
  const referenciaDeRecaudo = textoOpcional(v('referenciaDeRecaudo'))
  const escenario = textoOpcional(v('escenario'))
  const estado = textoOpcional(v('estadoContrato'))
  const fechaTerminacion = fechaDeOrigen(v('fechaTerminacion'))
  const observaciones = textoOpcional(v('observaciones'))
  const fechaCreacion = fechaDeOrigen(v('fechaCreacionOrigen'))
  const creadoPor = textoOpcional(v('creadoPor'))

  const rawProrrateado = v('prorrateado')
  const prorrateado = siONoDeCelda(rawProrrateado)
  const prorrateo: DatosDeOrigenDeContrato['prorrateo'] =
    prorrateado === true
      ? { estado: 'si' }
      : prorrateado === false
        ? { estado: 'no' }
        : prorrateadoNoReconocido(rawProrrateado)
          ? { estado: 'sinDecidir', texto: String(rawProrrateado).trim().slice(0, 60) }
          : { estado: 'sinDecidir' }
  const noSeProrroga = noSeProrrogaDeCelda(v('renovacionAutomatica'))
  const trasladaGmf = siONoDeCelda(v('impuestosAsumidos'))

  const filaAMigrar: FilaAMigrar = {
    // Estructuralmente obligatorios en el DTO — nunca se omiten, aunque
    // viajen vacíos (`migrar-contrato.dto.ts`: `direccion` e `inquilino` no
    // llevan `@IsOptional()`).
    direccion,
    inquilino: {
      nombre: inquilinoPrincipal(inquilinos, vDocumento),
      correo: String(v('inquilinoCorreo') ?? ''),
      telefono: textoOpcional(v('inquilinoTelefono')),
      documento: inquilinosDeDosColumnas
        ? inquilinosDeDosColumnas[0]?.documento
        : (textoOpcional(v('inquilinoDocumento')) ?? inquilinos[0]?.documento),
    },
    startDate: hayValor(rawInicio) ? comoFecha(rawInicio) : undefined,
    /*
     * 🔴 Desde cuándo se COBRA, que no es desde cuándo empieza el contrato
     * (Nico, 2026-09-10). El diccionario la reconocía desde entonces y esta
     * fila NUNCA la mandaba: el back recibía el campo declarado y vacío, y
     * todo el prorrateo salía de `startDate`.
     */
    fechaDeCartera: hayValor(rawCartera) ? comoFecha(rawCartera) : undefined,
    referenciaDeRecaudo,
    endDate: hayValor(rawFin) ? comoFecha(rawFin) : undefined,
    monthlyRent,
    ...(celdaConCentavos !== undefined
      ? { canonConCentavosDelArchivo: String(celdaConCentavos).trim().slice(0, 60) }
      : {}),
    deposit: plataDeContrato(rawDeposito, conCentavos),
    // X5: un día de pago ausente o fuera de [1,28] viaja ausente, nunca
    // fabricado como "el 1" — eso es lo que hacía que 1383 filas quedaran
    // fechadas al 1 de todos los meses sin que nadie lo pidiera.
    paymentDay: dia !== undefined && dia >= 1 && dia <= 28 ? dia : undefined,
    usoInmueble: hayValor(rawUso) ? comoUso(rawUso) : undefined,
    periodicidad: comoPeriodicidad(v('periodicidad')),
    /*
     * «Prorrateado» y «Días de Plazo» del archivo (Nico, 2026-09-12). Con
     * prorrateo el primer mes cobra sólo los días desde la fecha de cartera
     * —y el último, los días ocupados—; sin él, el mes completo cada día de
     * cartera.
     */
    prorratearPrimerMes: siONoDeCelda(v('prorrateado')),
    // T-0153 (A1): sólo viaja con un SI/NO reconocido; si no, la clave no existe.
    ...(noSeProrroga !== undefined ? { noSeProrroga } : {}),
    // T-0153 (A2): «Impuestos asumidos» SI/NO; si no, la clave no existe.
    ...(trasladaGmf !== undefined ? { trasladaGmfAlPropietario: trasladaGmf } : {}),
    diasDePlazo: diasDePlazoDeCelda(v('diasDePlazo')),
    // «0» es una comisión real (0% existe); «10%» y «10,5» son humanos; 110
    // no es un porcentaje. `Number(v) || undefined` convertía el 0 en «no hay
    // dato» — el único caso en que un valor escrito desaparecía en silencio.
    comisionPorcentaje: comoPorcentaje(v('comision')),
    /*
     * El código del inmueble. Gana a la dirección del lado del back, que lo
     * prueba contra `Property.externalId` primero y contra el consecutivo de
     * Leasefy después.
     *
     * La columna propia manda sobre el código empaquetado en «Propiedad»: una
     * columna que alguien mapeó a mano es un dato, y lo de «3 - CR 50…» es una
     * deducción. Si no hay columna, el `3` de la celda sirve igual.
     */
    codigoInmueble:
      codigoDeInmueble(v('codigoInmueble')) ?? codigoDeInmueble(propiedad.codigo),
    ciudad: textoOpcional(v('ciudadInmueble'))?.slice(0, 50),
    ...propietarioDe(vDocumento, propietarios),
    // La llave de idempotencia del contrato: sin ella, reimportar duplica el
    // historial y los comprobantes viejos no saben de qué contrato colgarse.
    externalId: consecutivo,
    // Sólo cuando el archivo trae la lista: una lista vacía no dice nada que
    // el back no sepa ya, y ocupa lugar en un lote de 1.851 filas.
    ...(propietarios.length > 0
      ? { propietarios: conSuParte(propietarios, canonPorPropietario, monthlyRent) }
      : {}),
    ...(canonPorPropietario ? { canonPorPropietario } : {}),
    ...(inquilinos.length > 0 ? { inquilinos: inquilinos.map(soloDocumentoYNombre) } : {}),
    escenarioOrigen: escenario,
    estadoOrigen: estado,
    fechaTerminacion,
    observaciones,
    creadoPor,
    fechaCreacionOrigen: fechaCreacion,
  }

  return {
    fila: filaAMigrar,
    origen: {
      consecutivo,
      // QA-MIGRACION-95 (06-10): la columna propia «Código inmueble» también es
      // el código de origen (el resumen de lectura y la vista previa lo miran).
      // Antes sólo contaba el código empaquetado en «Propiedad» y la pantalla
      // decía «0 traen código de origen» de un archivo que lo trae en todas.
      codigoDeOrigen: textoOpcional(v('codigoInmueble')) ?? propiedad.codigo,
      propietarios,
      inquilinos,
      escenario,
      estado,
      fechaTerminacion,
      observaciones,
      estrato: estratoDePalabras(v('estratoInmueble')),
      fechaCreacion,
      creadoPor,
      consecutivoDetalle: textoOpcional(v('consecutivoDetalle')),
      canonDeLaFila: canonPorPropietario ? undefined : canonSuelto,
      canonTotal,
      valorComision: hayValor(v('valorComision')) ? plataDeOrigen(v('valorComision')) : undefined,
      prorrateo,
    },
  }
}

/**
 * De `PersonaDeOrigen` a lo que el DTO declara: documento y nombre, nada más.
 *
 * `orden` es del front —así sabe quién es el titular— y no está en
 * `TerceroDelArchivoDto`. Con `forbidNonWhitelisted: true`, mandarlo sería un
 * 400 del LOTE entero, no de la fila; el orden ya viaja implícito en la
 * posición del arreglo, que es como el back lo lee.
 */
function soloDocumentoYNombre(p: PersonaDeOrigen): { documento?: string; nombre?: string } {
  return {
    ...(p.documento ? { documento: p.documento } : {}),
    ...(p.nombre ? { nombre: p.nombre } : {}),
  }
}

/**
 * Los dueños con su `participacionBps` cuando la plata de «Valor Canon»
 * cuadra: un valor por dueño y una suma igual al canon (tolerancia de un peso
 * por dueño, lo que pierde el redondeo del export). `[451000, 649000]` sobre
 * $1.100.000 → 4100 / 5900.
 *
 * Cuando NO cuadra no se manda ningún bps: la lista cruda viaja igual
 * (`canonPorPropietario`) y es el back quien frena la fila con el motivo. Acá
 * no se inventa un 50/50 ni se «arregla» la suma. Misma aritmética que
 * `decidirReparto` en el back, para que la vista previa y el mandato digan lo
 * mismo.
 */
export function conSuParte(
  propietarios: PersonaDeOrigen[],
  plata: number[] | undefined,
  canon: number | undefined,
): TerceroDelArchivo[] {
  const base = propietarios.map(soloDocumentoYNombre)
  if (!plata || plata.length !== propietarios.length || propietarios.length < 2) return base
  if (plata.some((n) => n <= 0)) return base
  const suma = plata.reduce((a, n) => a + n, 0)
  if (canon !== undefined && Math.abs(suma - canon) > propietarios.length) return base
  const bps = repartoEnBps(plata)
  return base.map((p, i) => ({ ...p, participacionBps: bps[i] }))
}

/** Separadores con los que una persona escribe a dos en la misma celda. */
const SEPARADORES_DE_PERSONAS = [/\s*\/\s*/, /\s*\|\s*/, /\s*;\s*/, /\s+y\s+/i, /\s*,\s*/]

/** ¿Tiene cara de UN documento? (con o sin tipo, puntos o DV): «CC 43.987.654», «900456789-1». */
const CARA_DE_DOCUMENTO = /^(?:[A-Za-z]{1,3}\.?\s*)?\d[\d.\s]{4,}(?:-\s*\d)?$/

/**
 * Las personas de una fila que trae nombres y documentos en columnas
 * separadas y VARIAS personas en la celda del documento.
 *
 * - `null`: la celda del documento trae un solo documento (o ninguno): el
 *   camino de siempre.
 * - `[]`: trae varios documentos y los nombres no se dejan emparejar: no hay
 *   documento que mandar sin inventarlo.
 * - la lista: cada nombre con su documento, en el orden del archivo.
 */
export function personasEnDosColumnas(nombre: unknown, documento: unknown): PersonaDeOrigen[] | null {
  const doc = String(documento ?? '').replace(/\s+/g, ' ').trim()
  if (!doc) return null
  let documentos: string[] | null = null
  for (const sep of SEPARADORES_DE_PERSONAS) {
    const trozos = doc.split(sep).map((t) => t.trim()).filter(Boolean)
    if (trozos.length >= 2 && trozos.every((t) => CARA_DE_DOCUMENTO.test(t))) {
      documentos = trozos
      break
    }
  }
  if (!documentos) return null
  const nom = String(nombre ?? '').replace(/\s+/g, ' ').trim()
  for (const sep of SEPARADORES_DE_PERSONAS) {
    const nombres = nom.split(sep).map((t) => t.trim()).filter(Boolean)
    if (nombres.length === documentos.length) {
      return nombres.map((n, i) => ({ nombre: n, documento: documentos![i].replace(/[.\s]/g, ''), orden: i + 1 }))
    }
  }
  return []
}

/**
 * El nombre del inquilino titular. Cuando la celda venía empaquetada
 * («[1] 1026159836 - JUAN CAMILO LOPEZ»), el nombre es el del [1] — no el
 * texto entero, que guardaría un inquilino llamado «[1] 1026159836 - JUAN…».
 */
function inquilinoPrincipal(
  inquilinos: PersonaDeOrigen[],
  v: (campo: CampoDeContrato) => unknown,
): string {
  const crudo = String(v('inquilinoNombre') ?? '').trim()
  if (inquilinos.length === 0) return crudo
  return inquilinos[0].nombre ?? crudo
}

/**
 * El tope que declaran `codigoInmueble` y `externalId` en el DTO
 * (`@MaxLength(64)`). Pasarse NO es un faltante de la fila: es un 400 del lote
 * entero, así que un valor más largo viaja ausente y el back resuelve la fila
 * por dirección diciéndolo.
 */
const MAX_LARGO_DE_CODIGO = 64

/**
 * El código del inmueble tal como lo escribe el archivo.
 *
 * Ya NO se exige que sea un entero: desde el 2026-09-08 este campo es texto y
 * significa primero `Property.externalId`, y un «A-12» es un código de
 * inmueble perfectamente válido en el sistema del que se migra. El `#` sí se
 * quita — es cómo Leasefy ESCRIBE el consecutivo, no parte del código.
 */
function codigoDeInmueble(raw: unknown): string | undefined {
  if (!hayValor(raw)) return undefined
  const texto = String(raw).trim().replace(/^#/, '').trim()
  if (!texto || texto.length > MAX_LARGO_DE_CODIGO) return undefined
  return texto
}

/** Un texto corto que el DTO limita a 64: más largo no viaja (400 del lote). */
function textoDeOrigen(raw: unknown): string | undefined {
  const texto = textoOpcional(raw)
  if (!texto || texto.length > MAX_LARGO_DE_CODIGO) return undefined
  return texto
}

/**
 * El propietario del archivo viaja en la fila (Nico, 2026-09-02: «que tome el
 * que viene desde la migración»). Sólo con documento: sin él no hay ficha que
 * resolver ni crear, y el nombre solo se presta a homónimos. En blanco no
 * viaja nada.
 *
 * Cuando el archivo trae la lista empaquetada, el titular es el [1]; los
 * demás quedan en `origen.propietarios` hasta que el back reciba
 * copropietarios.
 */
function propietarioDe(
  v: (campo: CampoDeContrato) => unknown,
  propietarios: PersonaDeOrigen[],
): Pick<FilaAMigrar, 'propietario'> {
  const documento = textoOpcional(v('propietarioDocumento')) ?? propietarios[0]?.documento
  if (!documento) return {}
  const nombreDeColumna = textoOpcional(v('propietarioNombre'))
  const nombre = propietarios[0]?.nombre ?? nombreDeColumna
  return {
    propietario: {
      documento,
      nombre,
      correo: textoOpcional(v('propietarioCorreo')),
      telefono: textoOpcional(v('propietarioTelefono')),
    },
  }
}
