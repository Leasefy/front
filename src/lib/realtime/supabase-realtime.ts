/**
 * Supabase implementation of the realtime adapter (T-0183): the channels the
 * app used before the SSE migration, unchanged. Kept as the default provider
 * and the rollback path (`NEXT_PUBLIC_REALTIME_PROVIDER=supabase`).
 *
 *  - Notifications: `postgres_changes` INSERT on `public.notification_logs`,
 *    `user_id=eq.{userId}`. Channel name `notifications:{userId}:{instance}`.
 *    🔴 One channel per subscription, NOT per user: `supabase.channel(name)`
 *    returns the already-subscribed channel when the name repeats, and a second
 *    `.on()` on it throws «cannot add postgres_changes callbacks … after
 *    subscribe()» (Nico, 2026-09-15). The user filter lives in `filter`.
 *    Only IN_APP rows reach the inbox; EMAIL/PUSH/SMS rows are audit records.
 *  - Revocations: INSERT on `public.session_revocations`, channel
 *    `session-revocations:{userId}`.
 */

import { getSupabase } from '@/lib/supabase/client'
import { mapRealtimeRowToBackendNotification } from '@/lib/api/notifications.types'
import type { RealtimeSubscriber } from './types'

export function subscribeSupabase(opts: RealtimeSubscriber): () => void {
  const supabase = getSupabase()
  if (!supabase) return () => {}
  const { userId } = opts
  const removers: Array<() => void> = []

  if (opts.onNotification || opts.onReconnect || opts.onConnectionChange) {
    const instance = Math.random().toString(36).slice(2, 10)
    const channel = supabase
      .channel(`notifications:${userId}:${instance}`)
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
          if (row.channel !== 'IN_APP') return
          opts.onNotification?.(mapRealtimeRowToBackendNotification(row))
        },
      )
      .subscribe((status: string) => {
        const connected = status === 'SUBSCRIBED'
        opts.onConnectionChange?.(connected)
        if (connected) opts.onReconnect?.()
      })
    removers.push(() => supabase.removeChannel(channel))
  }

  if (opts.onSessionRevoked) {
    const onSessionRevoked = opts.onSessionRevoked
    const channel = supabase
      .channel(`session-revocations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_revocations',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const id = payload.new.revoked_session_id
          // `null` means "this session" in the adapter contract (SSE only). A
          // Supabase row without a string id never matched anything before the
          // adapter existed: keep ignoring it instead of signing the user out.
          if (typeof id !== 'string') return
          onSessionRevoked({ revokedSessionId: id })
        },
      )
      .subscribe()
    removers.push(() => supabase.removeChannel(channel))
  }

  return () => {
    for (const remove of removers) remove()
  }
}
