import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Replace the transport: capture every created stream and its handlers.
// ---------------------------------------------------------------------------

interface FakeStream {
  url: string
  handlers: import('./sse-stream').SseStreamHandlers
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  getToken: () => Promise<string | null>
  isStaleSupersede?: (t: string) => boolean
}
const streams: FakeStream[] = []

vi.mock('./sse-stream', () => ({
  createSseStream: (o: {
    url: string
    handlers: FakeStream['handlers']
    getToken: FakeStream['getToken']
    isStaleSupersede?: FakeStream['isStaleSupersede']
  }) => {
    const s: FakeStream = {
      url: o.url,
      handlers: o.handlers,
      getToken: o.getToken,
      isStaleSupersede: o.isStaleSupersede,
      start: vi.fn(),
      stop: vi.fn(),
    }
    streams.push(s)
    return s
  },
}))

const clientState = { token: 'tok' as string | null, terminated: false }
const asegurarSesionVigente = vi.fn(async () => {})
vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => clientState.token,
  asegurarSesionVigente: () => asegurarSesionVigente(),
  esRespuestaDeUnTokenViejo: (code: string | undefined, used: string) =>
    code === 'SESSION_SUPERSEDED' && clientState.token !== used,
}))
vi.mock('@/lib/auth/session-terminal', () => ({
  sesionTerminada: () => clientState.terminated,
}))

import { subscribeSse, streamUrl } from './sse-connection'

function subscriber() {
  return {
    onNotification: vi.fn(),
    onSessionRevoked: vi.fn(),
    onReconnect: vi.fn(),
    onConnectionChange: vi.fn(),
  }
}

beforeEach(() => {
  streams.length = 0
  clientState.token = 'tok'
  clientState.terminated = false
  asegurarSesionVigente.mockClear()
})

describe('subscribeSse — multiplexing', () => {
  it('opens ONE stream per user, shared by every subscriber', () => {
    const a = subscriber()
    const b = subscriber()
    const offA = subscribeSse({ userId: 'u1', ...a })
    const offB = subscribeSse({ userId: 'u1', ...b })
    expect(streams).toHaveLength(1)
    expect(streams[0].start).toHaveBeenCalledTimes(1)
    offA()
    expect(streams[0].stop).not.toHaveBeenCalled()
    offB()
    expect(streams[0].stop).toHaveBeenCalledTimes(1)
  })

  it('uses a separate stream per user', () => {
    const off1 = subscribeSse({ userId: 'u1', ...subscriber() })
    const off2 = subscribeSse({ userId: 'u2', ...subscriber() })
    expect(streams).toHaveLength(2)
    off1()
    expect(streams[0].stop).toHaveBeenCalled()
    expect(streams[1].stop).not.toHaveBeenCalled()
    off2()
  })

  it('opens a fresh stream after the last subscriber left', () => {
    subscribeSse({ userId: 'u1', ...subscriber() })()
    const off = subscribeSse({ userId: 'u1', ...subscriber() })
    expect(streams).toHaveLength(2)
    off()
  })

  it('unsubscribing twice is harmless', () => {
    const off = subscribeSse({ userId: 'u1', ...subscriber() })
    off()
    off()
    expect(streams[0].stop).toHaveBeenCalledTimes(1)
  })

  it('targets <backend>/realtime/stream', () => {
    expect(streamUrl()).toMatch(/\/realtime\/stream$/)
  })
})

describe('subscribeSse — event fan-out', () => {
  it('delivers notifications and session.revoked to every subscriber', () => {
    const a = subscriber()
    const b = subscriber()
    const offA = subscribeSse({ userId: 'u1', ...a })
    const offB = subscribeSse({ userId: 'u1', ...b })
    const n = { id: 'n1' } as never
    streams[0].handlers.onNotification(n)
    streams[0].handlers.onSessionRevoked({ revokedSessionId: 's1' })
    for (const s of [a, b]) {
      expect(s.onNotification).toHaveBeenCalledWith(n)
      expect(s.onSessionRevoked).toHaveBeenCalledWith({ revokedSessionId: 's1' })
    }
    offA()
    offB()
  })

  it('a subscriber without a given callback is simply skipped', () => {
    const off = subscribeSse({ userId: 'u1', onSessionRevoked: vi.fn() })
    expect(() => streams[0].handlers.onNotification({ id: 'n' } as never)).not.toThrow()
    off()
  })

  it('a throwing subscriber does not starve the others', () => {
    const bad = subscriber()
    bad.onNotification.mockImplementation(() => {
      throw new Error('boom')
    })
    const good = subscriber()
    const offA = subscribeSse({ userId: 'u1', ...bad })
    const offB = subscribeSse({ userId: 'u1', ...good })
    streams[0].handlers.onNotification({ id: 'n' } as never)
    expect(good.onNotification).toHaveBeenCalled()
    offA()
    offB()
  })

  it('a subscriber removed mid-dispatch no longer receives events', () => {
    const a = subscriber()
    const b = subscriber()
    let offB: () => void = () => {}
    a.onNotification.mockImplementation(() => offB())
    const offA = subscribeSse({ userId: 'u1', ...a })
    offB = subscribeSse({ userId: 'u1', ...b })
    streams[0].handlers.onNotification({ id: 'n' } as never)
    expect(b.onNotification).not.toHaveBeenCalled()
    offA()
  })
})

