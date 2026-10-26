/**
 * `subscribeRealtime()` — the realtime adapter (T-0183).
 *
 * One entry point, two transports selected by `NEXT_PUBLIC_REALTIME_PROVIDER`
 * (`supabase` default | `sse`, see `provider.ts`). The hooks
 * (`use-notifications-realtime`, `use-session-revocation`) delegate here and
 * keep their public signatures.
 */

import { currentRealtimeProvider, type RealtimeProvider } from './provider'
import { subscribeSse } from './sse-connection'
import { subscribeSupabase } from './supabase-realtime'
import type { RealtimeSubscriber } from './types'

export type { RealtimeSubscriber } from './types'

/** Subscribes and returns the unsubscribe function. */
export function subscribeRealtime(
  opts: RealtimeSubscriber,
  provider: RealtimeProvider = currentRealtimeProvider(),
): () => void {
  return provider === 'sse' ? subscribeSse(opts) : subscribeSupabase(opts)
}
