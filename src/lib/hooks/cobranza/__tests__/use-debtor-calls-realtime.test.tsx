import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock getSupabase BEFORE importing the hook under test.
// ---------------------------------------------------------------------------

type SubscribeCb = (status: string) => void
type ChangeHandler = (payload: { new: Record<string, unknown> }) => void

interface StubChannel {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  __handler: ChangeHandler | null
  __subscribeCb: SubscribeCb | null
  __onArgs: unknown[] | null
}

const channels: StubChannel[] = []
const channelNames: string[] = []
let supabaseStub: {
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
} | null = null

function makeChannel(): StubChannel {
  const ch: StubChannel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    __handler: null,
    __subscribeCb: null,
    __onArgs: null,
  }
  ch.on.mockImplementation((event: string, opts: unknown, handler: ChangeHandler) => {
    ch.__handler = handler
    ch.__onArgs = [event, opts]
    return ch
  })
  ch.subscribe.mockImplementation((cb: SubscribeCb) => {
    ch.__subscribeCb = cb
    cb('SUBSCRIBED')
    return ch
  })
  return ch
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => supabaseStub,
}))

import { useDebtorCallsRealtime } from '../use-debtor-calls-realtime'

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
  current: ReturnType<typeof useDebtorCallsRealtime> | null
}

function mount(opts: Parameters<typeof useDebtorCallsRealtime>[0]): {
  ref: HarnessRef
  root: Root
  container: HTMLDivElement
} {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = useDebtorCallsRealtime(opts)
    return null
  }

  act(() => {
    root.render(<Harness />)
  })

  return { ref, root, container }
}

describe('useDebtorCallsRealtime', () => {
  it('Test 1: subscribes to agent:calls:{debtorId} with INSERT filter debtor_id=eq.{id}', () => {
    const { root, container } = mount({
      debtorId: 'D-42',
      onNewCall: vi.fn(),
    })
    expect(channelNames[0]).toBe('agent:calls:D-42')
    expect(channels.length).toBe(1)
    const [event, opts] = channels[0].__onArgs as [string, Record<string, unknown>]
    expect(event).toBe('postgres_changes')
    expect(opts.event).toBe('INSERT')
    expect(opts.schema).toBe('public')
    expect(opts.table).toBe('calls')
    expect(opts.filter).toBe('debtor_id=eq.D-42')
    act(() => root.unmount())
    container.remove()
  })

  it('Test 2: maps snake_case INSERT payload to camelCase DebtorCallEvent', () => {
    const onNew = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-7',
      onNewCall: onNew,
    })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'row-1',
          debtor_id: 'D-7',
          call_id: 'CALL-99',
          started_at: '2026-05-27T10:00:00Z',
          ended_at: '2026-05-27T10:02:30Z',
          status: 'completed',
          qa_score: 85,
        },
      })
    })
    expect(onNew).toHaveBeenCalledTimes(1)
    expect(onNew).toHaveBeenCalledWith({
      id: 'row-1',
      debtorId: 'D-7',
      callId: 'CALL-99',
      startedAt: '2026-05-27T10:00:00Z',
      endedAt: '2026-05-27T10:02:30Z',
      status: 'completed',
      qaScore: 85,
    })
    act(() => root.unmount())
    container.remove()
  })

  it('Test 3: invokes onReconnect on SUBSCRIBED', () => {
    const onReconnect = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-1',
      onNewCall: vi.fn(),
      onReconnect,
    })
    expect(onReconnect).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 4: returns isConnected correctly across status transitions', () => {
    const { ref, root, container } = mount({
      debtorId: 'D-1',
      onNewCall: vi.fn(),
    })
    expect(ref.current?.isConnected).toBe(true)
    act(() => {
      channels[0].__subscribeCb!('CHANNEL_ERROR')
    })
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 5: removes channel on unmount', () => {
    const { root, container } = mount({
      debtorId: 'D-1',
      onNewCall: vi.fn(),
    })
    const removeMock = supabaseStub!.removeChannel
    expect(removeMock).not.toHaveBeenCalled()
    act(() => root.unmount())
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledWith(channels[0])
    container.remove()
  })

  it('Test 6: no-op when getSupabase returns null', () => {
    supabaseStub = null
    const { ref, root, container } = mount({
      debtorId: 'D-1',
      onNewCall: vi.fn(),
    })
    expect(channels.length).toBe(0)
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 7: endedAt + qaScore are null (not coerced to 0/empty) when row fields are null/undefined', () => {
    const onNew = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-3',
      onNewCall: onNew,
    })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'row-2',
          debtor_id: 'D-3',
          call_id: 'CALL-IN-PROGRESS',
          started_at: '2026-05-27T11:00:00Z',
          ended_at: null,
          status: 'in_progress',
          qa_score: null,
        },
      })
    })
    expect(onNew).toHaveBeenCalledWith(
      expect.objectContaining({
        endedAt: null,
        qaScore: null,
      }),
    )
    act(() => root.unmount())
    container.remove()
  })
})
