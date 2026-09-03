'use client'

/**
 * use-piloto-badge.ts — el número del sidebar para «Piloto».
 *
 * Lee SOLO el `total` de GET /api/agency/{agencyId}/ai-hub/inbox, cada 60s.
 *
 * Mismas reglas que use-postulaciones-pendientes.ts, que son las que hacen
 * que un contador sirva:
 *   · El número sale del backend, nunca de una constante.
 *   · Si falla (o el endpoint no existe todavía), NO hay indicador —
 *     `undefined`, no un cero: un cero afirma «no hay nada esperando»,
 *     y eso es justo lo que no sabemos.
 *   · Cero es cero y tampoco se pinta (PlanSidebar oculta badge ≤ 0).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoInbox } from '@/lib/api/piloto'

const REFRESCO_MS = 60_000

export function usePilotoBadge(): { total: number | undefined } {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [total, setTotal] = useState<number | undefined>(undefined)

  const cargar = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) return
    try {
      const res = await fetchPilotoInbox(agencyId)
      // 404 (endpoint aún no publicado) → data null → sin indicador.
      setTotal(res.data?.total ?? undefined)
    } catch {
      // Sin dato no se inventa uno. El menú simplemente no dice nada.
      setTotal(undefined)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    void cargar()
    const id = setInterval(() => void cargar(), REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar, agencyId])

  return { total }
}