describe('subscribeSse — connection state and refetch signals', () => {
  it('fresh open: connection true + onReconnect (gap cannot be ruled out)', () => {
    const a = subscriber()
    const off = subscribeSse({ userId: 'u1', ...a })
    streams[0].handlers.onOpen(true)
    expect(a.onConnectionChange).toHaveBeenLastCalledWith(true)
    expect(a.onReconnect).toHaveBeenCalledTimes(1)
    off()
  })

  it('resumed open (cursor sent): connection true, NO refetch — the backfill closes the gap', () => {
    const a = subscriber()
    const off = subscribeSse({ userId: 'u1', ...a })
    streams[0].handlers.onOpen(false)
    expect(a.onConnectionChange).toHaveBeenLastCalledWith(true)
    expect(a.onReconnect).not.toHaveBeenCalled()
    off()
  })

  it('resync triggers the refetch', () => {
    const a = subscriber()
    const off = subscribeSse({ userId: 'u1', ...a })
    streams[0].handlers.onResync()
    expect(a.onReconnect).toHaveBeenCalledTimes(1)
    off()
  })

  it('close reports the connection as down', () => {
    const a = subscriber()
    const off = subscribeSse({ userId: 'u1', ...a })
    streams[0].handlers.onOpen(true)
    streams[0].handlers.onClose()
    expect(a.onConnectionChange).toHaveBeenLastCalledWith(false)
    off()
  })

  it('a late subscriber joining a live stream is told it is connected, like an initial SUBSCRIBED', () => {
    const first = subscriber()
    const offA = subscribeSse({ userId: 'u1', ...first })
    streams[0].handlers.onOpen(true)
    const late = subscriber()
    const offB = subscribeSse({ userId: 'u1', ...late })
    expect(late.onConnectionChange).toHaveBeenCalledWith(true)
    expect(late.onReconnect).toHaveBeenCalledTimes(1)
    expect(streams).toHaveLength(1)
    offA()
    offB()
  })

  it('a late subscriber joining a stream that is not up yet gets nothing until it opens', () => {
    const offA = subscribeSse({ userId: 'u1', ...subscriber() })
    const late = subscriber()
    const offB = subscribeSse({ userId: 'u1', ...late })
    expect(late.onConnectionChange).not.toHaveBeenCalled()
    expect(late.onReconnect).not.toHaveBeenCalled()
    offA()
    offB()
  })
})

describe('subscribeSse — server-side revocation (401 SESSION_SUPERSEDED)', () => {
  it('tells every subscriber THIS session is revoked (null) and drops the dead stream', () => {
    const a = subscriber()
    const b = subscriber()
    const offA = subscribeSse({ userId: 'u1', ...a })
    const offB = subscribeSse({ userId: 'u1', ...b })
    streams[0].handlers.onRevokedByServer()
    for (const s of [a, b]) {
      expect(s.onSessionRevoked).toHaveBeenCalledWith({ revokedSessionId: null })
      expect(s.onConnectionChange).toHaveBeenLastCalledWith(false)
    }
    // the dead stream is not reused by a later subscribe
    const off3 = subscribeSse({ userId: 'u1', ...subscriber() })
    expect(streams).toHaveLength(2)
    offA()
    offB()
    off3()
  })
})

describe('subscribeSse — token source', () => {
  it('refreshes a near-expiry token before reading it', async () => {
    const off = subscribeSse({ userId: 'u1', ...subscriber() })
    clientState.token = 'fresh'
    await expect(streams[0].getToken()).resolves.toBe('fresh')
    expect(asegurarSesionVigente).toHaveBeenCalledTimes(1)
    off()
  })

  it('gives no token once the session is terminal', async () => {
    const off = subscribeSse({ userId: 'u1', ...subscriber() })
    clientState.terminated = true
    await expect(streams[0].getToken()).resolves.toBeNull()
    off()
  })

  it('knows a SESSION_SUPERSEDED for an old token is not ours', () => {
    const off = subscribeSse({ userId: 'u1', ...subscriber() })
    clientState.token = 'newer'
    expect(streams[0].isStaleSupersede?.('older')).toBe(true)
    expect(streams[0].isStaleSupersede?.('newer')).toBe(false)
    off()
  })
})
