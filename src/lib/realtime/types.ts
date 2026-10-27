import type { BackendNotification } from '@/lib/api/notifications.types'

export interface RealtimeSubscriber {
  userId: string
  /** A new IN_APP notification, already in the front `BackendNotification` shape. */
  onNotification?: (notification: BackendNotification) => void
  /**
   * `revokedSessionId === null` means "this session" (the stream's own, or every
   * session of the user); otherwise the consumer compares it with its own.
   */
  onSessionRevoked?: (event: { revokedSessionId: string | null }) => void
  /**
   * Refetch signal. Same semantics as the Supabase adapter's `SUBSCRIBED`:
   * fires on the initial connect and whenever a gap cannot be ruled out
   * (fresh reconnect, `resync`). Not fired when a resume with a cursor
   * already got its backfill.
   */
  onReconnect?: () => void
  onConnectionChange?: (connected: boolean) => void
}
