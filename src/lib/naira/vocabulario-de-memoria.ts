/**
 * vocabulario-de-memoria.ts — el vocabulario VISIBLE de «qué cree Naira» (Fase 13, plan 13-07). PURO: sin React, sin red,
 * sin rutas y sin almacenamiento (la ubicación la deciden las páginas, D13-1).
 *
 * Qué trae:
 *   · las claves i18n de los vocabularios cerrados de la memoria de la Fase 8 (capa, procedencia, motivo de borrado, razón
 *     de rechazo de contenido) y de los avisos de esta vista. Cada mapa es exhaustivo por tipo: un valor nuevo del contrato
 *     rompe `tsc`;
 *   · el autor de una memoria como TIPO («Naira» o «alguien del equipo»): se lee SOLO su clase, nunca la persona (B-5);
 *   · qué memoria se puede confirmar como cierta (espejo de la regla del agente) y los filtros por capa y procedencia,
 *     validados contra el vocabulario y sin reordenar lo que manda el servidor;
 *   · el ÚNICO mapa que decide qué hace la UI después de escribir (`desenlaceDeEscritura`): ningún resultado lleva la razón
 *     cruda del servidor ni el texto enviado por la persona (P3); la razón se dice por su CLAVE;
 *   · a dónde va el foco después de borrar.
 */
import type { EstadoNaira } from '@/lib/api/naira/cliente'
import {
  PERSISTED_MEMORY_LAYERS,
  PROVENANCE_KINDS,
  type ERASURE_REASONS,
  type NairaMemoryErasureRequest,
  type NairaMemoryItem,
} from '@/lib/api/naira/contrato'

// ── Claves i18n de los vocabularios cerrados de la memoria ──

export const CLAVE_DE_LA_CAPA = {
  episodic: 'inmobiliaria.ai.naira.memoria.capas.episodic',
  semantic: 'inmobiliaria.ai.naira.memoria.capas.semantic',
  preference: 'inmobiliaria.ai.naira.memoria.capas.preference',
  procedural: 'inmobiliaria.ai.naira.memoria.capas.procedural',
} as const satisfies Record<(typeof PERSISTED_MEMORY_LAYERS)[number], string>

export const CLAVE_DE_LA_PROCEDENCIA = {
  observed: 'inmobiliaria.ai.naira.memoria.procedencias.observed',
  inferred: 'inmobiliaria.ai.naira.memoria.procedencias.inferred',
  stated_by_human: 'inmobiliaria.ai.naira.memoria.procedencias.stated_by_human',
} as const satisfies Record<(typeof PROVENANCE_KINDS)[number], string>

export type MotivoDeBorrado = NairaMemoryErasureRequest['motivo']

export const CLAVE_DEL_MOTIVO_DE_BORRADO = {
  solicitud_del_titular: 'inmobiliaria.ai.naira.memoria.borrado.motivos.solicitud_del_titular',
  decision_de_la_agencia: 'inmobiliaria.ai.naira.memoria.borrado.motivos.decision_de_la_agencia',
} as const satisfies Record<(typeof ERASURE_REASONS)[number], string>

// ── Razones de la pantalla de datos personales (422 al escribir): se dicen por su clave, jamás crudas ──

// fuente: agent-account-manager src/naira/memory/pii-guard.ts:58-63 (MEMORY_CONTENT_REJECTION_REASONS)
// estado: EXISTE
export const MOTIVOS_DE_RECHAZO_DE_CONTENIDO = ['pii:cedula', 'pii:telefono', 'pii:email', 'pending_counsel:naira_desempeno_empleados'] as const

export const CLAVE_DEL_RECHAZO_DE_CONTENIDO = {
  'pii:cedula': 'inmobiliaria.ai.naira.memoria.rechazos.cedula',
  'pii:telefono': 'inmobiliaria.ai.naira.memoria.rechazos.telefono',
  'pii:email': 'inmobiliaria.ai.naira.memoria.rechazos.correo',
  'pending_counsel:naira_desempeno_empleados': 'inmobiliaria.ai.naira.memoria.rechazos.desempeno',
} as const satisfies Record<(typeof MOTIVOS_DE_RECHAZO_DE_CONTENIDO)[number], string>

export const CLAVE_DEL_RECHAZO_OTRO = 'inmobiliaria.ai.naira.memoria.rechazos.otro'

