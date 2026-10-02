import type { AgentOrbState } from '@leasefy/cadence'

import type {
  AgentExecution,
  AgentExecutionStatus,
  ChatMessage,
  TurnStep,
  TurnStepStatus,
} from '@/lib/types/beta-chat'

import { agenteDelDespacho, orquestador, type AgenteDelEquipo } from './equipo'

/**
 * ══ QUIÉN HABLA EN EL CHAT — DE LOS EVENTOS DEL MICRO AL EQUIPO ═══════════
 *
 * El orquestador ES quien responde en el chat (decisión de Nico, 02-10-2026).
 * Cuando necesita a un especialista se lo «pasa»: el micro lo dice con
 * `dispatch_start` / `tool_step` / `dispatch_result` (la clave en `agent`),
 * y el front lo guarda como `AgentExecution` en `mensaje.agentActivity` y, en
 * el turno en curso, como `TurnStep` (`kind: 'agente' | 'herramienta'`).
 *
 * Esto es PURO: no pinta nada ni pide nada. Lo leen el orbe del chat y quien
 * arme la tarjeta de delegación.
 *
 * ── Lo que el micro NO manda (bugs-nico-1) ──────────────────────────────────
 *
 *   · Ningún evento dice «responde el orquestador»: se deduce (el texto del
 *     turno siempre es suyo; los especialistas sólo devuelven un resumen).
 *   · El razonamiento («cómo lo pensó») no sale del micro: la ruta analítica
 *     pide pensamiento extendido y lo descarta. Por eso `razonamiento` es
 *     `null` salvo que el mensaje traiga el campo aditivo `razonamiento`
 *     (propuesta de cambio mínimo en el micro, ver el informe del 02-10).
 *     Nunca se rellena con los pasos ni con texto inventado.
 *   · No hay id por despacho: dos despachos al mismo especialista en un turno
 *     se distinguen por orden.
 */

/** Los estados del orbe, como se dicen en el producto. */
export type EstadoDelOrbe =
  | 'quieto'
  | 'pensando'
  | 'trabajando'
  | 'hablando'
  | 'listo'
  | 'fallo'
  | 'apagado'

/** Estado del producto → estado del orbe de Cadence. */
export const ESTADO_DEL_ORBE: Record<EstadoDelOrbe, AgentOrbState> = {
  quieto: 'idle',
  pensando: 'thinking',
  trabajando: 'working',
  hablando: 'working',
  listo: 'ready',
  fallo: 'failed',
  apagado: 'off',
}

/** Un paso de razonamiento, si el micro lo manda (campo aditivo propuesto). */
export interface PasoDeRazonamiento {
  /** Quién lo pensó: clave de despacho o `orquestador`. Ausente = el orquestador. */
  agente?: string
  texto: string
}

/**
 * El mensaje como lo podría traer un chat que ya guarda el razonamiento. No
 * se toca `ChatMessage` (lo dueña la conversación): el campo se lee si está.
 */
export type MensajeDelChat = ChatMessage & { razonamiento?: unknown }

/**
 * La ejecución como la puede guardar el chat con el resumen del especialista.
 * El micro YA lo manda (`dispatch_result.dispatch.summary` y
 * `done.dispatches[].summary`), pero `useBetaChat` hoy no lo guarda en la
 * `AgentExecution`: si lo guarda como `resumen`, aquí se lee.
 */
export type EjecucionDelChat = AgentExecution & { resumen?: unknown }

function resumenDe(e: AgentExecution | undefined): string | undefined {
  const r = (e as EjecucionDelChat | undefined)?.resumen
  return typeof r === 'string' && r.trim() ? r.trim() : undefined
}

export interface PasoDelEspecialista {
  texto: string
  estado: TurnStepStatus
  repeticiones?: number
}

