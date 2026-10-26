/**
 * One fetch-based SSE connection to the back's `GET /realtime/stream` (T-0183).
 *
 * Why fetch and not `EventSource`: the stream is Bearer-authenticated and
 * `EventSource` cannot set headers (same reason as `use-quote-stream.ts`).
 *
 * Contract (frozen in .orchestration/tasks/T-0183-realtime-to-sse/contract.md):
 *  - events: `ready`, `notification.created`, `session.revoked`, `reauth`,
 *    `resync`; `: ping` comment every 25 s.
 *  - resume: the cursor travels in `?lastEventId=` (the contract accepts it as
 *    well as the `Last-Event-ID` header). 🔴 Not the header: the gateway's CORS
 *    allow-list does not include `Last-Event-ID`, so a reconnect carrying it
 *    would die in the preflight — the exact failure `use-quote-stream.ts`
 *    documents (QA-IA-A, 04-10-2026).
 *  - 60 s without bytes = dead connection → reconnect with jittered backoff.
 *  - `reauth`: reconnect at once with a fresh token (the server closes anyway).
 *  - `resync`: the cursor is dropped and the consumer refetches.
 *  - 401 `SESSION_SUPERSEDED` = this session was revoked: stop for good.
 *
 * Pure of React and of the app's auth client: the token source, `fetch`,
 * randomness and the stale-token check are injected so it is testable with
 * fake timers.
 */

import { createSseParser, type SseFrame } from './sse-parser'
import type { BackendNotification } from '@/lib/api/notifications.types'

export const SILENCE_TIMEOUT_MS = 60_000
export const BACKOFF_BASE_MS = 1_000
export const BACKOFF_MAX_MS = 30_000

export interface SseStreamHandlers {
  /** `fresh` = opened without a cursor, so a gap cannot be ruled out. */
  onOpen: (fresh: boolean) => void
  /** The connection that was open went away (any reason, including stop()). */
  onClose: () => void
  onNotification: (notification: BackendNotification) => void
  onSessionRevoked: (event: { revokedSessionId: string | null }) => void
  onResync: () => void
  /** 401 SESSION_SUPERSEDED on connect: this session is revoked. Terminal. */
  onRevokedByServer: () => void
}

export interface SseStreamOptions {
  url: string
  getToken: () => Promise<string | null>
  handlers: SseStreamHandlers
  fetch?: typeof fetch
  random?: () => number
  silenceMs?: number
  /**
   * A 401 SESSION_SUPERSEDED answers the token we SENT. If we already hold a
   * newer one, the session that displaced it is ours: not a revocation.
   */
  isStaleSupersede?: (tokenUsed: string) => boolean
}

export interface SseStream {
  start: () => void
  stop: () => void
}

interface Attempt {
  ac: AbortController
  cursor: string | null
  done: boolean
  timer: ReturnType<typeof setTimeout> | null
}

export function createSseStream(opts: SseStreamOptions): SseStream {
  const { handlers } = opts
  const random = opts.random ?? Math.random
  const silenceMs = opts.silenceMs ?? SILENCE_TIMEOUT_MS

  let running = false
  let connected = false
  let attempts = 0
  let lastEventId: string | null = null
  let current: Attempt | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function markClosed() {
    if (!connected) return
    connected = false
    handlers.onClose()
  }

  function armWatchdog(a: Attempt) {
    if (a.timer) clearTimeout(a.timer)
    a.timer = setTimeout(() => {
      if (a.done) return
      a.ac.abort()
      finish(a, 'retry')
    }, silenceMs)
  }

  function scheduleRetry() {
    attempts += 1
    const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(attempts - 1, 10))
    const delay = Math.round(ceiling * (0.5 + 0.5 * random()))
    retryTimer = setTimeout(() => {
      retryTimer = null
      void attempt()
    }, delay)
  }

  /** An attempt ended, for whatever reason. Idempotent per attempt. */
  function finish(a: Attempt, next: 'retry' | 'now' | 'stop') {
    if (a.done) return
    a.done = true
    if (a.timer) clearTimeout(a.timer)
    if (current === a) current = null
    markClosed()
    if (!running || next === 'stop') return
    if (next === 'now') void attempt()
    else scheduleRetry()
  }

  function parseJson(data: string): unknown {
    try {
      return JSON.parse(data)
    } catch {
      return undefined
    }
  }

  function dispatch(a: Attempt, frame: SseFrame) {
    if (frame.id) lastEventId = frame.id
    switch (frame.event) {
      case 'ready': {
        attempts = 0
        connected = true
        handlers.onOpen(a.cursor === null)
        return
      }
      case 'notification.created': {
        const body = parseJson(frame.data) as BackendNotification | undefined
        if (body && typeof body === 'object' && typeof body.id === 'string' && body.id) {
          handlers.onNotification(body)
        }
        return
      }
      case 'session.revoked': {
        const body = parseJson(frame.data) as { revokedSessionId?: unknown } | undefined
        if (!body || typeof body !== 'object') return
        handlers.onSessionRevoked({
          revokedSessionId: typeof body.revokedSessionId === 'string' ? body.revokedSessionId : null,
        })
        return
      }
      case 'resync': {
        lastEventId = null
        handlers.onResync()
        return
      }
      case 'reauth': {
        a.ac.abort()
        finish(a, 'now')
        return
      }
      default:
        return
    }
  }

  async function attempt(): Promise<void> {
    if (!running) return
    const a: Attempt = { ac: new AbortController(), cursor: lastEventId, done: false, timer: null }
    current = a
    // Armed before the request so a server that never answers is also "dead".
    armWatchdog(a)
    let token: string | null = null
    try {
      token = await opts.getToken()
      if (a.done) return
      if (!token) {
        finish(a, 'retry')
        return
      }
      const url =
        a.cursor === null
          ? opts.url
          : `${opts.url}?lastEventId=${encodeURIComponent(a.cursor)}`
      const doFetch = opts.fetch ?? fetch
      const res = await doFetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: a.ac.signal,
        cache: 'no-store',
      })
      if (a.done) return

      if (res.status === 401) {
        let code: unknown
        try {
          code = ((await res.json()) as { code?: unknown } | null)?.code
        } catch {
          code = undefined
        }
        if (a.done) return
        if (code === 'SESSION_SUPERSEDED' && !opts.isStaleSupersede?.(token)) {
          running = false
          finish(a, 'stop')
          handlers.onRevokedByServer()
          return
        }
        finish(a, 'retry')
        return
      }
      if (!res.ok || !res.body) {
        finish(a, 'retry')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const parser = createSseParser((frame) => {
        if (!a.done) dispatch(a, frame)
      })
      for (;;) {
        const { done, value } = await reader.read()
        if (a.done) {
          void reader.cancel().catch(() => {})
          return
        }
        if (done) break
        armWatchdog(a)
        parser.push(decoder.decode(value, { stream: true }))
        if (a.done) {
          void reader.cancel().catch(() => {})
          return
        }
      }
      finish(a, 'retry')
    } catch {
      // Aborts we caused (stop / reauth / silence) are already `done`.
      finish(a, 'retry')
    }
  }

  return {
    start() {
      if (running) return
      running = true
      attempts = 0
      void attempt()
    },
    stop() {
      running = false
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      lastEventId = null
      const a = current
      if (a) {
        a.ac.abort()
        finish(a, 'stop')
      }
      markClosed()
    },
  }
}
