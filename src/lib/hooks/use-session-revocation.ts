'use client'

/**
 * use-session-revocation.ts — Single-session enforcement (instant side).
 *
 * Subscribes to `session_revocations` INSERTs for the current user. When the
 * backend supersedes a session (another device claimed it), it writes a row
 * here; the affected device gets an instant revocation event and signs out —
 * no need to wait for the next 401. Pattern mirrors use-notifications-realtime.
 *
 * CRITICAL: the device that just claimed the session ALSO receives the row
 * (it is subscribed by user_id). It must NOT sign itself out — only the device
 * whose `revoked_session_id` matches its own `currentSessionId` reacts.
 */

import { useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'

interface UseSessionRevocationOptions {
  /** Supabase auth UUID (=== auth.uid()). Undefined until session hydrates. */
  userId: string | undefined
  /** This device's session_id claim (from decodeAccessToken). */
  currentSessionId: string | undefined
  /** Fires only when THIS session was the one revoked. */
  onRevoked: () => void
}

export function useSessionRevocation({
  userId,
  currentSessionId,
  onRevoked,
}: UseSessionRevocationOptions): void {
  useEffect(() => {
    if (!userId || !currentSessionId) return
    const supabase = getSupabase()
    if (!supabase) return

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
          // Only react if MY session was revoked — the newly-claimed device
          // receives the same row (subscribed by user_id) and must ignore it.
          if (payload.new.revoked_session_id !== currentSessionId) return
          onRevoked()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, currentSessionId, onRevoked])
}
