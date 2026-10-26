import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSseStream, type SseStreamHandlers } from './sse-stream'

// ---------------------------------------------------------------------------
// Fake fetch: every call yields a controllable streaming response.
// ---------------------------------------------------------------------------

interface FakeCall {
  url: string
  init: RequestInit
  push: (text: string) => void
  end: () => void
  fail: (err: Error) => void
}

type Responder = (call: FakeCall) => { status?: number; body?: unknown } | void

function setup(
  opts: {
    tokens?: Array<string | null>
    isStaleSupersede?: (token: string) => boolean
    random?: () => number
  } = {},
) {
  const calls: FakeCall[] = []
  const responders: Responder[] = []
  const encoder = new TextEncoder()
  let tokenIdx = 0

  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    type Item = { value?: Uint8Array; done?: boolean; error?: Error }
    const queue: Item[] = []
    let waiter: { resolve: (r: unknown) => void; reject: (e: unknown) => void } | null = null
    const flush = () => {
      if (waiter && queue.length) {
        const item = queue.shift()!
        const w = waiter
        waiter = null
        if (item.error) w.reject(item.error)
        else w.resolve(item.done ? { done: true, value: undefined } : { done: false, value: item.value })
      }
    }
    const call: FakeCall = {
      url,
      init,
      push: (t) => {
        queue.push({ value: encoder.encode(t) })
        flush()
      },
      end: () => {
        queue.push({ done: true })
        flush()
      },
      fail: (e) => {
        queue.push({ error: e })
        flush()
      },
    }
    calls.push(call)
    init.signal?.addEventListener('abort', () => {
      queue.push({ error: Object.assign(new Error('aborted'), { name: 'AbortError' }) })
      flush()
    })
    const custom = responders.shift()?.(call)
    const status = custom?.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (custom?.body === undefined) throw new Error('no body')
        return custom.body
      },
      body: {
        getReader: () => ({
          read: () =>
            new Promise((resolve, reject) => {
              waiter = { resolve, reject }
              flush()
            }),
          cancel: async () => {},
        }),
      },
    } as unknown as Response
  })

  const handlers = {
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onNotification: vi.fn(),
    onSessionRevoked: vi.fn(),
    onResync: vi.fn(),
    onRevokedByServer: vi.fn(),
  } satisfies SseStreamHandlers

  const getToken = vi.fn(async () => {
    const list = opts.tokens ?? ['tok-1']
    const t = list[Math.min(tokenIdx, list.length - 1)]
    tokenIdx += 1
    return t
  })

  const stream = createSseStream({
    url: 'http://api.test/realtime/stream',
    getToken,
    fetch: fetchMock as unknown as typeof fetch,
    random: opts.random ?? (() => 1),
    isStaleSupersede: opts.isStaleSupersede,
    handlers,
  })
  return { stream, calls, fetchMock, handlers, getToken, responders }
}

