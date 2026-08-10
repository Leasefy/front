import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock getSupabase BEFORE importing the hook. Mirrors use-notifications-realtime.
// ---------------------------------------------------------------------------

type SubscribeCb = (status: string) => void
type ChangeHandler = (payload: { new: Record<string, unknown> }) => void

interface StubChannel {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  __handler: ChangeHandler | null
  __onArgs: unknown[] | null
}

const channels: StubChannel[] = []
const channelNames: string[] = []
let supabaseStub: {
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
} | null = null

function makeChannel(): StubChannel {
  const ch: StubChannel = { on: vi.fn(), subscribe: vi.fn(), __handler: null, __onArgs: null }
  ch.on.mockImplementation((event: string, opts: unknown, handler: ChangeHandler) => {
    ch.__handler = handler
    ch.__onArgs = [event, opts]
    return ch
  })
  ch.subscribe.mockImplementation((cb?: SubscribeCb) => {
    if (cb) cb('SUBSCRIBED')
    return ch
  })
  return ch
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => supabaseStub,
}))

import { useSessionRevocation } from '../use-session-revocation'

beforeEach(() => {
  channels.length = 0
  channelNames.length = 0
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

afterEach(() => {
  vi.restoreAllMocks()
})

interface HarnessRef {
  current: ReturnType<typeof useSessionRevocation> | null
}

function mount(opts: Parameters<typeof useSessionRevocation>[0]): {
  ref: HarnessRef
  root: Root
  container: HTMLDivElement
} {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const Harness = () => {
    ref.current = useSessionRevocation(opts)
    return null
  }
  act(() => {
    root.render(<Harness />)
  })
  return { ref, root, container }
}

describe('useSessionRevocation', () => {
  it('subscribes to session-revocations:{userId} INSERT filter user_id=eq.{id} on session_revocations', () => {
    const { root, container } = mount({
      userId: 'user-1',
      currentSessionId: 'sess-mine',
      onRevoked: vi.fn(),
    })
    expect(channelNames[0]).toBe('session-revocations:user-1')
    const [event, opts] = channels[0].__onArgs as [string, Record<string, unknown>]
    expect(event).toBe('postgres_changes')
    expect(opts.event).toBe('INSERT')
    expect(opts.schema).toBe('public')
    expect(opts.table).toBe('session_revocations')
    expect(opts.filter).toBe('user_id=eq.user-1')
    act(() => root.unmount())
    container.remove()
  })

  it('calls onRevoked when the revoked session is MINE', () => {
    const onRevoked = vi.fn()
    const { root, container } = mount({
      userId: 'user-1',
      currentSessionId: 'sess-mine',
      onRevoked,
    })
    act(() => {
      channels[0].__handler!({
        new: { id: 'r1', user_id: 'user-1', revoked_session_id: 'sess-mine' },
      })
    })
    expect(onRevoked).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('does NOT call onRevoked when the revoked session is a DIFFERENT one (the new device also receives the row)', () => {
    const onRevoked = vi.fn()
    const { root, container } = mount({
      userId: 'user-1',
      currentSessionId: 'sess-mine',
      onRevoked,
    })
    act(() => {
      channels[0].__handler!({
        new: { id: 'r2', user_id: 'user-1', revoked_session_id: 'sess-OTHER' },
      })
    })
    expect(onRevoked).not.toHaveBeenCalled()
    act(() => root.unmount())
    container.remove()
  })

  it('removes the channel on unmount', () => {
    const { root, container } = mount({
      userId: 'user-1',
      currentSessionId: 'sess-mine',
      onRevoked: vi.fn(),
    })
    const removeMock = supabaseStub!.removeChannel
    act(() => root.unmount())
    expect(removeMock).toHaveBeenCalledWith(channels[0])
    container.remove()
  })

  it('no-ops when getSupabase returns null', () => {
    supabaseStub = null
    const { root, container } = mount({
      userId: 'user-1',
      currentSessionId: 'sess-mine',
      onRevoked: vi.fn(),
    })
    expect(channels.length).toBe(0)
    act(() => root.unmount())
    container.remove()
  })

  it('no-ops when userId or currentSessionId is undefined', () => {
    const a = mount({ userId: undefined, currentSessionId: 'sess-mine', onRevoked: vi.fn() })
    expect(channels.length).toBe(0)
    act(() => a.root.unmount())
    a.container.remove()

    const b = mount({ userId: 'user-1', currentSessionId: undefined, onRevoked: vi.fn() })
    expect(channels.length).toBe(0)
    act(() => b.root.unmount())
    b.container.remove()
  })
})
