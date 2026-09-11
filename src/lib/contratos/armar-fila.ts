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
import type { FilaAMigrar } from '@/lib/api/contracts.service'
import {
  codigoYDireccion,
  estratoDePalabras,
  fechaDeOrigen,
  listaDePersonas,
  type PersonaDeOrigen,
} from '@/lib/migracion/valores-de-origen'
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
 * Plata de contrato: además de legible tiene que ser POSIBLE. Un canon
 * negativo no es un canon (y contra el `@Min(0)` del back tumba el lote
 * entero con 400, no la fila), y uno que supera el INT4 de Postgres tampoco.
 * Los dos casos vuelven ausentes → faltante visible de ESA fila.
 */
function plataDeContrato(v: unknown): number | undefined {
  if (!hayValor(v)) return undefined
  const n = comoEntero(v)
  if (n === undefined || n < 0 || n > MAX_COP_POR_MOVIMIENTO) return undefined
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
}

/** Lo que sale de una fila: lo que viaja y lo que todavía no. */
export interface FilaLeida {
  fila: FilaAMigrar
  origen: DatosDeOrigenDeContrato
}

export function armarFilaAMigrar(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
): FilaAMigrar {
  return leerFilaDelArchivo(fila, mapeo).fila
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
): FilaLeida {
  const v = (campo: CampoDeContrato) => valorDe(fila, mapeo, campo)

  const rawInicio = v('fechaInicio')
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
  const propietarios = listaDePersonas(v('propietarioNombre'))
  const inquilinos = listaDePersonas(v('inquilinoNombre'))

  /*
   * El canon: manda «Canon Total». «Valor Canon» es el mismo canon repartido
   * entre los dueños y en los contratos con dos llega como una LISTA
   * («$451,000.00, $649,000.00»), que no es un número — `plataDeContrato` lo
   * devuelve ausente, que es lo correcto, pero el contrato se quedaba sin
   * canon habiendo un total perfectamente legible al lado.
   */
  const canonTotal = plataDeContrato(v('canonTotal'))
  const canonSuelto = plataDeContrato(v('canon'))

  /*
   * Lo que el archivo dice del contrato más allá del canon: el consecutivo, el
   * escenario tributario, el estado, las observaciones. Se lee una vez y se
   * usa para las dos cosas —la vista previa y el payload— porque tener dos
   * lecturas del mismo dato es tener una pantalla que muestra una cosa y un
   * back que recibe otra.
   */
  const consecutivo = textoDeOrigen(v('consecutivoContrato'))
  const escenario = textoOpcional(v('escenario'))
  const estado = textoOpcional(v('estadoContrato'))
  const fechaTerminacion = fechaDeOrigen(v('fechaTerminacion'))
  const observaciones = textoOpcional(v('observaciones'))
  const fechaCreacion = fechaDeOrigen(v('fechaCreacionOrigen'))
  const creadoPor = textoOpcional(v('creadoPor'))

  const filaAMigrar: FilaAMigrar = {
    // Estructuralmente obligatorios en el DTO — nunca se omiten, aunque
    // viajen vacíos (`migrar-contrato.dto.ts`: `direccion` e `inquilino` no
    // llevan `@IsOptional()`).
    direccion,
    inquilino: {
      nombre: inquilinoPrincipal(inquilinos, v),
      correo: String(v('inquilinoCorreo') ?? ''),
      telefono: textoOpcional(v('inquilinoTelefono')),
      documento: textoOpcional(v('inquilinoDocumento')) ?? inquilinos[0]?.documento,
    },
    startDate: hayValor(rawInicio) ? comoFecha(rawInicio) : undefined,
    endDate: hayValor(rawFin) ? comoFecha(rawFin) : undefined,
    monthlyRent: canonTotal ?? canonSuelto,
    deposit: plataDeContrato(rawDeposito),
    // X5: un día de pago ausente o fuera de [1,28] viaja ausente, nunca
    // fabricado como "el 1" — eso es lo que hacía que 1383 filas quedaran
    // fechadas al 1 de todos los meses sin que nadie lo pidiera.
    paymentDay: dia !== undefined && dia >= 1 && dia <= 28 ? dia : undefined,
    usoInmueble: hayValor(rawUso) ? comoUso(rawUso) : undefined,
    periodicidad: comoPeriodicidad(v('periodicidad')),
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
    ...propietarioDe(v, propietarios),
    // La llave de idempotencia del contrato: sin ella, reimportar duplica el
    // historial y los comprobantes viejos no saben de qué contrato colgarse.
    externalId: consecutivo,
    // Sólo cuando el archivo trae la lista: una lista vacía no dice nada que
    // el back no sepa ya, y ocupa lugar en un lote de 1.851 filas.
    ...(propietarios.length > 0 ? { propietarios: propietarios.map(soloDocumentoYNombre) } : {}),
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
      codigoDeOrigen: propiedad.codigo,
      propietarios,
      inquilinos,
      escenario,
      estado,
      fechaTerminacion,
      observaciones,
      estrato: estratoDePalabras(v('estratoInmueble')),
      fechaCreacion,
      creadoPor,
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
