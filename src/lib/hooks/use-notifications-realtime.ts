'use client'

/**
 * use-notifications-realtime.ts — Realtime inbox subscription.
 *
 * Replaces the previous 2-minute REST poll (useNotifications) with a Supabase
 * postgres_changes subscription on `notification_logs` INSERTs, filtered to the
 * current user. Pattern mirrors the cobranza realtime hooks
 * (use-debtor-calls-realtime.ts) with these specifics:
 *  - Channel name `notifications:{userId}` — one per user.
 *  - Single client-side predicate `user_id=eq.{userId}` (postgres_changes
 *    limit); row-level isolation is also enforced by RLS
 *    (`user_id = auth.uid()`) so another user never receives these rows.
 *  - schema='public', table='notification_logs'.
 *  - Only IN_APP rows reach the inbox; EMAIL/PUSH/SMS rows are audit records
 *    written to the same table and must be skipped.
 *  - Mark-read / dismiss stay on REST — the front never writes this table.
 *  - Optional `onReconnect` fires on every SUBSCRIBED (initial + reconnect) so
 *    the consumer can refetch and close any gap opened during a disconnect.
 */

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import {
  mapRealtimeRowToBackendNotification,
  type BackendNotification,
} from '@/lib/api/notifications.types'

interface UseNotificationsRealtimeOptions {
  /** Supabase auth UUID (=== User.id === auth.uid()). Undefined until session hydrates. */
  userId: string | undefined
  /** Called for each new IN_APP notification, already mapped to BackendNotification. */
  onInsert: (notification: BackendNotification) => void
  /** Fires when subscribe status becomes 'SUBSCRIBED' (initial + reconnect). */
  onReconnect?: () => void
}

export function useNotificationsRealtime({
  userId,
  onInsert,
  onReconnect,
}: UseNotificationsRealtimeOptions): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!userId) return
    const supabase = getSupabase()
    if (!supabase) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          // Same table stores audit rows for every channel; only IN_APP shows in the inbox.
          if (row.channel !== 'IN_APP') return
          onInsert(mapRealtimeRowToBackendNotification(row))
        },
      )
      .subscribe((status: string) => {
        const connected = status === 'SUBSCRIBED'
        setIsConnected(connected)
        if (connected && onReconnect) onReconnect()
      })

    return () => {
      setIsConnected(false)
      supabase.removeChannel(channel)
    }
  }, [userId, onInsert, onReconnect])

  return { isConnected }
}
