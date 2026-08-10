import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const signOut = vi.fn().mockResolvedValue(undefined)
let mockUser: { id: string } | null = { id: 'user-1' }
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: mockUser, signOut }),
}))

interface CapturedOpts {
  userId: string | undefined
  currentSessionId: string | undefined
  onRevoked: () => void
}
let captured: CapturedOpts | null = null
vi.mock('@/lib/hooks/use-session-revocation', () => ({
  useSessionRevocation: (opts: CapturedOpts) => {
    captured = opts
  },
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'the-token',
}))

vi.mock('@/lib/auth/jwt', () => ({
  decodeAccessToken: (t: string | null) => (t ? { session_id: 'sess-mine' } : null),
}))

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

import { SessionRevocationHandler } from '../SessionRevocationHandler'

beforeEach(() => {
  captured = null
  mockUser = { id: 'user-1' }
  signOut.mockClear()
  push.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mount(): { root: Root; container: HTMLDivElement } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<SessionRevocationHandler />)
  })
  return { root, container }
}

describe('SessionRevocationHandler', () => {
  it('passes the auth userId and decoded session_id into useSessionRevocation', () => {
    const { root, container } = mount()
    expect(captured?.userId).toBe('user-1')
    expect(captured?.currentSessionId).toBe('sess-mine')
    act(() => root.unmount())
    container.remove()
  })

  it('renders nothing until a revocation for THIS session arrives', () => {
    const { root, container } = mount()
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('on revocation: signs out and shows the "signed in elsewhere" dialog', () => {
    const { root, container } = mount()
    act(() => {
      captured!.onRevoked()
    })
    expect(signOut).toHaveBeenCalledTimes(1)
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('otro dispositivo')
    act(() => root.unmount())
    container.remove()
  })
})
