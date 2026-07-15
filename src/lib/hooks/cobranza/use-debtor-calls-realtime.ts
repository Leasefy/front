'use client'

/**
 * use-debtor-calls-realtime.ts — Phase 31 plan 31-11 (D-31-16, XR-01).
 *
 * Per-debtor Supabase Realtime subscription on `calls` INSERTs. Pattern
 * mirrors `use-debtor-stage-transitions-realtime.ts` with these specifics:
 *  - Channel name `agent:calls:{debtorId}` — unique per debtor to avoid
 *    cross-debtor channel name collisions when multiple tabs are open
 *    (per RESEARCH §5 example line 549).
 *  - Single client-side predicate `debtor_id=eq.{id}` (postgres_changes
 *    limit); tenant isolation handled by RLS.
 *  - schema='public', table='calls'.
 *  - `endedAt` preserved as null (not empty string) when row.ended_at is
 *    null — feeds the Llamadas tab "in progress" badge.
 *  - `qaScore` preserved as null (not coerced to 0) when absent.
 *  - Optional `onReconnect` SUBSCRIBED-status callback for the D-31-18
 *    single-refetch-on-reconnect pattern.
 */

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface DebtorCallEvent {
  id: string
  debtorId: string
  callId: string
  startedAt: string
  endedAt: string | null
  status: string
  qaScore: number | null
}

interface UseDebtorCallsRealtimeOptions {
  debtorId: string
  onNewCall: (call: DebtorCallEvent) => void
  /** Fires when subscribe status becomes 'SUBSCRIBED' (initial + reconnect). */
  onReconnect?: () => void
}

// =============================================================================
// Hook
// =============================================================================

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return String(value)
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function useDebtorCallsRealtime({
  debtorId,
  onNewCall,
  onReconnect,
}: UseDebtorCallsRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }

    const channel = supabase
      .channel(`agent:calls:${debtorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `debtor_id=eq.${debtorId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const call: DebtorCallEvent = {
            id: String(row.id ?? ''),
            debtorId: String(row.debtor_id ?? row.debtorId ?? ''),
            callId: String(row.call_id ?? row.callId ?? ''),
            startedAt: String(
              row.started_at ?? row.startedAt ?? new Date().toISOString(),
            ),
            endedAt: nullableString(row.ended_at ?? row.endedAt),
            status: String(row.status ?? ''),
            qaScore: nullableNumber(row.qa_score ?? row.qaScore),
          }
          onNewCall(call)
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
  }, [debtorId, onNewCall, onReconnect])

  return { isConnected }
}
