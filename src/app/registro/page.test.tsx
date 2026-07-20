/**
 * registro/page.tsx — invitation flow, personal-role safety.
 *
 * Caso 2 tramo 1: accepting an agency invitation must NEVER overwrite an
 * existing user's personal role.
 *
 * Reachable states (auth-context invariant: needsOnboarding===true ⟹
 * user===null ⟹ isAuthenticated===false):
 *  - NEW invited user (needsOnboarding true, isAuthenticated false): the
 *    silent auto-accept effect early-returns; the user completes via the
 *    manual "Completá tu perfil" form → handleCompleteProfile onboards as
 *    AGENT then accepts. (Not a silent auto-accept.)
 *  - EXISTING account (needsOnboarding false, isAuthenticated true): the
 *    effect fires and calls acceptInvitation ONLY — no role/onboarding call,
 *    personal role untouched.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { postMock, getInvitationMock, acceptInvitationMock, authState } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getInvitationMock: vi.fn(),
  acceptInvitationMock: vi.fn(),
  authState: {
    isAuthenticated: true,
    isLoading: false,
    needsOnboarding: false,
    user: null as Record<string, unknown> | null,
  },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('invitationToken=tok-123'),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signUpWithEmail: vi.fn(),
    signInWithEmail: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    needsOnboarding: authState.needsOnboarding,
    user: authState.user,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: {
    getInvitation: (...a: unknown[]) => getInvitationMock(...a),
    acceptInvitation: (...a: unknown[]) => acceptInvitationMock(...a),
  },
}))

vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: { post: (...a: unknown[]) => postMock(...a) },
    ApiError,
  }
})

import RegistroPage from './page'

let container: HTMLDivElement
let root: Root
let replaceSpy: ReturnType<typeof vi.fn>
let originalReplace: typeof window.location.replace

beforeEach(() => {
  localStorage.clear()
  postMock.mockReset().mockResolvedValue({})
  getInvitationMock.mockReset().mockResolvedValue({ invitedEmail: 'nuevo@agencia.com', role: 'AGENTE' })
  acceptInvitationMock.mockReset().mockResolvedValue({ id: 'member-1' })
  authState.isAuthenticated = true
  authState.isLoading = false
  authState.needsOnboarding = false
  authState.user = null

  // window.location.replace navigates in happy-dom — stub it.
  originalReplace = window.location.replace
  replaceSpy = vi.fn()
  Object.defineProperty(window.location, 'replace', { configurable: true, value: replaceSpy })

  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  Object.defineProperty(window.location, 'replace', { configurable: true, value: originalReplace })
  vi.clearAllMocks()
})

async function renderAndSettle() {
  await act(async () => {
    root.render(<RegistroPage />)
  })
  // Flush getInvitation → setInvitation → auto-accept effect → doComplete chain.
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

/** Set a controlled input's value so react-hook-form registers the change. */
function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('registro invitation flow — personal-role safety', () => {
  it('NEW invited user (needsOnboarding=true, isAuthenticated=false): NOT auto-accepted; manual form onboards as AGENT then accepts', async () => {
    // Reachable new-user state — needsOnboarding true forces isAuthenticated false.
    authState.needsOnboarding = true
    authState.isAuthenticated = false
    authState.user = null

    await renderAndSettle()

    // The silent auto-accept effect must NOT fire for a new user (it early-returns
    // on !isAuthenticated) — no role flip, no silent accept.
    expect(postMock).not.toHaveBeenCalled()
    expect(acceptInvitationMock).not.toHaveBeenCalled()

    // The manual "Completá tu perfil" form is rendered — fill and submit it.
    const firstName = container.querySelector('input[name="firstName"]') as HTMLInputElement
    const lastName = container.querySelector('input[name="lastName"]') as HTMLInputElement
    expect(firstName).not.toBeNull()
    expect(lastName).not.toBeNull()
    await act(async () => {
      setInputValue(firstName, 'Ana')
      setInputValue(lastName, 'Nueva')
    })
    const form = firstName.closest('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })
    }

    // handleCompleteProfile onboards as AGENT AND accepts the invitation.
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/users/me/onboarding', {
      firstName: 'Ana',
      lastName: 'Nueva',
      phone: undefined,
      userType: 'AGENT',
    })
    expect(acceptInvitationMock).toHaveBeenCalledTimes(1)
    expect(acceptInvitationMock).toHaveBeenCalledWith('tok-123')
    // Onboarding must precede accept.
    expect(postMock.mock.invocationCallOrder[0]).toBeLessThan(
      acceptInvitationMock.mock.invocationCallOrder[0],
    )
  })

  it('existing account (needsOnboarding=false) → NO onboarding/role call, accept only', async () => {
    authState.needsOnboarding = false
    // Existing personal profile — a TENANT that must keep its role.
    authState.user = { id: 'u1', role: 'tenant', firstName: 'Juan', lastName: 'Existente' }

    await renderAndSettle()

    // The role-flipping onboarding call must NEVER fire for an existing account.
    expect(postMock).not.toHaveBeenCalled()
    expect(acceptInvitationMock).toHaveBeenCalledTimes(1)
    expect(acceptInvitationMock).toHaveBeenCalledWith('tok-123')
  })

  it('existing LANDLORD account is likewise never re-onboarded as AGENT', async () => {
    authState.needsOnboarding = false
    authState.user = { id: 'u2', role: 'landlord', firstName: 'Luisa', lastName: 'Prop' }

    await renderAndSettle()

    expect(postMock).not.toHaveBeenCalled()
    expect(acceptInvitationMock).toHaveBeenCalledTimes(1)
  })
})
