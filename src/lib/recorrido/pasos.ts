/**
 * pasos.ts — definición canónica del recorrido de un inquilino, desde que entra
 * al catálogo hasta que se prepara el contrato.
 *
 * Por qué existe: el recorrido cruza el panel en diagonal. El paso 8 vive en
 * `/ai/estudio`, el 9 y el 10 en `/propiedades/[id]/candidatos` y el 11 en
 * `/contratos/nuevo` — tres secciones distintas del sidebar, agrupadas por
 * módulo de negocio y no por recorrido. Quien opera no tiene cómo ver que son
 * una sola cadena.
 *
 * Este archivo es la única fuente de verdad de esa cadena. Las pantallas
 * existentes NO se mueven: importan de acá para mostrar dónde están paradas.
 *
 * El dato que hace legible el recorrido es `actor`: **de quién es la pelota**.
 * Sin eso, una inmobiliaria mirando "paso 4 de 11" no sabe si está esperando o
 * si le toca a ella.
 *
 * Vocabulario tomado de `docs/VOCABULARIO.md` (audiencia = agencia):
 * "asegurabilidad" (no "aprobación"), "evaluación de candidatos" (no "estudio
 * del inquilino"), "postulación" (nunca "aplicación").
 */

/** Quién tiene que actuar para que el recorrido avance. */
export type ActorPaso = 'inquilino' | 'inmobiliaria'

export type PasoKey =
  | 'catalogo'
  | 'asegurabilidad'
  | 'pago'
  | 'aseguradoras'
  | 'compatibles'
  | 'postulacion'
  | 'alerta'
  | 'evaluacion'
  | 'comparacion'
  | 'decision'
  | 'contrato'

export interface PasoRecorrido {
  /** 1..11 — el número que se le muestra a quien opera. */
  numero: number
  key: PasoKey
  /** Quién tiene la pelota en este paso. */
  actor: ActorPaso
  /** Clave i18n de la etiqueta corta (la que va en el stepper). */
  labelKey: string
  /** Clave i18n de la línea que explica qué pasa acá. */
  descKey: string
  /**
   * Dónde lo atiende la inmobiliaria. `null` cuando el paso es del inquilino,
   * lo resuelve el sistema solo, o todavía no tiene pantalla.
   * Las rutas que dependen de una propiedad se pasan por `hrefs` en el
   * componente (ver `RecorridoStepper`), no se hardcodean acá.
   */
  href: string | null
}

const I18N = 'inmobiliaria.recorrido.pasos'

/** Lo que se declara a mano; el resto (`numero`, claves i18n) se deriva. */
type DefinicionPaso = Pick<PasoRecorrido, 'key' | 'actor' | 'href'>

/**
 * Los 11 pasos, en orden. El orden del arreglo ES el orden del recorrido:
 * `numero` se deriva de la posición para que no puedan desincronizarse.
 */
const DEFINICIONES: readonly DefinicionPaso[] = [
  { key: 'catalogo',       actor: 'inquilino',     href: null },
  { key: 'asegurabilidad', actor: 'inquilino',     href: null },
  { key: 'pago',           actor: 'inquilino',     href: null },
  { key: 'aseguradoras',   actor: 'inquilino',     href: null },
  { key: 'compatibles',    actor: 'inquilino',     href: null },
  { key: 'postulacion',    actor: 'inquilino',     href: null },
  { key: 'alerta',         actor: 'inmobiliaria',  href: '/panel/inmobiliaria/recorrido' },
  { key: 'evaluacion',     actor: 'inmobiliaria',  href: '/panel/inmobiliaria/ai/estudio/cola' },
  { key: 'comparacion',    actor: 'inmobiliaria',  href: null },
  { key: 'decision',       actor: 'inmobiliaria',  href: null },
  { key: 'contrato',       actor: 'inmobiliaria',  href: '/panel/inmobiliaria/contratos/nuevo' },
]

export const PASOS_RECORRIDO: readonly PasoRecorrido[] = DEFINICIONES.map((paso, i) => ({
  ...paso,
  numero: i + 1,
  labelKey: `${I18N}.${paso.key}.label`,
  descKey: `${I18N}.${paso.key}.desc`,
}))

export const TOTAL_PASOS = PASOS_RECORRIDO.length

/** Índice 0-based de un paso. `-1` si la clave no existe. */
export function indiceDePaso(key: PasoKey): number {
  return PASOS_RECORRIDO.findIndex((p) => p.key === key)
}

/** El paso completo por su clave. `undefined` si no existe. */
export function pasoPorKey(key: PasoKey): PasoRecorrido | undefined {
  return PASOS_RECORRIDO.find((p) => p.key === key)
}

/**
 * El primer paso del recorrido en el que le toca actuar a la inmobiliaria,
 * contando desde `desde` (inclusive). `undefined` si de ahí en adelante no
 * queda nada suyo.
 *
 * Es lo que responde "¿y ahora qué hago yo?" — la pregunta que hoy el panel
 * deja sin contestar cuando entra una postulación.
 */
export function proximoPasoDeLaInmobiliaria(desde: PasoKey): PasoRecorrido | undefined {
  const i = indiceDePaso(desde)
  if (i === -1) return undefined
  return PASOS_RECORRIDO.slice(i).find((p) => p.actor === 'inmobiliaria')
}

/** `true` si en este paso la pelota la tiene la inmobiliaria. */
export function esDeLaInmobiliaria(key: PasoKey): boolean {
  return pasoPorKey(key)?.actor === 'inmobiliaria'
}
