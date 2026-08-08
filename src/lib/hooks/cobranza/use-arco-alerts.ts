'use client'

/**
 * use-arco-alerts — plazos ARCO vencidos o por vencer, para el panel entero.
 *
 * Por qué existe aparte de `useArcoRequests`: los términos de la Ley 1581 son
 * legales, no operativos. No sirve que la alerta viva sólo dentro de la pantalla
 * de ARCO, porque nadie entra ahí salvo que ya sepa que tiene algo pendiente —
 * que es justo lo que la alerta debería avisar. Este hook se monta en la
 * campana del header y vigila los plazos desde cualquier pantalla del panel.
 *
 * Diferencias con `useArcoRequests`:
 *   · cadencia más lenta (5 min): los plazos se miden en días, y esto corre en
 *     TODAS las pantallas, así que no vale la pena pagar un fetch por minuto;
 *   · devuelve sólo lo urgente, no la bandeja entera;
 *   · silencioso: si falla, no muestra error. Una campana rota no debe pintar
 *     un error en pantallas que no tienen nada que ver con ARCO.
 *
 * Gating: sólo corre con agencia resuelta y acceso al módulo `cobranza`, que es
 * fail-closed (ver `agent-module-access.ts`). Sin permiso no se dispara ni un
 * fetch.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import {
  normalizeArcoResponse,
  ARCO_URGENT_THRESHOLD_DAYS,
  type ArcoRequestRow,
} from './use-arco-requests'

const POLL_INTERVAL_MS = 5 * 60_000

export interface ArcoAlertsResult {
  /** Vencidas y sin cerrar — incumplimiento en curso. */
  overdue: ArcoRequestRow[]
  /** Vencen dentro del umbral de urgencia. */
  urgent: ArcoRequestRow[]
  /** overdue + urgent, la más apremiante primero. */
  all: ArcoRequestRow[]
  /** Días hábiles restantes de la más apremiante (negativo si ya venció). */
  soonestRemainingDays: number | null
  /** Hay al menos una vencida: la campana debe verse crítica, no informativa. */
  hasOverdue: boolean
  threshold: number
}

const EMPTY: ArcoAlertsResult = {
  overdue: [],
  urgent: [],
  all: [],
  soonestRemainingDays: null,
  hasOverdue: false,
  threshold: ARCO_URGENT_THRESHOLD_DAYS,
}

export function useArcoAlerts(enabled: boolean): ArcoAlertsResult {
  const { agency } = useAuth()
  const perms = usePermissionsContextSafe()
  const agencyId = agency?.id ?? null

  // `cobranza` es fail-closed: sin payload de permisos, denegado.
  const canSee = enabled && Boolean(agencyId) && (perms?.canAccess('cobranza', 'view') ?? false)

  const [rows, setRows] = useState<ArcoRequestRow[]>([])

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/arco/requests`)
      if (!res.ok) return
      setRows(normalizeArcoResponse(await res.json()))
    } catch {
      // Silencioso a propósito: ver el encabezado.
    }
  }, [agencyId])

  useEffect(() => {
    if (!canSee) {
      setRows([])
      return
    }
    void fetchOnce()
  }, [canSee, fetchOnce])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, canSee)

  if (!canSee) return EMPTY

  const overdue = rows.filter((r) => r.isOverdue)
  const urgent = rows.filter((r) => r.isUrgent)
  const all = [...overdue, ...urgent]

  return {
    overdue,
    urgent,
    all,
    soonestRemainingDays: all.length > 0 ? all[0].slaRemainingDays : null,
    hasOverdue: overdue.length > 0,
    threshold: ARCO_URGENT_THRESHOLD_DAYS,
  }
}
