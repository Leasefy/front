import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Supabase side: same stub shape the legacy hook tests used.
// ---------------------------------------------------------------------------
type ChangeHandler = (payload: { new: Record<string, unknown> }) => void
interface StubChannel {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  handler: ChangeHandler | null
  opts: unknown
  statusCb: ((s: string) => void) | null
}
const channels: StubChannel[] = []
const channelNames: string[] = []
let supabaseStub: {
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
} | null = null

function makeChannel(): StubChannel {
  const ch: StubChannel = { on: vi.fn(), subscribe: vi.fn(), handler: null, opts: null, statusCb: null }
  ch.on.mockImplementation((_e: string, opts: unknown, handler: ChangeHandler) => {
    ch.handler = handler
    ch.opts = opts
    return ch
  })
  ch.subscribe.mockImplementation((cb?: (s: string) => void) => {
    ch.statusCb = cb ?? null
    return ch
  })
  return ch
}
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => supabaseStub }))

// ---------------------------------------------------------------------------
// SSE side: replace the shared connection.
// ---------------------------------------------------------------------------
const subscribeSse = vi.fn()
const unsubscribeSse = vi.fn()
vi.mock('./sse-connection', () => ({
  subscribeSse: (s: unknown) => {
    subscribeSse(s)
    return unsubscribeSse
  },
}))

import { subscribeRealtime } from './subscribe-realtime'

beforeEach(() => {
  channels.length = 0
  channelNames.length = 0
  subscribeSse.mockClear()
  unsubscribeSse.mockClear()
  supabaseStub = {
    channel: vi.fn((name: string) => {
      channelNames.push(name)
      const ch = makeChannel()
      channels.push(ch)
      return ch
    }),
    removeChannel: vi.fn(),
  }
})

describe('subscribeRealtime — provider selection', () => {
  it('uses supabase when the provider is supabase', () => {
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn() }, 'supabase')
    expect(supabaseStub!.channel).toHaveBeenCalled()
    expect(subscribeSse).not.toHaveBeenCalled()
  })

  it('uses the SSE connection when the provider is sse (and never touches Supabase)', () => {
    const onNotification = vi.fn()
    const off = subscribeRealtime({ userId: 'u1', onNotification }, 'sse')
    expect(subscribeSse).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', onNotification }))
    expect(supabaseStub!.channel).not.toHaveBeenCalled()
    off()
    expect(unsubscribeSse).toHaveBeenCalledTimes(1)
  })

  it('defaults to the provider compiled into the build (supabase when unset)', () => {
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn() })
    expect(supabaseStub!.channel).toHaveBeenCalled()
  })
})

describe('subscribeRealtime — supabase implementation (channels unchanged)', () => {
  it('notifications: filters to the user, skips non-IN_APP rows and maps the row', () => {
    const onNotification = vi.fn()
    subscribeRealtime({ userId: 'u1', onNotification }, 'supabase')
    expect(channelNames[0]).toMatch(/^notifications:u1:/)
    expect(channels[0].opts).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'notification_logs',
      filter: 'user_id=eq.u1',
    })
    channels[0].handler!({ new: { id: 'a', channel: 'EMAIL' } })
    expect(onNotification).not.toHaveBeenCalled()
    channels[0].handler!({
      new: { id: 'a', channel: 'IN_APP', template_code: 'PAYMENT_X', subject: 'S', created_at: 'c' },
    })
    expect(onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', category: 'payment', title: 'S' }),
    )
  })

  it('two subscribers get different notification channel names', () => {
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn() }, 'supabase')
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn() }, 'supabase')
    expect(channelNames[0]).not.toBe(channelNames[1])
  })

  it('reports connection state and onReconnect on every SUBSCRIBED', () => {
    const onConnectionChange = vi.fn()
    const onReconnect = vi.fn()
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn(), onConnectionChange, onReconnect }, 'supabase')
    channels[0].statusCb!('SUBSCRIBED')
    expect(onConnectionChange).toHaveBeenLastCalledWith(true)
    expect(onReconnect).toHaveBeenCalledTimes(1)
    channels[0].statusCb!('CLOSED')
    expect(onConnectionChange).toHaveBeenLastCalledWith(false)
    channels[0].statusCb!('SUBSCRIBED')
    expect(onReconnect).toHaveBeenCalledTimes(2)
  })

  it('session revocations: its own channel on session_revocations, maps revoked_session_id', () => {
    const onSessionRevoked = vi.fn()
    subscribeRealtime({ userId: 'u1', onSessionRevoked }, 'supabase')
    expect(channelNames).toEqual(['session-revocations:u1'])
    expect(channels[0].opts).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'session_revocations',
      filter: 'user_id=eq.u1',
    })
    channels[0].handler!({ new: { revoked_session_id: 's9' } })
    expect(onSessionRevoked).toHaveBeenCalledWith({ revokedSessionId: 's9' })
  })

  it('ignores a session_revocations row whose revoked_session_id is not a string (legacy behaviour: no match, no sign-out)', () => {
    const onSessionRevoked = vi.fn()
    subscribeRealtime({ userId: 'u1', onSessionRevoked }, 'supabase')
    channels[0].handler!({ new: { revoked_session_id: null } })
    channels[0].handler!({ new: {} })
    channels[0].handler!({ new: { revoked_session_id: 42 } })
    expect(onSessionRevoked).not.toHaveBeenCalled()
  })

  it('a subscriber that only wants revocations opens no notifications channel (and vice versa)', () => {
    subscribeRealtime({ userId: 'u1', onSessionRevoked: vi.fn() }, 'supabase')
    expect(channelNames.some((n) => n.startsWith('notifications:'))).toBe(false)
    channelNames.length = 0
    subscribeRealtime({ userId: 'u1', onNotification: vi.fn() }, 'supabase')
    expect(channelNames.some((n) => n.startsWith('session-revocations:'))).toBe(false)
  })

  it('unsubscribe removes every channel it opened', () => {
    const off = subscribeRealtime(
      { userId: 'u1', onNotification: vi.fn(), onSessionRevoked: vi.fn() },
      'supabase',
    )
    off()
    expect(supabaseStub!.removeChannel).toHaveBeenCalledTimes(2)
  })

  it('is a no-op when there is no Supabase client', () => {
    supabaseStub = null
    const off = subscribeRealtime({ userId: 'u1', onNotification: vi.fn() }, 'supabase')
    expect(() => off()).not.toThrow()
  })
})
