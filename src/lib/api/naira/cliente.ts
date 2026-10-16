'use client'

/**
 * cliente.ts — la ÚNICA puerta del front a Naira (Fase 13, plan 13-01).
 *
 * Toda llamada pasa por UN transporte interno (`pedirANaira`) sobre `agentFetch` (Authorization del agente y reintento
 * SOLO del 401; el 403 llega tal cual) y devuelve un `EstadoNaira` CERRADO. Nunca tira: cualquier cosa que salga mal es
 * un `kind`, no una excepción.
 *
 * Orden del transporte (cada paso corta):
 *   1. `agencyId` vacío ⇒ `no_disponible`; un parámetro de ruta vacío ⇒ `no_encontrado` (sin red).
 *   2. La guarda del modo simulado (`isMockMode()` de src/lib/api/config.ts: nunca en producción, opt-in fuera de ella)
 *      ⇒ el ejemplo de ese endpoint con `origen: 'ejemplo'`, sin red. Es la PRIMERA decisión de red y la única: el
 *      simulado jamás se sirve dentro de un `catch` (como hacía el retencion.ts anterior a 5b2e35d8) ni por falta de la
 *      URL del agente (el antipatrón de funnel.service.ts:27).
 *   3. Sin `NEXT_PUBLIC_AGENT_URL` ⇒ `no_disponible`. `agentFetch` que rechaza (red) ⇒ `no_disponible`.
 *   4. 403 ⇒ `sin_permiso` (con o sin `reason`: el 403 del middleware de roles no la trae; el tipo no admite datos).
 *      404 ⇒ `apagada` si su `reason` es `naira_no_habilitada` (E13-7); si no, el `si404` de su fila (heurística del §3.1).
 *      409 ⇒ `conflicto` con su `reason`; 400 y 422 ⇒ `rechazado` con su `reason`; cualquier otro no-2xx (401 tras el
 *      reintento, 429, 5xx…) ⇒ `no_disponible` (sin backoff: Naira no reintenta, P5).
 *   5. 2xx ⇒ el cuerpo pasa por el esquema TOLERANTE de su endpoint, todo o nada: `ok` con `origen: 'agente'` o
 *      `contrato_roto` sin un solo campo.
 *
 * El `error` del agente (prosa, a veces en inglés, a veces con el texto rechazado) NUNCA se copia a un estado: solo su
 * `reason`, que es un vocabulario cerrado. Los cuerpos POST se validan ANTES de la red con su esquema de pedido
 * ⇒ `rechazado{ razon: 'pedido_invalido' }` sin red. Nada se persiste en el navegador.
 */

import { agentFetch } from '@/lib/api/agent-fetch'
import { isMockMode } from '@/lib/api/config'
import {
  ENDPOINTS_DE_NAIRA,
  ESQUEMAS_ESTRICTOS_DE_NAIRA,
  NAIRA_BASE,
  NairaErrorSchema,
  RAZON_NAIRA_NO_HABILITADA,
  RESPUESTA_TOLERANTE_POR_ENDPOINT,
  type IdDeEndpoint,
  type NairaActionDecisionRequest,
  type NairaActionDecisionResult,
  type NairaActionDetail,
  type NairaActionsList,
  type NairaBriefingDay,
  type NairaConversationAnswer,
  type NairaMemoryErasureRequest,
  type NairaMemoryErasureResult,
  type NairaMemoryResolutionRequest,
  type NairaMemoryResolutionResult,
  type NairaMemoryView,
  type NairaMemoryWriteResult,
  type NairaOpenLoopDetail,
  type NairaOpenLoopsList,
  type NairaRecallRequest,
  type NairaRecallResult,
  type NairaSignalDetail,
  type NairaSignalFeedbackRequest,
  type NairaSignalFeedbackResult,
  type NairaAuthorizedTeam,
  type NairaManagementAuthorization,
  type NairaPersonSheet,
  type NairaWhatsappCode,
  type NairaWhatsappConsent,
  type NairaTaskCancelResult,
  type NairaTasksList,
  type RespuestasDeNaira,
} from './contrato'

