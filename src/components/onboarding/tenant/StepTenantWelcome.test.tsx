/**
 * StepTenantWelcome — document (rut/CC) immutability.
 *
 * Product rule: the document number cannot be edited once set on the backend
 * profile — changes go through Leasefy support. When the authenticated
 * backend user already has a rut, the field renders disabled (prefilled via
 * the context's backend seeding) with the support helper text; a user
 * without one keeps it editable.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { authState } = vi.hoisted(() => ({
  authState: { user: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    refreshUser: vi.fn().mockResolvedValue(undefined),
    user: authState.user,
  }),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { TenantOnboardingProvider } from '@/lib/context/TenantOnboardingContext'
import { StepTenantWelcome } from './StepTenantWelcome'

const SUPPORT_TEXT =
  'Para modificar tu número de documento, contacta al soporte de Leasefy.'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  authState.user = undefined
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function render() {
  await act(async () => {
    root.render(
      <TenantOnboardingProvider>
        <StepTenantWelcome />
      </TenantOnboardingProvider>,
    )
  })
}

function rutInput(): HTMLInputElement {
  return container.querySelector('#rut') as HTMLInputElement
}

describe('StepTenantWelcome — rut lock', () => {
  it('locks and prefills the document field when the backend user already has one', async () => {
    authState.user = {
      id: 'me',
      profileSource: 'backend',
      firstName: 'Ana',
      lastName: 'Pérez',
      rut: '1090525663',
    }
    await render()

    expect(rutInput().disabled).toBe(true)
    // Prefilled by the context's backend seeding.
    expect(rutInput().value).toBe('1090525663')
    expect(container.textContent).toContain(SUPPORT_TEXT)
  })

  it('stays editable (no helper) for a user without a document', async () => {
    authState.user = {
      id: 'me',
      profileSource: 'backend',
      firstName: 'Ana',
      lastName: 'Pérez',
    }
    await render()

    expect(rutInput().disabled).toBe(false)
    expect(container.textContent).not.toContain(SUPPORT_TEXT)
  })

  it('never locks based on a degraded session profile', async () => {
    authState.user = { id: 'me', profileSource: 'session', rut: '1090525663' }
    await render()

    expect(rutInput().disabled).toBe(false)
    expect(container.textContent).not.toContain(SUPPORT_TEXT)
  })
})
