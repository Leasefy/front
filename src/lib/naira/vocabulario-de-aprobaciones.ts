/**
 * vocabulario-de-aprobaciones.ts — el vocabulario VISIBLE de las aprobaciones de Naira (Fase 13, plan 13-05). PURO: sin
 * React, sin red y sin rutas (la ubicación la deciden las páginas, D13-1).
 *
 * Qué trae:
 *   · las claves i18n de los vocabularios cerrados del contrato de acciones y tareas de 12-07 (tipo, clase y estado de una
 *     propuesta, estado de una tarea, razón de un conflicto al decidir y el tipo de fuente que aportó un hecho). Cada mapa
 *     es exhaustivo por tipo: un valor nuevo del contrato rompe `tsc`;
 *   · el nombre de una tarea por su detector: la métrica del detector activo que la propuso y su título conversacional
 *     (13-04). Un detector que el panel no conoce no tiene nombre (`null`): la vista lo dice, nunca muestra el id;
 *   · las piezas puras que deciden qué se pinta de una propuesta: su grupo («Por decidir» o «Recientes»), los cortes de los
 *     hechos que cita la consecuencia (sin repetir, en el orden del servidor) y el valor de un hecho.
 *
 * El listado pinta la consecuencia SOLO con cortes válidos al lado (P6, E13-6 aplicada, D13-23): el texto lleva cifras de
 * hechos, y una cifra sin su corte no se muestra (INV-07). `consecuenciaDelListado` es el único punto que lo decide.
 *
 * El valor de un hecho va CRUDO (P8): el contrato no fija su representación por unidad, así que formatearlo podría mentir.
 * El grado de certeza que el agente guarda por hecho no se nombra aquí (U11). El destinatario y el dueño de una tarea se
 * dicen como ROL con CLAVE_DEL_ROL de 13-04 (B-5): el rol se nombra en un solo lugar.
 */
import {
  RAZONES_DE_CONFLICTO_DE_DECISION,
  type CLASES_DE_CONSECUENCIA,
  type ESTADOS_DE_LA_PROPUESTA,
  type ESTADOS_DE_TAREA,
  type NairaActionSummary,
  type TIPOS_DE_ACCION,
} from '@/lib/api/naira/contrato'
import { formatearCorte } from '@/lib/naira/formato'
import type { METRICAS_DEL_CATALOGO } from '@/lib/naira/fuente-a-ruta'
import { tituloDeLaMetrica } from '@/lib/naira/vocabulario-de-seguimiento'

// ── Claves i18n de los vocabularios cerrados de la propuesta y de la tarea ──

export const CLAVE_DEL_TIPO_DE_ACCION = {
  crear_tarea: 'inmobiliaria.ai.naira.aprobaciones.tipos.crear_tarea',
  asignar_tarea: 'inmobiliaria.ai.naira.aprobaciones.tipos.asignar_tarea',
  aviso_interno: 'inmobiliaria.ai.naira.aprobaciones.tipos.aviso_interno',
  despachar_vertical: 'inmobiliaria.ai.naira.aprobaciones.tipos.despachar_vertical',
} as const satisfies Record<(typeof TIPOS_DE_ACCION)[number], string>

export const CLAVE_DE_LA_CLASE_DE_CONSECUENCIA = {
  interna_reversible: 'inmobiliaria.ai.naira.aprobaciones.clases.interna_reversible',
  interna_irreversible: 'inmobiliaria.ai.naira.aprobaciones.clases.interna_irreversible',
  externa: 'inmobiliaria.ai.naira.aprobaciones.clases.externa',
} as const satisfies Record<(typeof CLASES_DE_CONSECUENCIA)[number], string>

