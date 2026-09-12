'use client'

/**
 * use-piloto-inbox.ts — la bandeja única priorizada del Piloto automático.
 *
 *   GET /api/agency/{agencyId}/ai-hub/inbox
 *   → { items: InboxItem[], total, porPrioridad: {alta,media,baja} }
 *
 * El fetch/poll de 60s vive en `piloto-inbox-context.tsx`, compartido con
 * `usePilotoBadge` (el número del sidebar necesita el mismo dato) — antes
 * cada hook pedía este endpoint por su cuenta, duplicando la petición cuando
 * ambos estaban montados a la vez (T-0082 contract.md §8: call-site merge,
 * sin wire nuevo). Este hook solo adapta la lectura compartida a su shape
 * público de siempre; nada cambió para quien lo consume
 * (`/panel/inmobiliaria/piloto/page.tsx`).
 *
 * 404 → `notAvailable` (bandeja aún no publicada), NO error.
 */

import { usePilotoInboxCompartido } from './piloto-inbox-context'
import type { InboxItem } from '@/lib/api/piloto'

const POR_PRIORIDAD_VACIO = { alta: 0, media: 0, baja: 0 }

export interface UsePilotoInboxResult {
  items: InboxItem[]
  total: number
  porPrioridad: { alta: number; media: number; baja: number }
  isLoading: boolean
  error: string | null
  /** Backend 404 — la bandeja aún no está publicada (no es un error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoInbox(): UsePilotoInboxResult {
  const shared = usePilotoInboxCompartido()
  return {
    items: shared.data?.items ?? [],
    total: shared.data?.total ?? 0,
    porPrioridad: shared.data?.porPrioridad ?? POR_PRIORIDAD_VACIO,
    isLoading: shared.isLoading,
    error: shared.error,
    notAvailable: shared.notAvailable,
    refetch: shared.refetch,
  }
}
