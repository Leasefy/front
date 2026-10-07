/**
 * Los topes de la captación (listas restrictivas) en el cliente (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/captacion/limites-de-la-captacion.ts` y
 * de los `@MaxLength` de `FilaCargadaDto` (`captacion.controller.ts`): mismos
 * números y mismas frases. Lo que el back rechaza se ataja ANTES de mandar,
 * y en el campo que lo causó. Si cambia uno, cambia el otro.
 */

export const FECHA_DE_LA_CAPTACION_DESDE = '1950-01-01'
export const FECHA_DE_LA_CAPTACION_HASTA = '2100-12-31'

/** Cuántas filas puede traer una lista restrictiva (la SDN de la OFAC ronda las 12.000). */
export const MAX_FILAS_DE_UNA_LISTA = 50_000

/** Los `@MaxLength` de cada fila de la lista cargada (`FilaCargadaDto`). */
export const MAX_LARGO_DEL_NOMBRE_EN_LA_LISTA = 300
export const MAX_LARGO_DEL_DOCUMENTO_EN_LA_LISTA = 40
export const MAX_LARGO_DEL_DETALLE_EN_LA_LISTA = 500

/** El motivo de liberar o confirmar una coincidencia (`RevisarConsultaDto`). */
export const MOTIVO_DE_LA_REVISION_MINIMO = 5
export const MOTIVO_DE_LA_REVISION_MAXIMO = 2_000

export const MENSAJES_DE_LA_CAPTACION = {
  vigenteDesdeNoEsUnDia:
    'La fecha «vigente desde» no es un día real del calendario (usa AAAA-MM-DD).',
  vigenteDesdeFueraDeRango: 'La fecha «vigente desde» debe estar entre el año 1950 y el 2100.',
  filasMaximas:
    'Una lista puede traer hasta 50.000 registros. Revisa que el archivo sea la lista y no otra cosa.',
  motivoCorto:
    'Escribe el motivo con al menos 5 caracteres: es el registro que queda de la decisión.',
  motivoLargo: 'El motivo puede tener hasta 2.000 caracteres.',
} as const

/** Un día real del calendario en AAAA-MM-DD (lo mismo que `EsDiaDelCalendario` del back). */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(valor.trim())
  if (!m) return false
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`
  )
}

/** El error de «vigente desde», o `null` si está bien. */
export function errorDeVigenteDesde(valor: string): string | null {
  if (!esDiaDelCalendario(valor)) return MENSAJES_DE_LA_CAPTACION.vigenteDesdeNoEsUnDia
  const dia = valor.trim().slice(0, 10)
  if (dia < FECHA_DE_LA_CAPTACION_DESDE || dia > FECHA_DE_LA_CAPTACION_HASTA) {
    return MENSAJES_DE_LA_CAPTACION.vigenteDesdeFueraDeRango
  }
  return null
}

/** El error del motivo de la revisión, o `null` si está bien. */
export function errorDelMotivoDeLaRevision(motivo: string): string | null {
  const limpio = motivo.trim()
  if (limpio.length < MOTIVO_DE_LA_REVISION_MINIMO) return MENSAJES_DE_LA_CAPTACION.motivoCorto
  if (limpio.length > MOTIVO_DE_LA_REVISION_MAXIMO) return MENSAJES_DE_LA_CAPTACION.motivoLargo
  return null
}

export interface FilaParaRevisar {
  nombre: string
  documento?: string
  detalle?: string
}

export interface RevisionDeLasFilas<F extends FilaParaRevisar> {
  /** Las filas como se mandan: el detalle largo, recortado. */
  filas: F[]
  /** Cuántos detalles se recortaron (se dice en pantalla, no se calla). */
  detallesRecortados: number
  /** Lo que el back rechazaría y no se puede arreglar solo: frena la carga. */
  error: string | null
}

const filaLegible = (i: number) => `la fila ${(i + 1).toLocaleString('es-CO')}`

/**
 * Lo que el back rechazaría de las filas, ANTES de mandarlas.
 *
 * · Un nombre o un documento más largo que su columna frena: son los datos con
 *   los que se compara, y un nombre de 300 letras es casi siempre una columna
 *   mal leída. Se dice cuántos y la primera fila, para ir a mirarla.
 * · Un DETALLE largo se recorta a 500 (con «…») y se avisa: es una nota (el
 *   programa de sanciones, las observaciones de la OFAC), no se compara contra
 *   nadie, y frenar la lista entera por una observación larga dejaría sin
 *   verificar a todos los terceros.
 */
export function revisarLasFilas<F extends FilaParaRevisar>(filas: readonly F[]): RevisionDeLasFilas<F> {
  if (filas.length > MAX_FILAS_DE_UNA_LISTA) {
    return { filas: [...filas], detallesRecortados: 0, error: MENSAJES_DE_LA_CAPTACION.filasMaximas }
  }
  let nombresLargos = 0
  let primerNombreLargo = -1
  let documentosLargos = 0
  let primerDocumentoLargo = -1
  let detallesRecortados = 0
  const salida = filas.map((f, i) => {
    if (f.nombre.length > MAX_LARGO_DEL_NOMBRE_EN_LA_LISTA) {
      nombresLargos++
      if (primerNombreLargo < 0) primerNombreLargo = i
    }
    if ((f.documento?.length ?? 0) > MAX_LARGO_DEL_DOCUMENTO_EN_LA_LISTA) {
      documentosLargos++
      if (primerDocumentoLargo < 0) primerDocumentoLargo = i
    }
    if (f.detalle && f.detalle.length > MAX_LARGO_DEL_DETALLE_EN_LA_LISTA) {
      detallesRecortados++
      return { ...f, detalle: `${f.detalle.slice(0, MAX_LARGO_DEL_DETALLE_EN_LA_LISTA - 1)}…` }
    }
    return f
  })

  const problemas: string[] = []
  if (nombresLargos > 0) {
    problemas.push(
      `${nombresLargos === 1 ? 'Un registro trae' : `${nombresLargos.toLocaleString('es-CO')} registros traen`} un nombre de más de ${MAX_LARGO_DEL_NOMBRE_EN_LA_LISTA} caracteres (desde ${filaLegible(primerNombreLargo)}). Revisa que la columna del nombre sea la correcta.`,
    )
  }
  if (documentosLargos > 0) {
    problemas.push(
      `${documentosLargos === 1 ? 'Un registro trae' : `${documentosLargos.toLocaleString('es-CO')} registros traen`} un documento de más de ${MAX_LARGO_DEL_DOCUMENTO_EN_LA_LISTA} caracteres (desde ${filaLegible(primerDocumentoLargo)}). Revisa que la columna del documento sea la correcta.`,
    )
  }
  return {
    filas: salida,
    detallesRecortados,
    error: problemas.length > 0 ? problemas.join(' ') : null,
  }
}