export type EstadoNaira<T> =
  | { readonly kind: 'ok'; readonly data: T; readonly origen: 'agente' | 'ejemplo' }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'apagada' }
  | { readonly kind: 'no_encontrado' }
  | { readonly kind: 'conflicto'; readonly razon: string | null }
  | { readonly kind: 'rechazado'; readonly razon: string | null }
  | { readonly kind: 'no_disponible' }
  | { readonly kind: 'contrato_roto' }

export const KINDS_DE_ESTADO_NAIRA = ['ok', 'sin_permiso', 'apagada', 'no_encontrado', 'conflicto', 'rechazado', 'no_disponible', 'contrato_roto'] as const

/** La razón de un cuerpo que el front armó y no pasa su esquema de pedido (se rechaza SIN red). */ // +
export const RAZON_PEDIDO_INVALIDO = 'pedido_invalido'

const PEDIDO_INVALIDO = { kind: 'rechazado', razon: RAZON_PEDIDO_INVALIDO } as const

/**
 * Los cuerpos que ARMA el front se validan con el árbol estricto (P6): una clave de más en un cuerpo es un error del
 * llamador y el agente valida algunos con `.strict()`. Las RESPUESTAS jamás se parsean con este árbol.
 */
const PEDIDOS = ESQUEMAS_ESTRICTOS_DE_NAIRA

/** El `reason` de un cuerpo de error del agente, o `null`. Jamás el `error`. */
async function razonDelError(res: Response): Promise<string | null> {
  const cuerpo: unknown = await res.json().catch(() => null)
  const r = NairaErrorSchema.safeParse(cuerpo)
  if (!r.success) return null
  return typeof r.data.reason === 'string' ? r.data.reason : null
}

/** El ejemplo de un endpoint (modo simulado): import dinámico, fuera del chunk principal, y el MISMO parseo. */
async function ejemploDe<K extends IdDeEndpoint>(id: K): Promise<EstadoNaira<RespuestasDeNaira[K]>> {
  const { EJEMPLOS_DE_NAIRA } = await import('@/lib/data/mock-naira')
  const ejemplo = RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(EJEMPLOS_DE_NAIRA[id])
  return ejemplo.success ? { kind: 'ok', data: ejemplo.data, origen: 'ejemplo' } : { kind: 'contrato_roto' }
}

interface OpcionesDelPedido {
  /** Ya validado con su esquema de pedido. `undefined` = sin cuerpo. */
  readonly cuerpo?: unknown
  /** Query ya codificada, con su `?` (solo el briefing la usa). */
  readonly query?: string
}

/** El transporte ÚNICO. Ver el orden en la cabecera. */
async function pedirANaira<K extends IdDeEndpoint>(
  id: K,
  agencyId: string,
  params: Readonly<Record<string, string>>,
  opciones: OpcionesDelPedido = {},
): Promise<EstadoNaira<RespuestasDeNaira[K]>> {
  if (agencyId.trim() === '') return { kind: 'no_disponible' }
  if (Object.values(params).some((valor) => valor.trim() === '')) return { kind: 'no_encontrado' }
  if (isMockMode()) return ejemploDe(id)
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) return { kind: 'no_disponible' }

  const fila = ENDPOINTS_DE_NAIRA[id]
  let ruta = fila.ruta
  for (const [nombre, valor] of Object.entries(params)) {
    // Un id con `/`, `?` o `..` no puede cambiar el endpoint.
    ruta = ruta.split('{' + nombre + '}').join(encodeURIComponent(valor))
  }
  const url = base.replace(/\/+$/, '') + NAIRA_BASE.split('{agencyId}').join(encodeURIComponent(agencyId)) + ruta + (opciones.query ?? '')

  const init: RequestInit =
    opciones.cuerpo === undefined
      ? { method: fila.metodo }
      : { method: fila.metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(opciones.cuerpo) }

  let res: Response
  try {
    res = await agentFetch(url, init)
  } catch {
    return { kind: 'no_disponible' }
  }

  if (res.status === 403) return { kind: 'sin_permiso' }
  if (res.status === 404) {
    if ((await razonDelError(res)) === RAZON_NAIRA_NO_HABILITADA) return { kind: 'apagada' }
    return { kind: fila.si404 }
  }
  if (res.status === 409) return { kind: 'conflicto', razon: await razonDelError(res) }
  if (res.status === 400 || res.status === 422) return { kind: 'rechazado', razon: await razonDelError(res) }
  if (!res.ok) return { kind: 'no_disponible' }

  let crudo: unknown
  try {
    crudo = await res.json()
  } catch {
    return { kind: 'contrato_roto' }
  }
  const r = RESPUESTA_TOLERANTE_POR_ENDPOINT[id].safeParse(crudo)
  if (!r.success) return { kind: 'contrato_roto' }
  return { kind: 'ok', data: r.data, origen: 'agente' }
}

