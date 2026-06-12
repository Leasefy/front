'use client'

/**
 * use-payments-funnel-realtime.ts — Phase 32 plan 32-08 (COBR-UI-06, XR-05).
 *
 * Per-plan Supabase Realtime subscription on cartera_payments INSERT + UPDATE.
 * Mirrors use-debtor-stage-transitions-realtime.ts (Phase 31 plan 31-11):
 *  - Single client-side predicate `plan_id=eq.{planId}` (postgres_changes only
 *    supports ONE predicate). Tenant isolation is enforced by RLS on the
 *    `cartera_payments` table.
 *  - schema='public' (production publication exposes agent.* under public).
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

export interface CarteraPaymentEvent {
  id: string
  planId: string
  status: string
  amount: number
  provider: string
  updatedAt: string
}

interface UsePaymentsFunnelRealtimeOptions {
  planId: string
  onUpdate: (event: CarteraPaymentEvent) => void
  /** Fires when subscribe status becomes 'SUBSCRIBED' (initial + reconnect). */
  onReconnect?: () => void
}

// =============================================================================
// Hook
// =============================================================================

function mapRow(row: Record<string, unknown>): CarteraPaymentEvent {
  return {
    id: String(row.id ?? ''),
    planId: String(row.plan_id ?? row.planId ?? ''),
    status: String(row.status ?? ''),
    amount: Number(row.amount ?? row.amount_cop ?? 0),
    provider: String(row.provider ?? row.payment_provider ?? ''),
    updatedAt: String(
      row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    ),
  }
}

export function usePaymentsFunnelRealtime({
  planId,
  onUpdate,
  onReconnect,
}: UsePaymentsFunnelRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }

    const channel = supabase
      .channel('agent:cartera_payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cartera_payments',
          // Single-predicate filter — RLS handles tenant isolation.
          filter: `plan_id=eq.${planId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          onUpdate(mapRow(payload.new))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cartera_payments',
          filter: `plan_id=eq.${planId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          onUpdate(mapRow(payload.new))
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
  }, [planId, onUpdate, onReconnect])

  return { isConnected }
}
