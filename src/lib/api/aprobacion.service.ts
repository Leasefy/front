/**
 * aprobacion.service.ts — la aprobación del inquilino (paso 4 del recorrido).
 *
 * Una persona se estudia UNA vez, sin propiedad, y las aseguradoras responden
 * dos cosas: si la respaldan y **hasta cuánto**. Ese tope es el dato del que
 * cuelga el resto del recorrido — el catálogo se filtra con él y con él se
 * postula a varias propiedades sin volver a pagar.
 *
 * Vocabulario: al inquilino esto se le llama **aprobación**, nunca
 * "asegurabilidad" ni "estudio" (ver `docs/VOCABULARIO.md`).
 *
 * Fuente real: el pre-scoring del back principal (`GET /pre-scoring/current`,
 * Slice 2), traducido a este shape por `aprobacion-from-prescoring.ts` y
 * consumido en `use-aprobacion.ts`. Este archivo NO pega a ningún backend —
 * solo define el shape, sus parseos defensivos y las reglas de negocio que
 * operan sobre él (vigencia, referencia de canon, etc.).
 *
 * ⚠️ Regla: `topeAprobadoCop` puede venir en `null`. La UI **dice que falta**,
 * nunca inventa un número — un tope falso manda a alguien a postularse a algo
 * que no puede pagar.
 */

/** Días restantes a partir de los cuales la vigencia se muestra como urgente. */
export const DIAS_POR_VENCER = 3

export type EstadoAprobacion = 'sin_estudio' | 'en_proceso' | 'aprobado' | 'rechazado'

export interface AseguradoraVeredicto {
  nombre: string
  aprobada: boolean
}

export interface Aprobacion {
  estado: EstadoAprobacion
  /** Canon mensual máximo respaldado, en COP enteros. `null` = el back aún no lo manda. */
  topeAprobadoCop: number | null
  /** Todas las consultadas, aprobaran o no: el inquilino ve que fueron varias. */
  aseguradoras: AseguradoraVeredicto[]
  /** ISO-8601. `null` cuando no aplica (sin estudio / en proceso). */
  vigenteHasta: string | null
  /** ISO-8601 de cuándo se resolvió. */
  resueltoEn: string | null
  /**
   * Aprobado, pero alguna aseguradora pide algo (codeudor, depósito).
   * Sigue siendo aprobado: se puede postular. La condición la resuelve el asesor.
   */
  condicionada: boolean
  /**
   * El canon que la persona escribió al consultar, si escribió alguno.
   *
   * No es su tope —nadie sabe su tope todavía— pero es un dato **cierto**:
   * preguntó por esa cifra y se la aprobaron. Es lo único con lo que hoy se
   * puede personalizar el catálogo, y por eso se etiqueta aparte del tope:
   * decir "estás aprobado hasta $X" cuando en realidad solo sabemos "hasta
   * $X llega" le cerraría la puerta a algo que quizá sí puede pagar.
   */
  canonConsultadoCop: number | null
}

/**
 * El primer estado del recorrido: todavía no se ha consultado nada.
 * No es un error ni un rechazo — es el punto de partida, y la UI lo usa para
 * enseñar el camino en vez de mostrar un vacío.
 */
export const SIN_APROBACION: Aprobacion = {
  estado: 'sin_estudio',
  topeAprobadoCop: null,
  aseguradoras: [],
  vigenteHasta: null,
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}

/** Normaliza la respuesta cruda: nunca confía en que el back mande todo. */
export function parseAprobacion(data: unknown): Aprobacion {
  const d = (data ?? {}) as Partial<Aprobacion>
  const estados: EstadoAprobacion[] = ['sin_estudio', 'en_proceso', 'aprobado', 'rechazado']
  return {
    estado: estados.includes(d.estado as EstadoAprobacion)
      ? (d.estado as EstadoAprobacion)
      : 'sin_estudio',
    topeAprobadoCop:
      typeof d.topeAprobadoCop === 'number' && Number.isFinite(d.topeAprobadoCop)
        ? d.topeAprobadoCop
        : null,
    aseguradoras: Array.isArray(d.aseguradoras)
      ? d.aseguradoras
          .filter((a): a is AseguradoraVeredicto => !!a && typeof a.nombre === 'string')
          .map((a) => ({ nombre: a.nombre, aprobada: a.aprobada === true }))
      : [],
    vigenteHasta: typeof d.vigenteHasta === 'string' ? d.vigenteHasta : null,
    resueltoEn: typeof d.resueltoEn === 'string' ? d.resueltoEn : null,
    condicionada: d.condicionada === true,
    canonConsultadoCop:
      typeof d.canonConsultadoCop === 'number' && Number.isFinite(d.canonConsultadoCop)
        ? d.canonConsultadoCop
        : null,
  }
}