export const CLAVE_DEL_ESTADO_DE_LA_PROPUESTA = {
  pendiente: 'inmobiliaria.ai.naira.aprobaciones.estados.pendiente',
  vencible: 'inmobiliaria.ai.naira.aprobaciones.estados.vencible',
  aprobada: 'inmobiliaria.ai.naira.aprobaciones.estados.aprobada',
  rechazada: 'inmobiliaria.ai.naira.aprobaciones.estados.rechazada',
  vencida: 'inmobiliaria.ai.naira.aprobaciones.estados.vencida',
  ejecutada: 'inmobiliaria.ai.naira.aprobaciones.estados.ejecutada',
  no_ejecutada: 'inmobiliaria.ai.naira.aprobaciones.estados.no_ejecutada',
} as const satisfies Record<(typeof ESTADOS_DE_LA_PROPUESTA)[number], string>

export const CLAVE_DEL_ESTADO_DE_TAREA = {
  abierta: 'inmobiliaria.ai.naira.tareas.estados.abierta',
  cancelada: 'inmobiliaria.ai.naira.tareas.estados.cancelada',
  cerrada_por_loop: 'inmobiliaria.ai.naira.tareas.estados.cerrada_por_loop',
} as const satisfies Record<(typeof ESTADOS_DE_TAREA)[number], string>

/**
 * La copy de un 409 al decidir, por su razón. Tres razones (clase incoherente, no reproducible, procedencia no disponible)
 * comparten UNA copy: para la persona las tres dicen lo mismo, que la propuesta no se puede verificar (UI-SPEC §7.6).
 */
export const CLAVE_DEL_CONFLICTO_DE_DECISION = {
  clase_incoherente: 'inmobiliaria.ai.naira.propuesta.conflictos.no_verificable',
  vencida: 'inmobiliaria.ai.naira.propuesta.conflictos.vencida',
  no_reproducible: 'inmobiliaria.ai.naira.propuesta.conflictos.no_verificable',
  huella_distinta: 'inmobiliaria.ai.naira.propuesta.conflictos.huella_distinta',
  procedencia_no_disponible: 'inmobiliaria.ai.naira.propuesta.conflictos.no_verificable',
  ya_decidida: 'inmobiliaria.ai.naira.propuesta.conflictos.ya_decidida',
} as const satisfies Record<(typeof RAZONES_DE_CONFLICTO_DE_DECISION)[number], string>

/** El TIPO de fuente que aportó un hecho (`trust`, UI-SPEC §6.7): nunca una persona. */
export const CLAVE_DEL_APORTE = {
  system: 'inmobiliaria.ai.naira.propuesta.aportes.system',
  staff: 'inmobiliaria.ai.naira.propuesta.aportes.staff',
  third_party: 'inmobiliaria.ai.naira.propuesta.aportes.third_party',
} as const

/** La clave del tipo de fuente; un valor desconocido (u hostil) da `null` y no se pinta. Sin índice por string. */
export function claveDelAporte(trust: string): string | null {
  switch (trust) {
    case 'system':
      return CLAVE_DEL_APORTE.system
    case 'staff':
      return CLAVE_DEL_APORTE.staff
    case 'third_party':
      return CLAVE_DEL_APORTE.third_party
    default:
      return null
  }
}

/** ¿La razón de un 409 es una de las que el contrato declara? (las demás se pintan como un fallo al registrar, P5) */
export function esRazonDeConflictoDeDecision(
  razon: string | null,
): razon is (typeof RAZONES_DE_CONFLICTO_DE_DECISION)[number] {
  return razon !== null && RAZONES_DE_CONFLICTO_DE_DECISION.some((r) => r === razon)
}

// ── El nombre de una tarea por su detector ──

// Solo los detectores activos proponen crear una tarea (12-01: ACCION_POR_DETECTOR = DETECTORES_ACTIVOS), así que toda
// tarea viene de uno de estos. El tipo del valor exige que cada métrica sea del catálogo cerrado del panel.
// fuente: agent-account-manager src/naira/detect/registry.ts (DETECTOR_REGISTRY, status active)
// estado: EXISTE
export const METRICA_DEL_DETECTOR_ACTIVO: Readonly<Record<string, (typeof METRICAS_DEL_CATALOGO)[number]>> = Object.freeze({
  'cartera.recaudo_tendencia': 'cartera.recovered_cop_30d',
  'prospectos.leads_sin_contacto': 'prospectos.leads_sin_contacto_count',
  'estado.vacancia_prolongada': 'portafolio.days_on_market_p50',
  'estado.portafolio_sin_disponibles': 'portafolio.available_units_count',
  'estado.vacancia_tendencia': 'portafolio.vacancy_rate',
})

