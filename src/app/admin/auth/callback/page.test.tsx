/**
 * /admin/auth/callback — regression tests for the getSession() deadlock.
 *
 * The callback must NEVER call sb.auth.getSession() (it deadlocks while the
 * app-wide AuthProvider's onAuthStateChange is mid-flight → the page hangs on
 * "verificando sesión…"). It subscribes to onAuthStateChange and navigates on
 * the exchanged session, waiting past a stale INITIAL_SESSION when returning
 * from a magic link.
 *
 * createRoot + act (repo convention, no RTL).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthCb = (event: string, session: unknown) => void

const state = vi.hoisted(() => ({
  search: '' as string,
  authCb: null as AuthCb | null,
  getSessionCalls: 0,
  unsubscribed: false,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.search),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        state.authCb = cb
        return { data: { subscription: { unsubscribe: () => { state.unsubscribed = true } } } }
      },
      // If the callback ever calls this, it would deadlock in prod. The test
      // asserts it is never invoked.
      getSession: () => {
        state.getSessionCalls++
        return new Promise(() => {}) // never resolves — mirrors the real deadlock
      },
    },
  }),
}))

import AdminAuthCallbackPage from './page'

const SESSION = { access_token: 'tok', user: { email: 'admin@leasefy.co' } }
const STALE_SESSION = { access_token: 'old', user: { email: 'tenant@gmail.com' } }

let container: HTMLDivElement
let root: Root
const realLocation = window.location

function setLocation(hash: string) {
  Object.defineProperty(window, 'location', {
    value: { href: '', hash },
    writable: true,
    configurable: true,
  })
}

async function emit(event: string, session: unknown) {
  await act(async () => {
    state.authCb?.(event, session)
  })
}

beforeEach(() => {
  state.search = ''
  state.authCb = null
  state.getSessionCalls = 0
  state.unsubscribed = false
  setLocation('')
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true })
})

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(AdminAuthCallbackPage))
  })
}

describe('AdminAuthCallbackPage', () => {
  it('never calls getSession() (the deadlock source)', async () => {
    state.search = 'code=abc'
    await mount()
    await emit('SIGNED_IN', SESSION)
    expect(state.getSessionCalls).toBe(0)
  })

  it('navigates to `next` when a session arrives (incognito / fresh login)', async () => {
    state.search = 'code=abc&next=%2Fadmin%2Fusers'
    await mount()
    await emit('SIGNED_IN', SESSION)
    expect(window.location.href).toBe('/admin/users')
  })

  it('defaults to /admin when no `next` is provided', async () => {
    state.search = 'code=abc'
    await mount()
    await emit('SIGNED_IN', SESSION)
    expect(window.location.href).toBe('/admin')
  })

  it('ignores the stale INITIAL_SESSION when returning from a magic link, then navigates on SIGNED_IN', async () => {
    state.search = 'code=abc'
    await mount()

    // First event reports a previously-logged-in account — must NOT navigate.
    await emit('INITIAL_SESSION', STALE_SESSION)
    expect(window.location.href).toBe('')

    // The exchanged session arrives — now navigate.
    await emit('SIGNED_IN', SESSION)
    expect(window.location.href).toBe('/admin')
  })

  it('shows an error (and does not navigate) when the implicit hash carries an error', async () => {
    setLocation('#error=access_denied&error_description=Email+link+is+invalid+or+has+expired')
    await mount()
    expect(container.textContent).toContain('access_denied')
    expect(window.location.href).toBe('')
    expect(state.getSessionCalls).toBe(0)
  })
})
