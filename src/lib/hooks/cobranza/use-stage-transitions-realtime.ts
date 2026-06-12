'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface StageTransitionEvent {
  id: string
  debtorNameRedacted: string
  fromStage: string
  toStage: string
  reason: string
  transitionedAt: string
  actor: 'agent' | 'human'
}

interface UseStageTransitionsRealtimeOptions {
  tenantId: string
  onNewTransition: (transition: StageTransitionEvent) => void
}

// =============================================================================
// Hook: useStageTransitionsRealtime
// =============================================================================

export function useStageTransitionsRealtime({
  tenantId,
  onNewTransition,
}: UseStageTransitionsRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      // Silently disabled if Supabase is not configured
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
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const transition: StageTransitionEvent = {
            id: String(row.id ?? ''),
            debtorNameRedacted: String(row.debtor_name_redacted ?? row.debtorNameRedacted ?? ''),
            fromStage: String(row.from_stage ?? row.fromStage ?? ''),
            toStage: String(row.to_stage ?? row.toStage ?? ''),
            reason: String(row.reason ?? ''),
            transitionedAt: String(row.transitioned_at ?? row.transitionedAt ?? new Date().toISOString()),
            actor: (row.actor === 'human' ? 'human' : 'agent') as 'agent' | 'human',
          }
          onNewTransition(transition)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      setIsConnected(false)
      supabase.removeChannel(channel)
    }
  }, [tenantId, onNewTransition])

  return { isConnected }
}