/** La métrica del detector activo; `null` si el panel no lo conoce (tampoco para claves del prototipo). */
export function metricaDelDetector(detectorId: string): string | null {
  return Object.hasOwn(METRICA_DEL_DETECTOR_ACTIVO, detectorId) ? (METRICA_DEL_DETECTOR_ACTIVO[detectorId] ?? null) : null
}

/** El nombre de una tarea (el título de la métrica de su detector); `null` ⇒ la vista dice que no lo reconoce. */
export function nombreDeLaTarea(detectorId: string): string | null {
  const metrica = metricaDelDetector(detectorId)
  if (metrica === null) return null
  return tituloDeLaMetrica(metrica)
}

// ── Grupos del listado ──

export const GRUPOS_DE_PROPUESTA = ['por_decidir', 'recientes'] as const
export type GrupoDePropuesta = (typeof GRUPOS_DE_PROPUESTA)[number]

/** Lo pendiente (incluso lo que vence pronto) está por decidir; lo demás es reciente. */
export function grupoDeLaPropuesta(estado: (typeof ESTADOS_DE_LA_PROPUESTA)[number]): GrupoDePropuesta {
  switch (estado) {
    case 'pendiente': return 'por_decidir'
    case 'vencible': return 'por_decidir'
    case 'aprobada': return 'recientes'
    case 'rechazada': return 'recientes'
    case 'vencida': return 'recientes'
    case 'ejecutada': return 'recientes'
    case 'no_ejecutada': return 'recientes'
    default: {
      const nunca: never = estado
      return nunca
    }
  }
}

/** Las propuestas de un grupo, en el orden del servidor (sin reordenar). */
export function propuestasDelGrupo(
  acciones: readonly NairaActionSummary[],
  grupo: GrupoDePropuesta,
): readonly NairaActionSummary[] {
  return acciones.filter((accion) => grupoDeLaPropuesta(accion.estado) === grupo)
}

// ── La consecuencia en el listado (P6, E13-6 aplicada, D13-23) ──

export type ConsecuenciaDelListado =
  | { readonly kind: 'sin_corte' }
  | { readonly kind: 'no_reproducible' }
  | { readonly kind: 'con_corte'; readonly texto: string; readonly asOfs: readonly string[] }

// El reloj solo cambia la edad de un corte, no su validez (13-01): basta una fecha fija para validar.
const EPOCA = new Date(0)

/**
 * Qué se pinta de la consecuencia en el listado. Sin un corte válido el texto NO sale (INV-07, C16): `asOfs` ausente es un
 * agente sin la enmienda E13-6 (el espejo tolerante lo acepta), y un arreglo vacío o con un corte inválido tampoco sirve.
 */
export function consecuenciaDelListado(accion: NairaActionSummary): ConsecuenciaDelListado {
  if (accion.consecuencia.kind === 'no_reproducible') return { kind: 'no_reproducible' }
  const asOfs = Array.from(new Set(accion.asOfs ?? []))
  if (asOfs.length === 0 || asOfs.some((asOf) => formatearCorte(asOf, EPOCA) === null)) return { kind: 'sin_corte' }
  return { kind: 'con_corte', texto: accion.consecuencia.texto, asOfs }
}

// ── Los hechos de la ficha ──

/** Los cortes distintos de los hechos, en el orden del servidor. */
export function cortesDeLosHechos(hechos: readonly { readonly asOf: string }[]): readonly string[] {
  const vistos: string[] = []
  for (const hecho of hechos) {
    if (!vistos.includes(hecho.asOf)) vistos.push(hecho.asOf)
  }
  return vistos
}

/** El valor de un hecho como texto CRUDO; lo que no es un número finito ni un texto no vacío da `null` (nunca `0`). */
export function valorDelHecho(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  if (typeof value === 'string') return value === '' ? null : value
  return null
}
