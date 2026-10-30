/**
 * The tab's shared SSE connection (T-0183).
 *
 * One multiplexed stream per tab (per user): the notification inbox and the
 * single-session revocation both subscribe here and the stream stays open while
 * at least one of them is mounted. Closing the last subscription aborts the
 * fetch (unmount = close).
 */

import {
  asegurarSesionVigente,
  esRespuestaDeUnTokenViejo,
  getAccessToken,
} from '@/lib/api/client'
import { sesionTerminada } from '@/lib/auth/session-terminal'
import type { RealtimeSubscriber } from './types'
import { createSseStream, type SseStream } from './sse-stream'

interface Shared {
  stream: SseStream
  subs: Set<RealtimeSubscriber>
  connected: boolean
}

const shared = new Map<string, Shared>()

/** Same base the API client uses (`NEXT_PUBLIC_BACKEND_URL`, includes `/api` in deployed envs). */
export function streamUrl(): string {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/realtime/stream`
}

async function getToken(): Promise<string | null> {
  if (sesionTerminada()) return null
  await asegurarSesionVigente()
  return getAccessToken()
}

/** One subscriber's failure must not starve the others. */
function each(entry: Shared, call: (s: RealtimeSubscriber) => void) {
  for (const s of [...entry.subs]) {
    if (!entry.subs.has(s)) continue
    try {
      call(s)
    } catch (err) {
      console.error('[realtime] subscriber threw', err)
    }
  }
}

function open(userId: string): Shared {
  const entry: Shared = {
    subs: new Set(),
    connected: false,
    stream: undefined as unknown as SseStream,
  }
  entry.stream = createSseStream({
    url: streamUrl(),
    getToken,
    isStaleSupersede: (used) => esRespuestaDeUnTokenViejo('SESSION_SUPERSEDED', used),
    handlers: {
      onOpen: (fresh) => {
        entry.connected = true
        each(entry, (s) => s.onConnectionChange?.(true))
        if (fresh) each(entry, (s) => s.onReconnect?.())
      },
      onClose: () => {
        entry.connected = false
        each(entry, (s) => s.onConnectionChange?.(false))
      },
      onNotification: (n) => each(entry, (s) => s.onNotification?.(n)),
      onSessionRevoked: (e) => each(entry, (s) => s.onSessionRevoked?.(e)),
      onResync: () => each(entry, (s) => s.onReconnect?.()),
      onRevokedByServer: () => {
        entry.connected = false
        // The dead stream must not be reused if the same user signs back in.
        if (shared.get(userId) === entry) shared.delete(userId)
        each(entry, (s) => s.onConnectionChange?.(false))
        each(entry, (s) => s.onSessionRevoked?.({ revokedSessionId: null }))
      },
    },
  })
  return entry
}

/** Subscribe to the tab's stream. Returns the unsubscribe function. */
export function subscribeSse(subscriber: RealtimeSubscriber): () => void {
  const { userId } = subscriber
  // A fresh object per call so the same callbacks can subscribe twice.
  const sub: RealtimeSubscriber = { ...subscriber }
  let entry = shared.get(userId)
  const isNew = !entry
  if (!entry) {
    entry = open(userId)
    shared.set(userId, entry)
  }
  entry.subs.add(sub)
  if (isNew) {
    entry.stream.start()
  } else if (entry.connected) {
    // Joining a live stream behaves like an initial SUBSCRIBED.
    try {
      sub.onConnectionChange?.(true)
      sub.onReconnect?.()
    } catch (err) {
      console.error('[realtime] subscriber threw', err)
    }
  }

  const joined = entry
  let active = true
  return () => {
    if (!active) return
    active = false
    joined.subs.delete(sub)
    if (joined.subs.size === 0) {
      joined.stream.stop()
      if (shared.get(userId) === joined) shared.delete(userId)
    }
  }
}
