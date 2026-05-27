'use client'

/**
 * use-debtor-stage-transitions-realtime.ts — Phase 31 plan 31-11 (D-31-16, XR-01).
 *
 * Per-debtor Supabase Realtime subscription on `cartera_stage_transitions`
 * INSERTs. Mirrors the canonical Phase 29 pattern in
 * `use-stage-transitions-realtime.ts` with these deltas:
 *  - Single client-side predicate `debtor_id=eq.{id}` (postgres_changes only
 *    supports ONE predicate). Tenant isolation is enforced by RLS on the
 *    `cartera_stage_transitions` table — RESEARCH §5.
 *  - schema='public' (production publication exposes agent.* under public).
 *  - actor extended to 'agent' | 'human' | 'admin:override' per 31-00 CHECK.
 *  - Optional `onReconnect` callback fires on every SUBSCRIBED status
 *    transition (initial + reconnect) — D-31-18 "single refetch on reconnect"
 *    hook.
 *
 * Caller is responsible for stable callback refs (useCallback) so the effect
 * dep array stays referentially stable across renders.
 */

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface DebtorStageTransitionEvent {
  id: string
  debtorId: string
  fromStage: string
  toStage: string
  reason: string
  transitionedAt: string
  actor: 'agent' | 'human' | 'admin:override'
}

interface UseDebtorStageTransitionsRealtimeOptions {
  debtorId: string
  onNewTransition: (transition: DebtorStageTransitionEvent) => void
  /** Fires when subscribe status becomes 'SUBSCRIBED' (initial + reconnect). */
  onReconnect?: () => void
}

// =============================================================================
// Hook
// =============================================================================

function coerceActor(value: unknown): 'agent' | 'human' | 'admin:override' {
  if (value === 'admin:override') return 'admin:override'
  if (value === 'human') return 'human'
  return 'agent'
}

export function useDebtorStageTransitionsRealtime({
  debtorId,
  onNewTransition,
  onReconnect,
}: UseDebtorStageTransitionsRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }

    const channel = supabase
      .channel('agent:cartera_stage_transitions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cartera_stage_transitions',
          // Single-predicate filter — RLS handles tenant isolation.
          filter: `debtor_id=eq.${debtorId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const transition: DebtorStageTransitionEvent = {
            id: String(row.id ?? ''),
            debtorId: String(row.debtor_id ?? row.debtorId ?? ''),
            fromStage: String(row.from_stage ?? row.fromStage ?? ''),
            toStage: String(row.to_stage ?? row.toStage ?? ''),
            reason: String(row.reason ?? ''),
            transitionedAt: String(
              row.transitioned_at ?? row.transitionedAt ?? new Date().toISOString(),
            ),
            actor: coerceActor(row.actor),
          }
          onNewTransition(transition)
        },
      )
      .subscribe((status: string) => {
        const connected = status === 'SUBSCRIBED'
        setIsConnected(connected)
        if (connected && onReconnect) {
          onReconnect()
        }
      })

    return () => {
      setIsConnected(false)
      supabase.removeChannel(channel)
    }
  }, [debtorId, onNewTransition, onReconnect])

  return { isConnected }
}
