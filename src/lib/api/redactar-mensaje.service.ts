/**
 * «Escribir con IA» en Mensajes (Juan, Portofino, 15-10-2026; Nico: «Tú, por
 * fases»). Pide al micro UN borrador para el hilo abierto
 * (`POST /api/agency/{agencyId}/mensajes/redactar`). No envía nada: el texto
 * va al campo del chat y la persona lo revisa.
 *
 * Al micro, SIEMPRE `agentFetch` (guardián `micro-por-agent-fetch`); un fallo
 * sale como `ApiError` de `falloDelMicro` y la pantalla lo dice con
 * `mensajeParaLaPersona`.
 */

import { agentFetch } from './agent-fetch'
import { ApiError } from './client'
import { falloDelMicro } from './fallo-del-micro'
import type { components } from './generated/agent'

export type PedidoDeRedaccion = components['schemas']['PedidoDeRedaccionDeMensaje']
export type MensajeRedactado = components['schemas']['MensajeRedactado']

/** Cuántos mensajes del hilo viajan: los últimos (el micro usa hasta 30). */
export const MENSAJES_QUE_VIAJAN = 30

export async function redactarMensaje(agencyId: string, pedido: PedidoDeRedaccion): Promise<MensajeRedactado> {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) {
    throw new ApiError(503, 'Escribir con IA no está disponible en este momento.', 'REDACCION_NO_DISPONIBLE')
  }
  const res = await agentFetch(`${base}/api/agency/${encodeURIComponent(agencyId)}/mensajes/redactar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...pedido, mensajes: (pedido.mensajes ?? []).slice(-MENSAJES_QUE_VIAJAN) }),
  })
  if (!res.ok) throw await falloDelMicro(res)
  return (await res.json()) as MensajeRedactado
}