const tick = () => vi.advanceTimersByTimeAsync(0)
const READY = 'event: ready\ndata: {"connectionId":"c1"}\n\n'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('createSseStream — connection', () => {
  it('connects with a Bearer token and SSE accept header, no cursor on first open', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://api.test/realtime/stream')
    const headers = new Headers(calls[0].init.headers)
    expect(headers.get('Authorization')).toBe('Bearer tok-1')
    expect(headers.get('Accept')).toBe('text/event-stream')
    calls[0].push(READY)
    await tick()
    expect(handlers.onOpen).toHaveBeenCalledWith(true)
  })

  it('dispatches notification.created, session.revoked and resync frames', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    const n = { id: 'n1', type: 't', category: 'general', title: 'T', message: 'M', read: false, createdAt: 'x' }
    calls[0].push(READY)
    calls[0].push(`id: a_1\nevent: notification.created\ndata: ${JSON.stringify(n)}\n\n`)
    calls[0].push('id: a_2\nevent: session.revoked\ndata: {"revokedSessionId":"s1","at":"2026-10-25T00:00:00Z"}\n\n')
    calls[0].push('id: a_3\nevent: session.revoked\ndata: {"revokedSessionId":null,"at":"2026-10-25T00:00:00Z"}\n\n')
    calls[0].push('event: resync\ndata: {}\n\n')
    await tick()
    expect(handlers.onNotification).toHaveBeenCalledWith(n)
    expect(handlers.onSessionRevoked).toHaveBeenNthCalledWith(1, { revokedSessionId: 's1' })
    expect(handlers.onSessionRevoked).toHaveBeenNthCalledWith(2, { revokedSessionId: null })
    expect(handlers.onResync).toHaveBeenCalledTimes(1)
  })

  it('ignores malformed JSON, notifications without an id and unknown events', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    calls[0].push('event: notification.created\ndata: {oops\n\n')
    calls[0].push('event: notification.created\ndata: {"title":"no id"}\n\n')
    calls[0].push('event: mystery\ndata: {}\n\n')
    await tick()
    expect(handlers.onNotification).not.toHaveBeenCalled()
    expect(calls).toHaveLength(1)
  })

  it('stop() aborts the request and never reconnects', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    calls[0].push(READY)
    await tick()
    stream.stop()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(calls[0].init.signal?.aborted).toBe(true)
    expect(calls).toHaveLength(1)
    expect(handlers.onClose).toHaveBeenCalled()
  })

  it('start() is idempotent while running', async () => {
    const { stream, calls } = setup()
    stream.start()
    stream.start()
    await tick()
    expect(calls).toHaveLength(1)
  })
})

describe('createSseStream — reconnect, cursor and backoff', () => {
  it('reconnects after a server close, resuming from the last event id', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    calls[0].push(READY)
    calls[0].push('id: 2026-10-25T10:00:00.000Z_u1\nevent: notification.created\ndata: {"id":"n1"}\n\n')
    await tick()
    calls[0].end()
    await tick()
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(2)
    expect(calls[1].url).toBe(
      'http://api.test/realtime/stream?lastEventId=2026-10-25T10%3A00%3A00.000Z_u1',
    )
    calls[1].push(READY)
    await tick()
    // resumed with a cursor: the server backfill closes the gap, no refetch needed
    expect(handlers.onOpen).toHaveBeenLastCalledWith(false)
  })

  it('backs off exponentially and resets after ready', async () => {
    const { stream, calls } = setup({ random: () => 1 })
    stream.start()
    await tick()
    calls[0].end()
    await tick()
    await vi.advanceTimersByTimeAsync(999)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toHaveLength(2)
    calls[1].end()
    await tick()
    await vi.advanceTimersByTimeAsync(1999)
    expect(calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toHaveLength(3)
    calls[2].push(READY)
    await tick()
    calls[2].end()
    await tick()
    // reset: back to the base delay
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(4)
  })

  it('applies jitter: with random()=0 the delay is half the ceiling', async () => {
    const { stream, calls } = setup({ random: () => 0 })
    stream.start()
    await tick()
    calls[0].end()
    await tick()
    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toHaveLength(2)
  })

  it('caps the backoff at 30 s', async () => {
    const { stream, calls } = setup({ random: () => 1 })
    stream.start()
    await tick()
    for (let i = 0; i < 8; i++) {
      calls[calls.length - 1].end()
      await tick()
      await vi.advanceTimersByTimeAsync(30_000)
    }
    const before = calls.length
    calls[before - 1].end()
    await tick()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toHaveLength(before + 1)
  })

  it('retries after a network error', async () => {
    const { stream, calls, fetchMock } = setup()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    stream.start()
    await tick()
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(1)
  })

  it('retries after a stream read error', async () => {
    const { stream, calls } = setup()
    stream.start()
    await tick()
    calls[0].fail(new TypeError('network error'))
    await tick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(2)
  })

  it('does not fetch without a token and retries later', async () => {
    const { stream, calls, getToken } = setup({ tokens: [null, 'tok-2'] })
    stream.start()
    await tick()
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(getToken).toHaveBeenCalledTimes(2)
    expect(calls).toHaveLength(1)
    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe('Bearer tok-2')
  })

  it('retries on a non-401 error status', async () => {
    const { stream, calls, responders } = setup()
    responders.push(() => ({ status: 503 }))
    stream.start()
    await tick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(2)
  })
})

