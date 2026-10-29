/**
 * estudio-de-canon.types.ts — the free standalone document study ("¿hasta cuánto
 * me arriendan?") of T-0193. Wire frozen in
 * `.orchestration/tasks/T-0193-tenant-canon-estimate-bureau/contract.md` §3.1 A.
 *
 * Defensive parsing (scoring-domain rule): an absent or non-finite number is
 * `null`, never `0`, and the front never invents a figure. `canonMaximoCop`
 * only comes from the back (bureau `canonMaximo()`).
 */

export type TipoDeDocumento = 'cedula' | 'extracto_bancario' | 'nomina' | 'certificacion_laboral'
export type TipoObligatorio = 'cedula' | 'extracto_bancario'
export type EstadoDelEstudio = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type LetraDelEstudio = 'A' | 'B' | 'C' | 'D'
export type VeredictoDelEstudio = 'FACIL' | 'CON_CONDICIONES' | 'NO' | 'REVISAR'

export const TIPOS_DE_DOCUMENTO: readonly TipoDeDocumento[] = [
  'cedula',
  'extracto_bancario',
  'nomina',
  'certificacion_laboral',
]
export const TIPOS_OBLIGATORIOS: readonly TipoObligatorio[] = ['cedula', 'extracto_bancario']

export interface ResultadoDelEstudio {
  canonMaximoCop: number | null
  ingresoVerificadoCop: number | null
  letra: LetraDelEstudio | null
  puntaje: number | null
  veredicto: VeredictoDelEstudio | null
  condiciones: string[]
  explicacion: string[]
  revisiones: { codigo: string; texto: string }[]
  conHistorial: boolean
}

/** Documents the back can blame for a failure (T-0195 §3.2). */
export type DocumentoConError = 'cedula' | 'extracto_bancario'
export type AccionDelError = 'REINTENTAR' | 'REEMPLAZAR_DOCUMENTO'

/** Retries a study may use (T-0195 `MAX_REINTENTOS_POR_ESTUDIO`); only the fallback when the back omits the count. */
export const REINTENTOS_RESTANTES_POR_DEFECTO = 1

export interface ErrorDelEstudio {
  codigo: string
  mensaje: string
  /** The slot the problem was in; `null` = no document is blamed. */
  documentoConError: DocumentoConError | null
  accion: AccionDelError
  /** `>= 0`. 0 means "empezar un estudio nuevo". */
  reintentosRestantes: number
}

export interface EstudioDeCanon {
  id: string
  status: EstadoDelEstudio
  creadoEl: string | null
  terminadoEl: string | null
  venceEl: string | null
  documentos: { tipo: TipoDeDocumento }[]
  faltan: TipoObligatorio[]
  resultado: ResultadoDelEstudio | null
  error: ErrorDelEstudio | null
}

const ESTADOS: readonly EstadoDelEstudio[] = ['DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED']
const LETRAS: readonly string[] = ['A', 'B', 'C', 'D']
const VEREDICTOS: readonly string[] = ['FACIL', 'CON_CONDICIONES', 'NO', 'REVISAR']

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function textoONull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Money: positive finite number or `null`. A 0 is "unknown", never shown as $0. */
function dineroONull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
}

function numeroONull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
}

function parseResultado(raw: unknown): ResultadoDelEstudio | null {
  if (!esObjeto(raw)) return null
  return {
    canonMaximoCop: dineroONull(raw.canonMaximoCop),
    ingresoVerificadoCop: dineroONull(raw.ingresoVerificadoCop),
    letra: typeof raw.letra === 'string' && LETRAS.includes(raw.letra) ? (raw.letra as LetraDelEstudio) : null,
    puntaje: numeroONull(raw.puntaje),
    veredicto:
      typeof raw.veredicto === 'string' && VEREDICTOS.includes(raw.veredicto)
        ? (raw.veredicto as VeredictoDelEstudio)
        : null,
    condiciones: listaDeTextos(raw.condiciones),
    explicacion: listaDeTextos(raw.explicacion),
    revisiones: Array.isArray(raw.revisiones)
      ? raw.revisiones
          .filter(esObjeto)
          .filter((r) => typeof r.codigo === 'string' && typeof r.texto === 'string')
          .map((r) => ({ codigo: r.codigo as string, texto: r.texto as string }))
      : [],
    conHistorial: raw.conHistorial === true,
  }
}

/** Required document types that are not uploaded yet. */
export function documentosQueFaltan(documentos: ReadonlyArray<{ tipo: TipoDeDocumento }>): TipoObligatorio[] {
  return TIPOS_OBLIGATORIOS.filter((t) => !documentos.some((d) => d.tipo === t))
}

/** `true` while a required document is still missing (start is not possible). */
export function hayAlgoQueSubir(documentos: ReadonlyArray<{ tipo: TipoDeDocumento }>): boolean {
  return documentosQueFaltan(documentos).length > 0
}

