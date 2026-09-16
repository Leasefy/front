'use client'

/**
 * use-piloto-badge.ts — el número del sidebar para «Piloto».
 *
 * Antes pedía GET /api/agency/{agencyId}/ai-hub/inbox por su cuenta, cada
 * 60s, DUPLICANDO el poll de `usePilotoInbox` cuando ambos están montados
 * (sidebar en el layout + bandeja en /panel/inmobiliaria/piloto). Ahora lee
 * el mismo dato compartido (`piloto-inbox-context.tsx`, un fetch/timer para
 * los dos) — T-0082 contract.md §8: call-site merge, sin wire nuevo, sin
 * cambiar el shape público de este hook.
 *
 * Mismas reglas que use-postulaciones-pendientes.ts, que son las que hacen
 * que un contador sirva:
 *   · El número sale del backend, nunca de una constante.
 *   · Si falla (o el endpoint no existe todavía), NO hay indicador —
 *     `undefined`, no un cero: un cero afirma «no hay nada esperando»,
 *     y eso es justo lo que no sabemos.
 *   · Cero es cero y tampoco se pinta (PlanSidebar oculta badge ≤ 0).
 */

import { usePilotoInboxCompartido } from './piloto-inbox-context'

export function usePilotoBadge(): { total: number | undefined } {
  const shared = usePilotoInboxCompartido()
  // undefined mientras no hay una respuesta firme: primera carga en vuelo,
  // bandeja no publicada (404 → notAvailable) o el poll falló — en los tres
  // casos "no sabemos", así que no se pinta un número.
  const sinRespuestaFirme = shared.isLoading || shared.notAvailable || shared.error !== null
  return { total: sinRespuestaFirme ? undefined : shared.data?.total }
}