/** Una de las cuatro razones de la pantalla ⇒ su clave; cualquier otra cosa ⇒ la clave genérica (NUNCA la razón). */
export function claveDelRechazoDeContenido(razon: string | null): string {
  switch (razon) {
    case 'pii:cedula':
      return CLAVE_DEL_RECHAZO_DE_CONTENIDO['pii:cedula']
    case 'pii:telefono':
      return CLAVE_DEL_RECHAZO_DE_CONTENIDO['pii:telefono']
    case 'pii:email':
      return CLAVE_DEL_RECHAZO_DE_CONTENIDO['pii:email']
    case 'pending_counsel:naira_desempeno_empleados':
      return CLAVE_DEL_RECHAZO_DE_CONTENIDO['pending_counsel:naira_desempeno_empleados']
    default: return CLAVE_DEL_RECHAZO_OTRO
  }
}

// fuente: 11-07-PLAN.md:403 (422 reason)
// estado: PLANIFICADO
export const RAZON_NO_PROMOVIBLE = 'no-promovible'

// ── Autor como TIPO (B-5): se lee solo la clase de quien escribió ──

export type AutorDeLaMemoria = 'naira' | 'equipo'

export function autorDelItem(escritoPor: NairaMemoryItem['writtenBy']): AutorDeLaMemoria {
  switch (escritoPor.kind) {
    case 'system':
      return 'naira'
    case 'user': return 'equipo'
    default: {
      const nunca: never = escritoPor
      return nunca
    }
  }
}

export const CLAVE_DEL_AUTOR = {
  naira: 'inmobiliaria.ai.naira.memoria.item.escritoPorNaira',
  equipo: 'inmobiliaria.ai.naira.memoria.item.escritoPorEquipo',
} as const satisfies Record<AutorDeLaMemoria, string>

// ── Qué se puede confirmar como cierto ──

export function esPromovible(item: NairaMemoryItem): boolean {
  // espejo de isPromotable, agent-account-manager src/naira/memory/promotion.ts:69, + solo contenido presente
  return item.provenance === 'inferred' && item.layer !== 'procedural' && item.content.kind === 'present'
}

// ── Filtros por capa y procedencia (validados contra el vocabulario; nunca reordenan) ──

export const FILTRO_SIN_ELEGIR = 'todas'

export interface FiltrosDeMemoria {
  readonly capa: (typeof PERSISTED_MEMORY_LAYERS)[number] | typeof FILTRO_SIN_ELEGIR
  readonly procedencia: (typeof PROVENANCE_KINDS)[number] | typeof FILTRO_SIN_ELEGIR
}

export const SIN_FILTROS: FiltrosDeMemoria = Object.freeze({ capa: FILTRO_SIN_ELEGIR, procedencia: FILTRO_SIN_ELEGIR })

/** Lo que viene de la URL: un valor fuera del vocabulario (o hostil) se ignora ⇒ 'todas'. */
export function leerFiltrosDeMemoria(capa: string | null, procedencia: string | null): FiltrosDeMemoria {
  const capaElegida = PERSISTED_MEMORY_LAYERS.find((c) => c === capa)
  const procedenciaElegida = PROVENANCE_KINDS.find((p) => p === procedencia)
  return { capa: capaElegida ?? FILTRO_SIN_ELEGIR, procedencia: procedenciaElegida ?? FILTRO_SIN_ELEGIR }
}

/** Filtra en el orden del servidor, sin reordenar. */
export function filtrarLaMemoria(items: readonly NairaMemoryItem[], filtros: FiltrosDeMemoria): readonly NairaMemoryItem[] {
  return items.filter(
    (item) =>
      (filtros.capa === FILTRO_SIN_ELEGIR || item.layer === filtros.capa) &&
      (filtros.procedencia === FILTRO_SIN_ELEGIR || item.provenance === filtros.procedencia),
  )
}

export function hayFiltros(filtros: FiltrosDeMemoria): boolean {
  return filtros.capa !== FILTRO_SIN_ELEGIR || filtros.procedencia !== FILTRO_SIN_ELEGIR
}

// ── Qué hace la UI después de escribir (el ÚNICO mapa) ──

export const OPERACIONES_DE_MEMORIA = ['corregir', 'borrar', 'promover', 'resolver'] as const
export type OperacionDeMemoria = (typeof OPERACIONES_DE_MEMORIA)[number]

export const AVISOS_DE_MEMORIA = [
  'item_cambio',
  'item_ya_no_esta',
  'ya_no_se_puede_confirmar',
  'propuesta_ya_resuelta',
  'propuesta_ya_no_esta',
  'sin_confirmar',
] as const
export type AvisoDeMemoria = (typeof AVISOS_DE_MEMORIA)[number]