// ── Memoria ──

export async function leerMemoria(agencyId: string): Promise<EstadoNaira<NairaMemoryView>> {
  return pedirANaira('memoria.vista', agencyId, {})
}

export async function corregirItem(agencyId: string, itemId: string, text: string): Promise<EstadoNaira<NairaMemoryWriteResult>> {
  const cuerpo = PEDIDOS.NairaMemoryCorrectionRequest.safeParse({ text })
  if (!cuerpo.success) return PEDIDO_INVALIDO
  return pedirANaira('memoria.corregir', agencyId, { itemId }, { cuerpo: cuerpo.data })
}

export async function borrarItem(agencyId: string, itemId: string, motivo: NairaMemoryErasureRequest['motivo']): Promise<EstadoNaira<NairaMemoryErasureResult>> {
  const cuerpo = PEDIDOS.NairaMemoryErasureRequest.safeParse({ motivo })
  if (!cuerpo.success) return PEDIDO_INVALIDO
  return pedirANaira('memoria.borrar', agencyId, { itemId }, { cuerpo: cuerpo.data })
}

export async function resolverPropuestaProcedural(agencyId: string, proposalId: string, decision: NairaMemoryResolutionRequest['decision']): Promise<EstadoNaira<NairaMemoryResolutionResult>> {
  const cuerpo = PEDIDOS.NairaMemoryResolutionRequest.safeParse({ decision })
  if (!cuerpo.success) return PEDIDO_INVALIDO
  return pedirANaira('memoria.resolverPropuesta', agencyId, { proposalId }, { cuerpo: cuerpo.data })
}

/** POST sin cuerpo: el contrato no declara ninguno (11-07). */
export async function promoverItem(agencyId: string, itemId: string): Promise<EstadoNaira<NairaMemoryWriteResult>> {
  return pedirANaira('memoria.promover', agencyId, { itemId })
}

// ── Conversación ──

export async function preguntarANaira(agencyId: string, question: string): Promise<EstadoNaira<NairaConversationAnswer>> {
  const cuerpo = PEDIDOS.NairaConversationQuestionRequest.safeParse({ question })
  if (!cuerpo.success) return PEDIDO_INVALIDO
  return pedirANaira('conversacion.preguntar', agencyId, {}, { cuerpo: cuerpo.data })
}

// ── Briefing, señal, recall y voto ──

export async function leerBriefing(agencyId: string, dia?: string): Promise<EstadoNaira<NairaBriefingDay>> {
  return pedirANaira('briefing.dia', agencyId, {}, { query: dia ? '?dia=' + encodeURIComponent(dia) : '' })
}

/** P2: si quien llama autorizó recibir el briefing por WhatsApp, con el texto que aceptaría. */
export async function leerConsentimientoWhatsapp(agencyId: string): Promise<EstadoNaira<NairaWhatsappConsent>> {
  return pedirANaira('whatsapp.consentimiento', agencyId, {})
}

/** P2: autorizar o retirar el briefing por WhatsApp (siempre de quien llama). */
export async function guardarConsentimientoWhatsapp(agencyId: string, otorgar: boolean): Promise<EstadoNaira<NairaWhatsappConsent>> {
  return pedirANaira('whatsapp.consentir', agencyId, {}, { cuerpo: { otorgar } })
}

/** P3: la autorización de quien llama para que Naira le atribuya datos de su gestión. */
export async function leerAutorizacionDeGestion(agencyId: string): Promise<EstadoNaira<NairaManagementAuthorization>> {
  return pedirANaira('persona.autorizacion', agencyId, {})
}

