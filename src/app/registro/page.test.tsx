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
 *    manual "Completá tu perfil" form → handleCompleteProfile makes ONE
 *    transactional /users/me/onboarding call carrying invitationToken (backend
 *    joins the agency atomically) — NO separate acceptInvitation.
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
  getInvitationMock.mockReset().mockResolvedValue({ invitedEmail: 'nuevo@agencia.com', role: 'AGENTE', agencyName: 'Inmobiliaria ABC' })
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
  async function submitManualForm() {
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
  }

  it('NEW invited user: manual form makes a SINGLE onboarding call carrying invitationToken, no separate acceptInvitation, token cleared', async () => {
    // Reachable new-user state — needsOnboarding true forces isAuthenticated false.
    authState.needsOnboarding = true
    authState.isAuthenticated = false
    authState.user = null

    await renderAndSettle()

    // The silent auto-accept effect must NOT fire for a new user (it early-returns
    // on !isAuthenticated).
    expect(postMock).not.toHaveBeenCalled()
    expect(acceptInvitationMock).not.toHaveBeenCalled()
    // The token was persisted from the URL on mount.
    expect(localStorage.getItem('pending-invitation-token')).toBe('tok-123')

    await submitManualForm()

    // ONE transactional call: onboarding + invitationToken (atomic join).
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/users/me/onboarding', {
      firstName: 'Ana',
      lastName: 'Nueva',
      phone: undefined,
      userType: 'AGENT',
      invitationToken: 'tok-123',
    })
    // No separate acceptInvitation — the backend joins atomically now.
    expect(acceptInvitationMock).not.toHaveBeenCalled()
    // Token cleared on success.
    expect(localStorage.getItem('pending-invitation-token')).toBeNull()
  })

  it('shows the read-only role + agency confirmation for an invited NEW user', async () => {
    authState.needsOnboarding = true
    authState.isAuthenticated = false
    authState.user = null

    await renderAndSettle()

    const confirmation = container.querySelector('[data-testid="invite-confirmation"]')
    expect(confirmation).not.toBeNull()
    // Agency name + friendly role label (ROLE_LABELS['AGENTE'] = 'Agente').
    expect(confirmation!.textContent).toContain('Inmobiliaria ABC')
    expect(confirmation!.textContent).toContain('Agente')
    // Read-only confirmation — no role picker/selector in the form.
    expect(container.querySelector('select')).toBeNull()
  })

  it('does NOT show the invite confirmation on the existing-account path (no profile form)', async () => {
    authState.needsOnboarding = false
    authState.user = { id: 'u1', role: 'tenant', firstName: 'Juan', lastName: 'Existente' }

    await renderAndSettle()

    expect(container.querySelector('[data-testid="invite-confirmation"]')).toBeNull()
  })

  it('surfaces the backend error and does NOT clear the pending token on failure', async () => {
    authState.needsOnboarding = true
    authState.isAuthenticated = false
    authState.user = null
    postMock.mockReset().mockRejectedValue(new Error('La invitación ya no es válida.'))

    await renderAndSettle()
    expect(localStorage.getItem('pending-invitation-token')).toBe('tok-123')

    await submitManualForm()

    // Still a single call carrying the token; no acceptInvitation.
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(acceptInvitationMock).not.toHaveBeenCalled()
    // Backend message surfaced; token preserved for a retry.
    expect(container.textContent).toContain('La invitación ya no es válida.')
    expect(localStorage.getItem('pending-invitation-token')).toBe('tok-123')
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