describe('createSseStream — silence watchdog', () => {
  it('treats 60 s without bytes as a dead connection and reconnects', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    calls[0].push(READY)
    await tick()
    await vi.advanceTimersByTimeAsync(59_999)
    expect(calls[0].init.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls[0].init.signal?.aborted).toBe(true)
    expect(handlers.onClose).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(2)
  })

  it('heartbeat comments keep the connection alive', async () => {
    const { stream, calls } = setup()
    stream.start()
    await tick()
    calls[0].push(READY)
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(25_000)
      calls[0].push(': ping\n\n')
    }
    expect(calls[0].init.signal?.aborted).toBe(false)
    expect(calls).toHaveLength(1)
  })

  it('also times out when the server never answers the request', async () => {
    const { stream, calls, fetchMock } = setup()
    let hungSignal: AbortSignal | null | undefined
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          hungSignal = init.signal
          init.signal?.addEventListener('abort', () =>
            rej(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          )
        }) as Promise<Response>,
    )
    stream.start()
    await tick()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(hungSignal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(1) // the retry reached the fake fetch
  })
})

describe('createSseStream — reauth and resync', () => {
  it('on reauth reconnects immediately with a fresh token and keeps the cursor', async () => {
    const { stream, calls } = setup({ tokens: ['old', 'fresh'] })
    stream.start()
    await tick()
    calls[0].push(READY)
    calls[0].push('id: c_1\nevent: notification.created\ndata: {"id":"n1"}\n\n')
    calls[0].push('event: reauth\ndata: {}\n\n')
    await tick()
    expect(calls[0].init.signal?.aborted).toBe(true)
    expect(calls).toHaveLength(2) // no backoff wait
    expect(new Headers(calls[1].init.headers).get('Authorization')).toBe('Bearer fresh')
    expect(calls[1].url).toContain('lastEventId=c_1')
  })

  it('on resync notifies and drops the cursor so the next open is fresh', async () => {
    const { stream, calls, handlers } = setup()
    stream.start()
    await tick()
    calls[0].push(READY)
    calls[0].push('id: c_1\nevent: notification.created\ndata: {"id":"n1"}\n\n')
    calls[0].push('event: resync\ndata: {}\n\n')
    await tick()
    expect(handlers.onResync).toHaveBeenCalledTimes(1)
    calls[0].end()
    await tick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls[1].url).toBe('http://api.test/realtime/stream')
    calls[1].push(READY)
    await tick()
    expect(handlers.onOpen).toHaveBeenLastCalledWith(true)
  })
})

describe('createSseStream — 401 handling', () => {
  it('401 SESSION_SUPERSEDED means revoked: notifies once and stops for good', async () => {
    const { stream, calls, handlers, responders } = setup()
    responders.push(() => ({ status: 401, body: { code: 'SESSION_SUPERSEDED' } }))
    stream.start()
    await tick()
    expect(handlers.onRevokedByServer).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(calls).toHaveLength(1)
  })

  it('401 SESSION_SUPERSEDED for a stale token (we already hold a newer one) reconnects instead', async () => {
    const { stream, calls, handlers, responders } = setup({
      tokens: ['old', 'new'],
      isStaleSupersede: (used) => used === 'old',
    })
    responders.push(() => ({ status: 401, body: { code: 'SESSION_SUPERSEDED' } }))
    stream.start()
    await tick()
    expect(handlers.onRevokedByServer).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toHaveLength(2)
    expect(new Headers(calls[1].init.headers).get('Authorization')).toBe('Bearer new')
  })

  it('any other 401 (expired token, unreadable body) is retried, never treated as revoked', async () => {
    const { stream, calls, handlers, responders } = setup({ tokens: ['a', 'b', 'c'] })
    responders.push(() => ({ status: 401, body: { code: 'AUTH_TOKEN_EXPIRED' } }))
    responders.push(() => ({ status: 401 })) // json() throws
    stream.start()
    await tick()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(3)
    expect(handlers.onRevokedByServer).not.toHaveBeenCalled()
  })
})