/** P3: autorizar o retirar (siempre de quien llama); al retirarla, lo atribuido se borra en el micro. */
export async function guardarAutorizacionDeGestion(agencyId: string, autorizar: boolean): Promise<EstadoNaira<NairaManagementAuthorization>> {
  return pedirANaira('persona.autorizar', agencyId, {}, { cuerpo: { autorizar } })
}

/** P3: «Qué dice Naira de mí». */
export async function leerFichaPropia(agencyId: string): Promise<EstadoNaira<NairaPersonSheet>> {
  return pedirANaira('persona.deMi', agencyId, {})
}

/** P3: quiénes del equipo autorizaron (dueño, admin y gerente). */
export async function leerEquipoQueAutorizo(agencyId: string): Promise<EstadoNaira<NairaAuthorizedTeam>> {
  return pedirANaira('persona.equipo', agencyId, {})
}

/** P3: la ficha de una persona del equipo que autorizó. */
export async function leerFichaDe(agencyId: string, userId: string): Promise<EstadoNaira<NairaPersonSheet>> {
  return pedirANaira('persona.ficha', agencyId, { userId })
}

/** #13: un código de seis dígitos para que Naira responda cualquier pregunta por WhatsApp (se muestra una sola vez). */
export async function pedirCodigoWhatsapp(agencyId: string): Promise<EstadoNaira<NairaWhatsappCode>> {
  return pedirANaira('whatsapp.codigo', agencyId, {})
}

export async function leerSenal(agencyId: string, promocionId: string): Promise<EstadoNaira<NairaSignalDetail>> {
  return pedirANaira('senal.detalle', agencyId, { promocionId })
}

export async function responderRecall(agencyId: string, cuerpo: NairaRecallRequest): Promise<EstadoNaira<NairaRecallResult>> {
  const pedido = PEDIDOS.NairaRecallRequest.safeParse(cuerpo)
  if (!pedido.success) return PEDIDO_INVALIDO
  return pedirANaira('recall.responder', agencyId, {}, { cuerpo: pedido.data })
}

export async function votarSenal(agencyId: string, promocionId: string, valor: NairaSignalFeedbackRequest['valor']): Promise<EstadoNaira<NairaSignalFeedbackResult>> {
  const cuerpo = PEDIDOS.NairaSignalFeedbackRequest.safeParse({ valor })
  if (!cuerpo.success) return PEDIDO_INVALIDO
  return pedirANaira('senal.voto', agencyId, { promocionId }, { cuerpo: cuerpo.data })
}

// ── Seguimiento ──

export async function leerSeguimiento(agencyId: string): Promise<EstadoNaira<NairaOpenLoopsList>> {
  return pedirANaira('seguimiento.lista', agencyId, {})
}

export async function leerLoop(agencyId: string, loopId: string): Promise<EstadoNaira<NairaOpenLoopDetail>> {
  return pedirANaira('seguimiento.detalle', agencyId, { loopId })
}

// ── Acciones y tareas ──

export async function leerPropuestas(agencyId: string): Promise<EstadoNaira<NairaActionsList>> {
  return pedirANaira('acciones.lista', agencyId, {})
}

/** Registra «presentada» en el agente: se llama SOLO al abrir la ficha (13-05, E13-12). */
export async function leerPropuesta(agencyId: string, proposalId: string): Promise<EstadoNaira<NairaActionDetail>> {
  return pedirANaira('acciones.detalle', agencyId, { proposalId })
}

export async function decidirPropuesta(agencyId: string, proposalId: string, cuerpo: NairaActionDecisionRequest): Promise<EstadoNaira<NairaActionDecisionResult>> {
  const pedido = PEDIDOS.NairaActionDecisionRequest.safeParse(cuerpo)
  if (!pedido.success) return PEDIDO_INVALIDO
  return pedirANaira('acciones.decidir', agencyId, { proposalId }, { cuerpo: pedido.data })
}

export async function leerTareas(agencyId: string): Promise<EstadoNaira<NairaTasksList>> {
  return pedirANaira('tareas.lista', agencyId, {})
}

/** POST sin cuerpo: el contrato no declara ninguno (12-07). */
export async function cancelarTarea(agencyId: string, tareaId: string): Promise<EstadoNaira<NairaTaskCancelResult>> {
  return pedirANaira('tareas.cancelar', agencyId, { tareaId })
}
