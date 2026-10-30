'use client'

/**
 * use-session-revocation.ts — Single-session enforcement (instant side).
 *
 * Subscribes (through the `subscribeRealtime()` adapter, T-0183) to session
 * revocations for the current user: the Supabase `session_revocations` INSERT
 * channel or the `session.revoked` event of the SSE stream, depending on
 * `NEXT_PUBLIC_REALTIME_PROVIDER`. When the backend supersedes a session
 * (another device claimed it) the affected device gets an instant event and
 * signs out — no need to wait for the next 401.
 *
 * CRITICAL: the device that just claimed the session ALSO receives the event
 * (it is subscribed by user_id). It must NOT sign itself out — see
 * `shouldRevokeThisSession`.
 */

import { useEffect, useRef } from 'react'
import { subscribeRealtime } from '@/lib/realtime/subscribe-realtime'

/**
 * `revokedSessionId === null` means "this session" (user-wide revocation such
 * as the inactivity logout, or the stream's own 401 SESSION_SUPERSEDED);
 * otherwise only the device whose session id matches reacts.
 */
export function shouldRevokeThisSession(
  revokedSessionId: string | null,
  currentSessionId: string | undefined,
): boolean {
  return revokedSessionId === null || revokedSessionId === currentSessionId
}

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
  // Latest values through refs: the subscription only depends on the user.
  const currentSessionIdRef = useRef(currentSessionId)
  const onRevokedRef = useRef(onRevoked)
  currentSessionIdRef.current = currentSessionId
  onRevokedRef.current = onRevoked
  const enabled = Boolean(userId && currentSessionId)

  useEffect(() => {
    if (!userId || !enabled) return
    return subscribeRealtime({
      userId,
      onSessionRevoked: ({ revokedSessionId }) => {
        if (!shouldRevokeThisSession(revokedSessionId, currentSessionIdRef.current)) return
        onRevokedRef.current()
      },
    })
  }, [userId, enabled])
}