export interface Delegacion {
  /** El agente del equipo; `null` si la clave no es de nadie (se pinta como el orquestador). */
  agente: AgenteDelEquipo | null
  /** La clave tal cual la mandó el micro (`cobranza`, `avaluo`, `reportes`…). */
  clave: string
  estado: EstadoDelOrbe
  /** La tarea que el orquestador le escribió. */
  tarea: string
  /**
   * El resumen con que contestó: en el turno en curso, el del paso; en un
   * mensaje cerrado, el `resumen` de la ejecución si el chat lo guardó.
   */
  resumen?: string
  /** Por qué falló, si falló. */
  error?: string
  /** Sus herramientas, en orden, tal como el micro las reportó. */
  pasos: PasoDelEspecialista[]
}

export interface LecturaDelTurno {
  orquestador: { agente: AgenteDelEquipo; estado: EstadoDelOrbe }
  delegaciones: Delegacion[]
  /** El que está actuando AHORA: el especialista que corre o el orquestador. */
  hablaAhora: AgenteDelEquipo
  /** `null` = el micro no lo mandó. Nunca se rellena. */
  razonamiento: PasoDeRazonamiento[] | null
}

function estadoDeLaEjecucion(s: AgentExecutionStatus): EstadoDelOrbe {
  switch (s) {
    case 'dispatching':
      return 'pensando'
    case 'running':
      return 'trabajando'
    case 'completed':
      return 'listo'
    case 'failed':
      return 'fallo'
  }
}

function estadoDelPaso(s: TurnStepStatus): EstadoDelOrbe {
  switch (s) {
    case 'pending':
      return 'pensando'
    case 'running':
      return 'trabajando'
    case 'done':
      return 'listo'
    case 'failed':
      return 'fallo'
  }
}

/** El agente de una ejecución del chat (`AgentExecution`). */
export function agenteDeLaEjecucion(e: Pick<AgentExecution, 'agentType'>): AgenteDelEquipo | null {
  return agenteDelDespacho(e.agentType)
}

/** El razonamiento del mensaje, si llegó con la forma esperada. Lo demás es «no llegó». */
export function leerRazonamiento(v: unknown): PasoDeRazonamiento[] | null {
  if (typeof v === 'string') return v.trim() ? [{ texto: v.trim() }] : null
  if (!Array.isArray(v)) return null
  const pasos = v
    .map((p): PasoDeRazonamiento | null => {
      if (typeof p === 'string') return p.trim() ? { texto: p.trim() } : null
      if (!p || typeof p !== 'object') return null
      const { texto, agente } = p as Record<string, unknown>
      if (typeof texto !== 'string' || !texto.trim()) return null
      return { texto: texto.trim(), ...(typeof agente === 'string' && agente ? { agente } : {}) }
    })
    .filter((p): p is PasoDeRazonamiento => p !== null)
  return pasos.length > 0 ? pasos : null
}

/**
 * Las delegaciones del turno EN CURSO, armadas con los pasos (`TurnStep`) tal
 * como los arma `useBetaChat`:
 *   · el paso `agente` (id = id de la `AgentExecution`) lleva la TAREA en
 *     `detail` mientras corre, y al cerrar se reemplaza por el RESUMEN del
 *     especialista. Por eso la tarea se toma de la ejecución del mensaje
 *     (mismo id) cuando está, y `detail` es resumen sólo si el paso cerró;
 *   · los pasos `herramienta` llegan SIN `agentType` (el hook no lo guarda):
 *     son del último especialista abierto antes de ellos.
 */
