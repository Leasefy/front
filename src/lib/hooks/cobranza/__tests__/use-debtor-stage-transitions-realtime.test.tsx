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
    // Default: synchronously fire SUBSCRIBED
    cb('SUBSCRIBED')
    return ch
  })
  return ch
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => supabaseStub,
}))

// ---------------------------------------------------------------------------
// Now import the hook (which will pick up the mock).
// ---------------------------------------------------------------------------

import { useDebtorStageTransitionsRealtime } from '../use-debtor-stage-transitions-realtime'

beforeEach(() => {
  channels.length = 0
  supabaseStub = {
    channel: vi.fn((_name: string) => {
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

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface HarnessRef {
  current: ReturnType<typeof useDebtorStageTransitionsRealtime> | null
}

function mount(opts: {
  debtorId: string
  onNewTransition: (t: Parameters<Parameters<typeof useDebtorStageTransitionsRealtime>[0]['onNewTransition']>[0]) => void
  onReconnect?: () => void
}): { ref: HarnessRef; root: Root; container: HTMLDivElement } {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = useDebtorStageTransitionsRealtime(opts)
    return null
  }

  act(() => {
    root.render(<Harness />)
  })

  return { ref, root, container }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDebtorStageTransitionsRealtime', () => {
  it('Test 1: subscribes to agent:cartera_stage_transitions with INSERT filter debtor_id=eq.{id}', () => {
    const { root, container } = mount({
      debtorId: 'D-42',
      onNewTransition: vi.fn(),
    })
    expect(supabaseStub!.channel).toHaveBeenCalledWith('agent:cartera_stage_transitions')
    expect(channels.length).toBe(1)
    const [event, opts] = channels[0].__onArgs as [string, Record<string, unknown>]
    expect(event).toBe('postgres_changes')
    expect(opts.event).toBe('INSERT')
    expect(opts.schema).toBe('public')
    expect(opts.table).toBe('cartera_stage_transitions')
    expect(opts.filter).toBe('debtor_id=eq.D-42')
    act(() => root.unmount())
    container.remove()
  })

  it('Test 2: maps snake_case INSERT payload to camelCase DebtorStageTransitionEvent', () => {
    const onNew = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-7',
      onNewTransition: onNew,
    })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'st-1',
          debtor_id: 'D-7',
          from_stage: 'S2',
          to_stage: 'S3',
          reason: 'PTP broken',
          transitioned_at: '2026-05-27T10:00:00Z',
          actor: 'agent',
        },
      })
    })
    expect(onNew).toHaveBeenCalledTimes(1)
    expect(onNew).toHaveBeenCalledWith({
      id: 'st-1',
      debtorId: 'D-7',
      fromStage: 'S2',
      toStage: 'S3',
      reason: 'PTP broken',
      transitionedAt: '2026-05-27T10:00:00Z',
      actor: 'agent',
    })
    act(() => root.unmount())
    container.remove()
  })

  it('Test 3: invokes onReconnect when subscribe status is SUBSCRIBED', () => {
    const onReconnect = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-1',
      onNewTransition: vi.fn(),
      onReconnect,
    })
    // makeChannel synchronously fires SUBSCRIBED on subscribe()
    expect(onReconnect).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 4: returns isConnected true when SUBSCRIBED, false otherwise', () => {
    const { ref, root, container } = mount({
      debtorId: 'D-1',
      onNewTransition: vi.fn(),
    })
    expect(ref.current?.isConnected).toBe(true)
    // Simulate a CHANNEL_ERROR pulse
    act(() => {
      channels[0].__subscribeCb!('CHANNEL_ERROR')
    })
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 5: removes channel exactly once on unmount', () => {
    const { root, container } = mount({
      debtorId: 'D-1',
      onNewTransition: vi.fn(),
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
      onNewTransition: vi.fn(),
    })
    expect(channels.length).toBe(0)
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it("Test 7: preserves actor='admin:override' (not collapsed to 'human')", () => {
    const onNew = vi.fn()
    const { root, container } = mount({
      debtorId: 'D-9',
      onNewTransition: onNew,
    })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'st-2',
          debtor_id: 'D-9',
          from_stage: 'S3',
          to_stage: 'S2',
          reason: 'admin override after dispute',
          transitioned_at: '2026-05-27T11:00:00Z',
          actor: 'admin:override',
        },
      })
    })
    expect(onNew).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'admin:override' }),
    )
    act(() => root.unmount())
    container.remove()
  })
})