export const CLAVE_DEL_AVISO = {
  item_cambio: 'inmobiliaria.ai.naira.memoria.avisos.item_cambio',
  item_ya_no_esta: 'inmobiliaria.ai.naira.memoria.avisos.item_ya_no_esta',
  ya_no_se_puede_confirmar: 'inmobiliaria.ai.naira.memoria.avisos.ya_no_se_puede_confirmar',
  propuesta_ya_resuelta: 'inmobiliaria.ai.naira.memoria.avisos.propuesta_ya_resuelta',
  propuesta_ya_no_esta: 'inmobiliaria.ai.naira.memoria.avisos.propuesta_ya_no_esta',
  sin_confirmar: 'inmobiliaria.ai.naira.memoria.avisos.sin_confirmar',
} as const satisfies Record<AvisoDeMemoria, string>

export type DesenlaceDeEscritura =
  | { readonly kind: 'hecho' }
  | { readonly kind: 'recargar'; readonly aviso: AvisoDeMemoria }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'rechazo_de_contenido'; readonly clave: string }
  | { readonly kind: 'reintentable' }

export type DesenlaceParaLaVista = Extract<DesenlaceDeEscritura, { readonly kind: 'hecho' | 'recargar' }>

function esRazonDeLaPantalla(razon: string | null): boolean {
  return MOTIVOS_DE_RECHAZO_DE_CONTENIDO.some((m) => m === razon)
}

/**
 * EstadoNaira de una escritura ⇒ qué hace la UI. Nunca copia la razón del servidor al resultado: solo un aviso cerrado o
 * una CLAVE i18n.
 */
export function desenlaceDeEscritura(operacion: OperacionDeMemoria, estado: EstadoNaira<unknown>): DesenlaceDeEscritura {
  switch (estado.kind) {
    case 'ok':
      return { kind: 'hecho' }
    case 'sin_permiso':
      return { kind: 'sin_permiso' }
    case 'conflicto': return { kind: 'recargar', aviso: operacion === 'resolver' ? 'propuesta_ya_resuelta' : 'item_cambio' }
    case 'no_encontrado':
    case 'apagada':
      return { kind: 'recargar', aviso: operacion === 'resolver' ? 'propuesta_ya_no_esta' : 'item_ya_no_esta' }
    case 'rechazado': {
      if (operacion === 'promover' && estado.razon === RAZON_NO_PROMOVIBLE) {
        return { kind: 'recargar', aviso: 'ya_no_se_puede_confirmar' }
      }
      if (operacion === 'borrar') return { kind: 'reintentable' }
      if (esRazonDeLaPantalla(estado.razon)) {
        return { kind: 'rechazo_de_contenido', clave: claveDelRechazoDeContenido(estado.razon) }
      }
      if (operacion === 'corregir') return { kind: 'rechazo_de_contenido', clave: CLAVE_DEL_RECHAZO_OTRO }
      return { kind: 'reintentable' }
    }
    case 'no_disponible':
      return { kind: 'reintentable' }
    case 'contrato_roto':
      return { kind: 'recargar', aviso: 'sin_confirmar' }
    default: {
      const nunca: never = estado
      return nunca
    }
  }
}

/** La copy del toast de una escritura hecha. */
export function claveDelHecho(operacion: OperacionDeMemoria, decision: 'confirm' | 'reject' | null): string {
  switch (operacion) {
    case 'corregir':
      return 'inmobiliaria.ai.naira.memoria.correccion.corregido'
    case 'borrar':
      return 'inmobiliaria.ai.naira.memoria.borrado.hecho'
    case 'promover':
      return 'inmobiliaria.ai.naira.memoria.promocion.hecho'
    case 'resolver':
      return decision === 'reject'
        ? 'inmobiliaria.ai.naira.memoria.propuestas.rechazada'
        : 'inmobiliaria.ai.naira.memoria.propuestas.confirmada'
    default: {
      const nunca: never = operacion
      return nunca
    }
  }
}

// ── Foco tras borrar ──

/** El siguiente ítem visible después del borrado; si era el último (o no está), null ⇒ el título. */
export function siguienteFocoTrasBorrar(ids: readonly string[], borrado: string): string | null {
  const i = ids.indexOf(borrado)
  return i < 0 || i + 1 >= ids.length ? null : ids[i + 1]
}

export const PREFIJO_DEL_ARTICULO_DE_MEMORIA = 'memoria-'

export function idDelArticuloDeMemoria(itemId: string): string {
  return PREFIJO_DEL_ARTICULO_DE_MEMORIA + itemId
}