function delegacionesDeLosPasos(pasos: readonly TurnStep[], m: ChatMessage | null): Delegacion[] {
  const ejecuciones = new Map((m?.agentActivity?.agents ?? []).map((e) => [e.id, e]))
  const out: Delegacion[] = []
  for (const p of pasos) {
    if (p.kind === 'agente' && p.agentType) {
      const e = ejecuciones.get(p.id)
      const cerrado = p.status === 'done' || p.status === 'failed'
      const tarea = e?.taskDescription ?? (cerrado ? '' : p.detail ?? '')
      const resumen = p.status === 'done' && p.detail && p.detail !== tarea ? p.detail : p.status === 'done' ? resumenDe(e) : undefined
      out.push({
        agente: agenteDelDespacho(p.agentType),
        clave: p.agentType,
        estado: estadoDelPaso(p.status),
        tarea,
        ...(resumen ? { resumen } : {}),
        ...(p.status === 'failed' ? { error: e?.error ?? p.detail ?? '' } : {}),
        pasos: [],
      })
    } else if (p.kind === 'herramienta') {
      const duena = p.agentType
        ? [...out].reverse().find((d) => d.clave === p.agentType)
        : out[out.length - 1]
      if (duena) {
        duena.pasos.push({
          texto: p.label ?? '',
          estado: p.status,
          ...(p.repeticiones ? { repeticiones: p.repeticiones } : {}),
        })
      }
    }
  }
  return out
}

/** Las delegaciones de un mensaje ya cerrado (`agentActivity.agents`). */
function delegacionesDelMensaje(m: ChatMessage): Delegacion[] {
  return (m.agentActivity?.agents ?? []).map((e) => {
    const resumen = e.status === 'completed' ? resumenDe(e) : undefined
    return {
      agente: agenteDeLaEjecucion(e),
      clave: e.agentType,
      estado: estadoDeLaEjecucion(e.status),
      tarea: e.taskDescription,
      ...(resumen ? { resumen } : {}),
      ...(e.status === 'failed' && e.error ? { error: e.error } : {}),
      pasos: [],
    }
  })
}

/**
 * El estado del orquestador en este mensaje:
 *   · el mensaje falló                       → `fallo`
 *   · un especialista trabaja                → `pensando` (espera y decide)
 *   · está escribiendo (status `streaming`)  → `hablando`
 *   · enviando / entendiendo                 → `pensando`
 *   · terminado                              → `listo`
 */
function estadoDelOrquestador(m: ChatMessage | null, enCurso: boolean, delegaciones: Delegacion[], pasos: readonly TurnStep[]): EstadoDelOrbe {
  if (m?.status === 'error') return 'fallo'
  const alguienTrabaja = delegaciones.some((d) => d.estado === 'trabajando' || d.estado === 'pensando')
  if (enCurso) {
    if (alguienTrabaja) return 'pensando'
    const redactando = pasos.some((p) => p.kind === 'redactar' && p.status === 'running')
    if (redactando || (m?.status === 'streaming' && (m.content?.length ?? 0) > 0)) return 'hablando'
    return 'pensando'
  }
  if (m?.status === 'streaming' || m?.status === 'sending') return 'hablando'
  return 'listo'
}

export interface EntradaDelTurno {
  /** El mensaje del asistente (o `null` si todavía no existe). */
  mensaje: MensajeDelChat | null
  /** Los pasos del turno en curso (`useBetaChat().turnSteps`). Vacío para un mensaje viejo. */
  pasos?: readonly TurnStep[]
  /** ¿Este mensaje es el turno que está corriendo ahora? */
  enCurso?: boolean
}

/**
 * Quién habla, a quién le pasó el trabajo y en qué estado está cada uno.
 * Con pasos (turno en curso) manda lo que dicen los pasos; sin ellos, lo que
 * guardó el mensaje.
 */
export function leerElTurno({ mensaje, pasos = [], enCurso = false }: EntradaDelTurno): LecturaDelTurno {
  const delPaso = enCurso ? delegacionesDeLosPasos(pasos, mensaje) : []
  const delegaciones = delPaso.length > 0 ? delPaso : mensaje ? delegacionesDelMensaje(mensaje) : []
  const ori = orquestador()
  const estado = estadoDelOrquestador(mensaje, enCurso, delegaciones, pasos)
  const activa = [...delegaciones].reverse().find((d) => d.estado === 'trabajando' && d.agente)
  return {
    orquestador: { agente: ori, estado },
    delegaciones,
    hablaAhora: activa?.agente ?? ori,
    razonamiento: leerRazonamiento(mensaje?.razonamiento),
  }
}