/** `Estudio` → typed study, or `null` if the id or status are not usable. */
export function parseEstudio(raw: unknown): EstudioDeCanon | null {
  if (!esObjeto(raw)) return null
  const id = textoONull(raw.id)
  if (!id) return null
  if (typeof raw.status !== 'string' || !ESTADOS.includes(raw.status as EstadoDelEstudio)) return null
  const status = raw.status as EstadoDelEstudio

  const documentos = Array.isArray(raw.documentos)
    ? raw.documentos
        .filter(esObjeto)
        .filter((d) => TIPOS_DE_DOCUMENTO.includes(d.tipo as TipoDeDocumento))
        .map((d) => ({ tipo: d.tipo as TipoDeDocumento }))
    : []

  const faltan = Array.isArray(raw.faltan)
    ? raw.faltan.filter((t): t is TipoObligatorio => TIPOS_OBLIGATORIOS.includes(t as TipoObligatorio))
    : documentosQueFaltan(documentos)

  let error: EstudioDeCanon['error'] = null
  if (status === 'FAILED') {
    const e = esObjeto(raw.error) ? raw.error : {}
    const restantes = e.reintentosRestantes
    const documento = e.documentoConError
    error = {
      codigo: textoONull(e.codigo) ?? 'ESTUDIO_FALLIDO',
      mensaje: typeof e.mensaje === 'string' ? e.mensaje : '',
      documentoConError: documento === 'cedula' || documento === 'extracto_bancario' ? documento : null,
      accion: e.accion === 'REEMPLAZAR_DOCUMENTO' ? 'REEMPLAZAR_DOCUMENTO' : 'REINTENTAR',
      reintentosRestantes:
        typeof restantes === 'number' && Number.isFinite(restantes) && restantes >= 0
          ? Math.floor(restantes)
          : REINTENTOS_RESTANTES_POR_DEFECTO,
    }
  }

  return {
    id,
    status,
    creadoEl: textoONull(raw.creadoEl),
    terminadoEl: textoONull(raw.terminadoEl),
    venceEl: textoONull(raw.venceEl),
    documentos,
    faltan,
    resultado: status === 'COMPLETED' ? parseResultado(raw.resultado) : null,
    error,
  }
}

/** `GET /calificacion-leasefy/estudio/actual` → `{ estudio }`. */
export function parseEstudioActual(raw: unknown): EstudioDeCanon | null {
  if (!esObjeto(raw)) return null
  return parseEstudio(raw.estudio)
}

const MENSAJE_GENERICO = 'No pudimos completar esto. Inténtalo de nuevo en unos minutos.'

/** User-facing copy per stable back `code` (contract §3.1 A error table + §3.1 C). */
const MENSAJES: Record<string, string> = {
  ESTUDIO_LIMITE_DIARIO:
    'Hoy ya hiciste el máximo de estudios permitidos. Vuelve mañana y lo intentamos de nuevo.',
  PRESCORING_DESACTIVADO:
    'El estudio anterior ya no está disponible. Calcula tu tope gratis en Mi calificación.',
  AUTORIZACION_REQUERIDA: 'Para empezar necesitamos tu autorización. Márcala y vuelve a intentarlo.',
  ESTUDIO_NO_ENCONTRADO: 'No encontramos ese estudio. Puedes empezar uno nuevo.',
  ESTUDIO_YA_INICIADO: 'Este estudio ya inició. Estamos mostrándote su estado actual.',
  ESTUDIO_NO_REINTENTABLE: 'Este estudio ya no se puede reintentar. Estamos mostrándote su estado actual.',
  ESTUDIO_SIN_REINTENTOS:
    'Ya usaste todos los reintentos de este estudio. Puedes empezar uno nuevo con tus documentos.',
  ESTUDIO_NO_ARRANCO: 'No pudimos iniciar el estudio de tus documentos. Inténtalo de nuevo.',
  DOCUMENTOS_FALTANTES: 'Faltan documentos: sube tu cédula y tu extracto bancario para continuar.',
  EXTRACTO_ILEGIBLE:
    'No pudimos leer tu extracto bancario. Sube uno más reciente y nítido, en PDF o foto bien iluminada.',
  CEDULA_ILEGIBLE: 'No pudimos leer tu cédula. Sube una foto nítida de ambas caras.',
  TIMEOUT: 'El estudio se demoró más de lo normal y lo detuvimos. Puedes intentarlo de nuevo.',
  ESTUDIO_FALLIDO: 'No pudimos terminar el estudio con esos documentos. Puedes intentarlo de nuevo.',
  SERVICIO_NO_DISPONIBLE: 'El servicio no está disponible en este momento. Tus documentos quedaron guardados: reintenta en un momento.',
}

/**
 * Copy for an error code. For codes without fixed copy (e.g. `ARCHIVO_INVALIDO`,
 * whose back message is already user-facing Spanish) the server message wins,
 * then a generic line.
 */
export function mensajeDelErrorDelEstudio(codigo: string | undefined, mensajeDelServidor?: string): string {
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo]
  if (mensajeDelServidor && mensajeDelServidor.trim()) return mensajeDelServidor
  return MENSAJE_GENERICO
}
