/**
 * vocabulario-de-seguimiento.ts — el vocabulario VISIBLE del seguimiento de Naira (Fase 13, plan 13-04). PURO: sin React,
 * sin red y sin rutas (la ubicación la deciden las páginas, D13-1).
 *
 * Qué trae:
 *   · el nombre conversacional de cada métrica del catálogo (el título de una fila y de una bitácora). Es vocabulario del
 *     agente (NOMBRES_CONVERSACIONALES de 9.5-01): va en código y en español siempre, también con el panel en inglés (P4).
 *     Una métrica que el panel no conoce no tiene nombre (`null`): la vista dice que no la reconoce, nunca muestra el id;
 *   · las claves i18n de los vocabularios cerrados del contrato del loop (rol, estado, forma, desenlace, candidato, tipo de
 *     evento y verificación). Cada mapa es exhaustivo por tipo: un valor nuevo del contrato rompe `tsc`;
 *   · `fechaLegible`, que escribe una fecha que no es cifra con los formateadores de la fase (P5): un día `YYYY-MM-DD` con
 *     `formatearDia` (13-03, día de calendario) y un instante con zona con `formatearCorte` (13-01, Bogotá). Ninguno propio.
 *     Lo que no es ni lo uno ni lo otro da `null`: nunca se devuelve el texto crudo.
 *
 * El dueño de un loop se dice SOLO como rol (B-5, D13-11, U19: `role:portafolio` es «Inmuebles»); 13-05 reusa CLAVE_DEL_ROL
 * para el dueño de una tarea, así el rol se nombra en un solo lugar.
 *
 * Lo que el contrato trae y aquí NO se nombra (P9): la razón del dueño, la clave de causa, el episodio, el detector, la
 * clase, la familia, los conteos de Naira (ciclos, confirmaciones, racha, ocultos) y el interior de los nodos opacos (de
 * la verificación solo su `kind`).
 */

import type {
  DESENLACES_DEL_LOOP,
  DUENOS_DE_ROL,
  ESTADOS_DEL_LOOP,
  FORMAS_DEL_LOOP,
  NairaOpenLoopEvent,
  TIPOS_DE_EVENTO_DEL_LOOP,
} from '@/lib/api/naira/contrato'
import { esDiaValido, formatearDia } from '@/lib/naira/briefing-y-senal'
import { formatearCorte } from '@/lib/naira/formato'
import type { METRICAS_DEL_CATALOGO } from '@/lib/naira/fuente-a-ruta'

// ── Nombre de la métrica ──

// fuente: 9.5-01-PLAN.md:598-603 (NOMBRES_CONVERSACIONALES)
// estado: PLANIFICADO
export const NOMBRE_CONVERSACIONAL_DE_LA_METRICA = {
  'cartera.morosidad_rate': 'índice de morosidad',
  'cartera.mora_exposure_cop': 'exposición en mora',
  'cartera.recovered_cop_30d': 'recaudo del último mes',
  'cartera.promise_kept_rate_7d': 'cumplimiento de promesas de pago de la última semana',
  'cartera.promises_open_count': 'promesas vencidas sin resolver',
  'cartera.payment_plan_default_rate_90d': 'incumplimiento de acuerdos de pago del último trimestre',
  'cartera.escalations_open_count': 'casos escalados abiertos',
  'cartera.disputes_open_count': 'reclamaciones del deudor sin resolver',
  'portafolio.available_units_count': 'inmuebles disponibles',
  'portafolio.vacancy_rate': 'tasa de vacancia',
  'portafolio.rent_roll_cop': 'canon mensual bajo administración',
  'portafolio.days_on_market_p50': 'mediana de días en mercado',
  'prospectos.leads_sin_contacto_count': 'interesados sin asesor asignado',
  'sla.escalacion_vencida_count': 'escalaciones vencidas',
} as const satisfies Record<(typeof METRICAS_DEL_CATALOGO)[number], string>

/** El nombre conversacional de la métrica; `null` si el panel no la conoce (tampoco para claves heredadas del prototipo). */
export function nombreConversacional(metricId: string): string | null {
  if (!Object.hasOwn(NOMBRE_CONVERSACIONAL_DE_LA_METRICA, metricId)) return null
  return NOMBRE_CONVERSACIONAL_DE_LA_METRICA[metricId as keyof typeof NOMBRE_CONVERSACIONAL_DE_LA_METRICA]
}

/** El nombre como título (inicial en mayúscula, es-CO); `null` si el panel no conoce la métrica. */
export function tituloDeLaMetrica(metricId: string): string | null {
  const nombre = nombreConversacional(metricId)
  if (nombre === null) return null
  return nombre.charAt(0).toLocaleUpperCase('es-CO') + nombre.slice(1)
}

