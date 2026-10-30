import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Both hooks under NEXT_PUBLIC_REALTIME_PROVIDER=sse. The shared connection is
// replaced by a recorder; Supabase must never be touched.
// ---------------------------------------------------------------------------
import type { RealtimeSubscriber } from '@/lib/realtime/types'

const subs: RealtimeSubscriber[] = []
const offs: Array<ReturnType<typeof vi.fn>> = []
vi.mock('@/lib/realtime/sse-connection', () => ({
  subscribeSse: (s: RealtimeSubscriber) => {
    subs.push(s)
    const off = vi.fn()
    offs.push(off)
    return off
  },
}))
const getSupabase = vi.fn(() => null)
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => getSupabase() }))

import { useNotificationsRealtime } from '../use-notifications-realtime'
import { useSessionRevocation } from '../use-session-revocation'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  subs.length = 0
  offs.length = 0
  getSupabase.mockClear()
  process.env.NEXT_PUBLIC_REALTIME_PROVIDER = ' SSE '
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete process.env.NEXT_PUBLIC_REALTIME_PROVIDER
})

describe('useNotificationsRealtime — sse provider', () => {
  function mountNotifications(props: Parameters<typeof useNotificationsRealtime>[0]) {
    const ref: { current: { isConnected: boolean } | null } = { current: null }
    const Harness = (p: typeof props) => {
      ref.current = useNotificationsRealtime(p)
      return null
    }
    act(() => root.render(<Harness {...props} />))
    return { ref, rerender: (p: typeof props) => act(() => root.render(<Harness {...p} />)) }
  }

  it('delegates to the adapter (no Supabase) and forwards notifications', () => {
    const onInsert = vi.fn()
    mountNotifications({ userId: 'u1', onInsert })
    expect(getSupabase).not.toHaveBeenCalled()
    expect(subs).toHaveLength(1)
    expect(subs[0].userId).toBe('u1')
    const n = { id: 'n1' } as never
    subs[0].onNotification!(n)
    expect(onInsert).toHaveBeenCalledWith(n)
  })

  it('exposes isConnected from the stream and forwards onReconnect', () => {
    const onReconnect = vi.fn()
    const { ref } = mountNotifications({ userId: 'u1', onInsert: vi.fn(), onReconnect })
    expect(ref.current!.isConnected).toBe(false)
    act(() => subs[0].onConnectionChange!(true))
    expect(ref.current!.isConnected).toBe(true)
    subs[0].onReconnect!()
    expect(onReconnect).toHaveBeenCalledTimes(1)
    act(() => subs[0].onConnectionChange!(false))
    expect(ref.current!.isConnected).toBe(false)
  })

  it('keeps ONE subscription when the callbacks change identity (no stream churn)', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = mountNotifications({ userId: 'u1', onInsert: first, onReconnect: () => {} })
    rerender({ userId: 'u1', onInsert: second, onReconnect: () => {} })
    expect(subs).toHaveLength(1)
    subs[0].onNotification!({ id: 'n' } as never)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('resubscribes when the user changes and closes the old subscription', () => {
    const { rerender } = mountNotifications({ userId: 'u1', onInsert: vi.fn() })
    rerender({ userId: 'u2', onInsert: vi.fn() })
    expect(subs.map((s) => s.userId)).toEqual(['u1', 'u2'])
    expect(offs[0]).toHaveBeenCalledTimes(1)
  })

  it('does not subscribe without a user and closes on unmount', () => {
    const { rerender } = mountNotifications({ userId: undefined, onInsert: vi.fn() })
    expect(subs).toHaveLength(0)
    rerender({ userId: 'u1', onInsert: vi.fn() })
    act(() => root.unmount())
    expect(offs[0]).toHaveBeenCalledTimes(1)
    root = createRoot(container) // afterEach unmounts again
  })
})

describe('useSessionRevocation — sse provider', () => {
  function mountRevocation(props: Parameters<typeof useSessionRevocation>[0]) {
    const Harness = (p: typeof props) => {
      useSessionRevocation(p)
      return null
    }
    act(() => root.render(<Harness {...props} />))
    return (p: typeof props) => act(() => root.render(<Harness {...p} />))
  }

  it('revokedSessionId === null means THIS session: signs out', () => {
    const onRevoked = vi.fn()
    mountRevocation({ userId: 'u1', currentSessionId: 's-mine', onRevoked })
    expect(getSupabase).not.toHaveBeenCalled()
    subs[0].onSessionRevoked!({ revokedSessionId: null })
    expect(onRevoked).toHaveBeenCalledTimes(1)
  })

  it('a matching session id signs out', () => {
    const onRevoked = vi.fn()
    mountRevocation({ userId: 'u1', currentSessionId: 's-mine', onRevoked })
    subs[0].onSessionRevoked!({ revokedSessionId: 's-mine' })
    expect(onRevoked).toHaveBeenCalledTimes(1)
  })

  it('a different session id is ignored (the device that just claimed also hears it)', () => {
    const onRevoked = vi.fn()
    mountRevocation({ userId: 'u1', currentSessionId: 's-mine', onRevoked })
    subs[0].onSessionRevoked!({ revokedSessionId: 's-old' })
    expect(onRevoked).not.toHaveBeenCalled()
  })

  it('uses the latest onRevoked without resubscribing', () => {
    const first = vi.fn()
    const second = vi.fn()
    const rerender = mountRevocation({ userId: 'u1', currentSessionId: 's', onRevoked: first })
    rerender({ userId: 'u1', currentSessionId: 's', onRevoked: second })
    expect(subs).toHaveLength(1)
    subs[0].onSessionRevoked!({ revokedSessionId: null })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('compares against the CURRENT session id after it changes', () => {
    const onRevoked = vi.fn()
    const rerender = mountRevocation({ userId: 'u1', currentSessionId: 's1', onRevoked })
    rerender({ userId: 'u1', currentSessionId: 's2', onRevoked })
    subs[subs.length - 1].onSessionRevoked!({ revokedSessionId: 's1' })
    expect(onRevoked).not.toHaveBeenCalled()
    subs[subs.length - 1].onSessionRevoked!({ revokedSessionId: 's2' })
    expect(onRevoked).toHaveBeenCalledTimes(1)
  })

  it('does not subscribe without user or session id, and closes on unmount', () => {
    mountRevocation({ userId: 'u1', currentSessionId: undefined, onRevoked: vi.fn() })
    expect(subs).toHaveLength(0)
  })
})
