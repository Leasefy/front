import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock getSupabase BEFORE importing the hook under test. Mirrors the cobranza
// realtime hook tests (use-debtor-calls-realtime.test.tsx).
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

import { useNotificationsRealtime } from '../use-notifications-realtime'
import type { BackendNotification } from '@/lib/api/notifications.types'

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
  current: ReturnType<typeof useNotificationsRealtime> | null
}

function mount(opts: Parameters<typeof useNotificationsRealtime>[0]): {
  ref: HarnessRef
  root: Root
  container: HTMLDivElement
} {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = useNotificationsRealtime(opts)
    return null
  }

  act(() => {
    root.render(<Harness />)
  })

  return { ref, root, container }
}

describe('useNotificationsRealtime', () => {
  it('subscribes to notifications:{userId} with INSERT filter user_id=eq.{id} on notification_logs', () => {
    const { root, container } = mount({ userId: 'user-1', onInsert: vi.fn() })
    expect(channelNames[0]).toBe('notifications:user-1')
    expect(channels.length).toBe(1)
    const [event, opts] = channels[0].__onArgs as [string, Record<string, unknown>]
    expect(event).toBe('postgres_changes')
    expect(opts.event).toBe('INSERT')
    expect(opts.schema).toBe('public')
    expect(opts.table).toBe('notification_logs')
    expect(opts.filter).toBe('user_id=eq.user-1')
    act(() => root.unmount())
    container.remove()
  })

  it('maps a snake_case IN_APP INSERT payload and calls onInsert with a BackendNotification', () => {
    const onInsert = vi.fn()
    const { root, container } = mount({ userId: 'user-1', onInsert })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'notif-1',
          template_code: 'APPLICATION_RECEIVED',
          subject: 'Nueva aplicación',
          body: 'Juan aplicó',
          action_url: '/panel/candidatos/1',
          metadata: { applicationId: 'app-1' },
          read_at: null,
          created_at: '2026-08-09T10:00:00Z',
          channel: 'IN_APP',
          user_id: 'user-1',
        },
      })
    })
    expect(onInsert).toHaveBeenCalledTimes(1)
    const arg = onInsert.mock.calls[0][0] as BackendNotification
    expect(arg).toEqual({
      id: 'notif-1',
      type: 'APPLICATION_RECEIVED',
      category: 'application',
      title: 'Nueva aplicación',
      message: 'Juan aplicó',
      read: false,
      createdAt: '2026-08-09T10:00:00Z',
      actionUrl: '/panel/candidatos/1',
      metadata: { applicationId: 'app-1' },
    })
    act(() => root.unmount())
    container.remove()
  })

  it('ignores rows whose channel is not IN_APP (audit rows for EMAIL/PUSH/SMS)', () => {
    const onInsert = vi.fn()
    const { root, container } = mount({ userId: 'user-1', onInsert })
    act(() => {
      channels[0].__handler!({
        new: {
          id: 'notif-email',
          template_code: 'PAYMENT_APPROVED',
          subject: 'Pago',
          read_at: null,
          created_at: '2026-08-09T10:00:00Z',
          channel: 'EMAIL',
          user_id: 'user-1',
        },
      })
    })
    expect(onInsert).not.toHaveBeenCalled()
    act(() => root.unmount())
    container.remove()
  })

  it('invokes onReconnect on SUBSCRIBED', () => {
    const onReconnect = vi.fn()
    const { root, container } = mount({ userId: 'user-1', onInsert: vi.fn(), onReconnect })
    expect(onReconnect).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('returns isConnected correctly across status transitions', () => {
    const { ref, root, container } = mount({ userId: 'user-1', onInsert: vi.fn() })
    expect(ref.current?.isConnected).toBe(true)
    act(() => {
      channels[0].__subscribeCb!('CHANNEL_ERROR')
    })
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it('removes the channel on unmount', () => {
    const { root, container } = mount({ userId: 'user-1', onInsert: vi.fn() })
    const removeMock = supabaseStub!.removeChannel
    expect(removeMock).not.toHaveBeenCalled()
    act(() => root.unmount())
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledWith(channels[0])
    container.remove()
  })

  it('no-ops when getSupabase returns null', () => {
    supabaseStub = null
    const { ref, root, container } = mount({ userId: 'user-1', onInsert: vi.fn() })
    expect(channels.length).toBe(0)
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })

  it('no-ops when userId is undefined (no session yet)', () => {
    const { ref, root, container } = mount({ userId: undefined, onInsert: vi.fn() })
    expect(channels.length).toBe(0)
    expect(ref.current?.isConnected).toBe(false)
    act(() => root.unmount())
    container.remove()
  })
})
