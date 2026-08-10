import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { BackendNotification } from '@/lib/api/notifications.types'

void React

// ---------------------------------------------------------------------------
// Mocks — auth, the realtime hook, and the notifications service.
// ---------------------------------------------------------------------------

let mockUserId: string | undefined = 'user-1'
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: mockUserId ? { id: mockUserId } : null }),
}))

// Capture the options the hook passes into the realtime subscription so the
// test can drive onInsert / onReconnect directly.
interface CapturedRealtimeOpts {
  userId: string | undefined
  onInsert: (n: BackendNotification) => void
  onReconnect?: () => void
}
let capturedOpts: CapturedRealtimeOpts | null = null
vi.mock('../use-notifications-realtime', () => ({
  useNotificationsRealtime: (opts: CapturedRealtimeOpts) => {
    capturedOpts = opts
    return { isConnected: true }
  },
}))

const getLandlordNotifications = vi.fn()
vi.mock('@/lib/api/notifications.service', () => ({
  notificationsApi: {
    getLandlordNotifications: (...args: unknown[]) => getLandlordNotifications(...args),
    getTenantNotifications: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
  },
}))

import { useLandlordNotifications } from '../useNotifications'

beforeEach(() => {
  capturedOpts = null
  mockUserId = 'user-1'
  getLandlordNotifications.mockReset()
  getLandlordNotifications.mockResolvedValue({ notifications: [], total: 0, unreadCount: 0 })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

interface HarnessRef {
  current: ReturnType<typeof useLandlordNotifications> | null
}

async function mount(
  opts?: Parameters<typeof useLandlordNotifications>[0],
): Promise<{ ref: HarnessRef; root: Root; container: HTMLDivElement }> {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const Harness = () => {
    ref.current = useLandlordNotifications(opts)
    return null
  }
  await act(async () => {
    root.render(<Harness />)
    await Promise.resolve()
  })
  return { ref, root, container }
}

describe('useLandlordNotifications — realtime (no polling)', () => {
  it('fetches once on mount and does NOT poll on an interval', async () => {
    vi.useFakeTimers()
    const { root, container } = await mount()
    expect(getLandlordNotifications).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000) // 10 minutes
      await Promise.resolve()
    })
    expect(getLandlordNotifications).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('passes the auth userId into the realtime subscription', async () => {
    const { root, container } = await mount()
    expect(capturedOpts?.userId).toBe('user-1')
    act(() => root.unmount())
    container.remove()
  })

  it('prepends an incoming realtime notification and bumps unreadCount', async () => {
    const { ref, root, container } = await mount()
    expect(ref.current?.notifications).toHaveLength(0)
    expect(ref.current?.unreadCount).toBe(0)

    const incoming: BackendNotification = {
      id: 'notif-rt-1',
      type: 'APPLICATION_RECEIVED',
      category: 'application',
      title: 'Nueva aplicación',
      message: 'Juan aplicó',
      read: false,
      createdAt: '2026-08-09T10:00:00Z',
      actionUrl: '/panel/candidatos/1',
    }
    act(() => {
      capturedOpts!.onInsert(incoming)
    })

    expect(ref.current?.notifications[0]?.id).toBe('notif-rt-1')
    expect(ref.current?.notifications).toHaveLength(1)
    expect(ref.current?.unreadCount).toBe(1)
    act(() => root.unmount())
    container.remove()
  })

  it('does not fetch or subscribe when enabled is false (inactive role in PlanHeader)', async () => {
    const { root, container } = await mount({ enabled: false })
    expect(getLandlordNotifications).not.toHaveBeenCalled()
    // userId undefined → useNotificationsRealtime no-ops (no channel collision
    // with the active role's hook, which owns notifications:{userId}).
    expect(capturedOpts?.userId).toBeUndefined()
    act(() => root.unmount())
    container.remove()
  })

  it('does not double-insert when the same notification id arrives twice', async () => {
    const { ref, root, container } = await mount()
    const incoming: BackendNotification = {
      id: 'dup-1',
      type: 'PAYMENT_APPROVED',
      category: 'payment',
      title: 'Pago',
      message: '',
      read: false,
      createdAt: '2026-08-09T10:00:00Z',
    }
    act(() => capturedOpts!.onInsert(incoming))
    act(() => capturedOpts!.onInsert(incoming))
    expect(ref.current?.notifications).toHaveLength(1)
    expect(ref.current?.unreadCount).toBe(1)
    act(() => root.unmount())
    container.remove()
  })
})