// ── Claves i18n de los vocabularios cerrados del loop ──

export const CLAVE_DEL_ROL = {
  'role:cartera': 'inmobiliaria.ai.naira.roles.cartera',
  'role:portafolio': 'inmobiliaria.ai.naira.roles.portafolio',
  'role:prospectos': 'inmobiliaria.ai.naira.roles.prospectos',
} as const satisfies Record<(typeof DUENOS_DE_ROL)[number], string>

export const CLAVE_DEL_ESTADO_DEL_LOOP = {
  abierto: 'inmobiliaria.ai.naira.seguimiento.estados.abierto',
  en_seguimiento: 'inmobiliaria.ai.naira.seguimiento.estados.en_seguimiento',
  escalado: 'inmobiliaria.ai.naira.seguimiento.estados.escalado',
  en_confirmacion: 'inmobiliaria.ai.naira.seguimiento.estados.en_confirmacion',
  cerrado: 'inmobiliaria.ai.naira.seguimiento.estados.cerrado',
} as const satisfies Record<(typeof ESTADOS_DEL_LOOP)[number], string>

export const CLAVE_DE_LA_FORMA_DEL_LOOP = {
  recordatorio: 'inmobiliaria.ai.naira.seguimiento.formas.recordatorio',
  impacto: 'inmobiliaria.ai.naira.seguimiento.formas.impacto',
  escalada: 'inmobiliaria.ai.naira.seguimiento.formas.escalada',
} as const satisfies Record<(typeof FORMAS_DEL_LOOP)[number], string>

export const CLAVE_DEL_DESENLACE_DEL_LOOP = {
  resuelto_por_dato: 'inmobiliaria.ai.naira.seguimiento.desenlaces.resuelto_por_dato',
  no_accionado: 'inmobiliaria.ai.naira.seguimiento.desenlaces.no_accionado',
  sin_reincidencia: 'inmobiliaria.ai.naira.seguimiento.desenlaces.sin_reincidencia',
  expirado: 'inmobiliaria.ai.naira.seguimiento.desenlaces.expirado',
} as const satisfies Record<(typeof DESENLACES_DEL_LOOP)[number], string>

/** El desenlace que Naira está por confirmar: nunca `expirado` (el contrato lo excluye del candidato). */
export const CLAVE_DEL_CANDIDATO_DEL_LOOP = {
  resuelto_por_dato: 'inmobiliaria.ai.naira.seguimiento.candidato.resuelto_por_dato',
  no_accionado: 'inmobiliaria.ai.naira.seguimiento.candidato.no_accionado',
  sin_reincidencia: 'inmobiliaria.ai.naira.seguimiento.candidato.sin_reincidencia',
} as const satisfies Record<Exclude<(typeof DESENLACES_DEL_LOOP)[number], 'expirado'>, string>

export const CLAVE_DEL_EVENTO_DEL_LOOP = {
  nacimiento: 'inmobiliaria.ai.naira.bitacora.eventos.nacimiento',
  ciclo: 'inmobiliaria.ai.naira.bitacora.eventos.ciclo',
  cambio_de_forma: 'inmobiliaria.ai.naira.bitacora.eventos.cambio_de_forma',
  en_confirmacion: 'inmobiliaria.ai.naira.bitacora.eventos.en_confirmacion',
  confirmacion_fallida: 'inmobiliaria.ai.naira.bitacora.eventos.confirmacion_fallida',
  no_verificable: 'inmobiliaria.ai.naira.bitacora.eventos.no_verificable',
  cierre: 'inmobiliaria.ai.naira.bitacora.eventos.cierre',
} as const satisfies Record<(typeof TIPOS_DE_EVENTO_DEL_LOOP)[number], string>

/** De la verificación de un evento (nodo opaco) solo se lee su `kind`. */
export const CLAVE_DE_LA_VERIFICACION_DEL_EVENTO = {
  nacimiento: 'inmobiliaria.ai.naira.bitacora.verificacion.nacimiento',
  del_dia: 'inmobiliaria.ai.naira.bitacora.verificacion.del_dia',
  sin_veredicto: 'inmobiliaria.ai.naira.bitacora.verificacion.sin_veredicto',
} as const satisfies Record<NairaOpenLoopEvent['verificacion']['kind'], string>

// ── Fechas que no son cifras ──

/**
 * Un día (`YYYY-MM-DD`) o un instante ISO con zona, escrito para una persona; `null` si no es ninguno de los dos.
 * Sin prefijo «Corte» ni edad relativa (UI-SPEC §6.1): la hora del instante va en Bogotá.
 */
export function fechaLegible(valor: string): string | null {
  if (esDiaValido(valor)) return formatearDia(valor)
  return formatearCorte(valor, new Date())?.absoluto ?? null
}