/**
 * Días calendario que faltan para que venza. `null` si no hay fecha.
 * Negativo = ya venció. `ahora` se inyecta para poder testearlo.
 */
export function diasParaVencer(vigenteHasta: string | null, ahora: Date = new Date()): number | null {
  if (!vigenteHasta) return null
  const fin = new Date(vigenteHasta)
  if (Number.isNaN(fin.getTime())) return null
  const dia = 24 * 60 * 60 * 1000
  // Se compara a medianoche para que "vence mañana" no dependa de la hora.
  const a = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate())
  const b = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())
  return Math.round((a - b) / dia)
}

export type EstadoVigencia = 'vigente' | 'por_vencer' | 'vencida'

/**
 * Cuánto dura una aprobación lo decide el backend (`vigenteHasta`), no el front.
 * Acá solo se traduce a urgencia visual.
 */
export function estadoVigencia(dias: number | null): EstadoVigencia | null {
  if (dias === null) return null
  if (dias < 0) return 'vencida'
  if (dias <= DIAS_POR_VENCER) return 'por_vencer'
  return 'vigente'
}

/**
 * ¿Sirve hoy para postularse? Aprobada y no vencida.
 * Sin fecha de vencimiento se asume vigente: el backend es el dueño de la
 * caducidad, y a falta de dato no se le quita al usuario algo que ya ganó.
 */
export function estaVigente(a: Aprobacion | null, ahora: Date = new Date()): boolean {
  if (!a || a.estado !== 'aprobado') return false
  return estadoVigencia(diasParaVencer(a.vigenteHasta, ahora)) !== 'vencida'
}

/**
 * ¿Ese canon entra en el tope aprobado?
 * `null` = no se puede saber (falta el tope). Quien llame **no debe** asumir
 * que null es `false` ni `true`: es "todavía no sabemos", y se comunica así.
 */
export function cabeEnTope(canonCop: number, tope: number | null): boolean | null {
  if (tope === null || !Number.isFinite(canonCop)) return null
  return canonCop <= tope
}

/**
 * ¿Se le puede decir que se postula **sin codeudor**?
 *
 * `null` = no se puede saber, y entonces no se afirma nada — ni que sí ni que
 * no. Como en `cabeEnTope`: no saber no es poder prometer.
 *
 * Existe porque la ficha de propiedad tenía «Sin codeudor» escrito a mano en
 * todas: se lo prometíamos también a quien tenía la aprobación condicionada,
 * que es exactamente a quien la aseguradora sí le va a pedir uno.
 */
export function seLePuedePrometerSinCodeudor(a: Aprobacion | null): boolean | null {
  if (!a || a.estado !== 'aprobado') return null
  return a.condicionada !== true
}

/** De dónde salió el número con el que se personaliza el catálogo. */
export type TipoReferencia = 'tope' | 'consultado'

export interface Referencia {
  valorCop: number
  tipo: TipoReferencia
}

/**
 * El número con el que el catálogo se vuelve personal — y de dónde salió.
 *
 * Se prefiere el **tope** real del backend. Cuando no viene (hoy no viene),
 * sirve el **canon consultado**: si preguntó por $2.000.000 y se lo aprobaron,
 * eso es cierto. Pero significan cosas distintas y por eso viajan etiquetados:
 * un tope es un techo, un canon consultado es apenas un punto confirmado.
 * Tratarlos igual convertiría "hasta acá llegaste" en "de acá no pasas".
 *
 * `null` = no hay con qué personalizar, y entonces no se marca nada.
 */
export function referenciaCanon(a: Aprobacion | null): Referencia | null {
  if (!a || a.estado !== 'aprobado') return null
  if (a.topeAprobadoCop !== null) return { valorCop: a.topeAprobadoCop, tipo: 'tope' }
  if (a.canonConsultadoCop !== null) return { valorCop: a.canonConsultadoCop, tipo: 'consultado' }
  return null
}

/**
 * ¿Este canon se pasa de la referencia?
 * `null` = no se puede saber. Como en `cabeEnTope`, `null` **no es** un `false`
 * disfrazado: sin dato no se marca ni se bloquea nada.
 */
export function superaReferencia(canonCop: number, a: Aprobacion | null): boolean | null {
  const ref = referenciaCanon(a)
  if (!ref || !Number.isFinite(canonCop)) return null
  return canonCop > ref.valorCop
}
