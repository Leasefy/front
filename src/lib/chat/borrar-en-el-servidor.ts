/**
 * «Borrar conversación» borra también el servidor (Nico, 04-10-2026 00:27:
 * «las preguntas se guardan 12 meses en el servidor; borrar conversación borra
 * también el servidor»).
 *
 * Hasta hoy el botón sólo sacaba la conversación del `localStorage`: la
 * pregunta seguía en el micro (las señales del cerebro, el pulgar, la memoria
 * del chat y Redis). Ahora, además, se le pide al micro que borre lo suyo:
 * `POST /api/agency/{agencyId}/ai-hub/chat/conversacion/borrar` con los
 * `turnoId` de la conversación (los que devolvió cada respuesta), los ids de
 * sus mensajes y sus preguntas. El micro sólo borra lo de la persona del token.
 *
 * Fuego y olvido, como las señales: la conversación ya se fue de la pantalla;
 * si el micro no está, no se le dice nada a nadie. Sale DENTRO de un momento
 * (la misma espera de las señales): el micro anota el turno ~0,7 s después del
 * `done` y un borrado que llega antes dejaría vivo lo que se anota después.
 */

import { agentFetch } from '@/lib/api/agent-fetch'
import { ESPERA_AL_REGISTRO_DEL_TURNO_MS } from '@/lib/chat/senales'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOPE_TURNOS = 200
const TOPE_TEXTO = 2000

interface MensajeDeLaConversacion {
  id?: string
  role: string
  content?: string
  turnoId?: string
}

export interface CuerpoDelBorrado {
  turnoIds: string[]
  mensajeIds: string[]
  preguntas: string[]
}

/** Pura: lo que se manda para borrar una conversación. `null` si no hay nada que borrar. */
export function cuerpoDelBorrado(mensajes: readonly MensajeDeLaConversacion[]): CuerpoDelBorrado | null {
  const turnoIds = [...new Set(mensajes.map((m) => m.turnoId).filter((t): t is string => !!t && UUID_RE.test(t)))].slice(0, TOPE_TURNOS)
  const mensajeIds = [...new Set(mensajes.map((m) => m.id).filter((i): i is string => !!i && i.length <= 200))].slice(0, TOPE_TURNOS * 2)
  const preguntas = mensajes
    .filter((m) => m.role === 'user' && typeof m.content === 'string' && m.content.trim())
    .map((m) => (m.content as string).slice(0, TOPE_TEXTO))
    .slice(-TOPE_TURNOS)
  if (turnoIds.length === 0 && preguntas.length === 0) return null
  return { turnoIds, mensajeIds, preguntas }
}

/** La URL de la ruta, o `null` si el micro no está configurado en este build. */
export function urlDelBorrado(agencyId: string): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base || !agencyId) return null
  return `${base}/api/agency/${agencyId}/ai-hub/chat/conversacion/borrar`
}

let espera = ESPERA_AL_REGISTRO_DEL_TURNO_MS

/** Pide al micro borrar la conversación. Nunca lanza. Devuelve si quedó programado. */
export function borrarConversacionEnElServidor(
  agencyId: string | null | undefined,
  mensajes: readonly MensajeDeLaConversacion[],
): boolean {
  try {
    if (!agencyId) return false
    const url = urlDelBorrado(agencyId)
    const cuerpo = cuerpoDelBorrado(mensajes)
    if (!url || !cuerpo) return false
    setTimeout(() => {
      void agentFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
        keepalive: true,
      }).catch(() => undefined)
    }, espera)
    return true
  } catch {
    return false
  }
}

/** Sólo pruebas: cambia la espera. */
export function __esperaDelBorradoParaPruebas(ms: number = ESPERA_AL_REGISTRO_DEL_TURNO_MS): void {
  espera = ms
}
