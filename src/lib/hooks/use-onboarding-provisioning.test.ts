/**
 * use-onboarding-provisioning.test.ts — provisions the agent onboarding
 * session for the agency owner via `POST /users/me/onboarding`, handling
 * the `agentSessionId: null` edge case (back created the user row but the
 * agent handoff failed) as a retry-able error, same as a network failure.
 *
 * Render harness mirrors use-onboarding-session.test.ts (createRoot + act —
 * no @testing-library/react in this repo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const mockUseAuth = vi.fn()
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

const postUsersOnboardingMock = vi.fn()
vi.mock('@/lib/api/onboarding-provisioning.service', () => ({
  postUsersOnboarding: (...args: unknown[]) => postUsersOnboardingMock(...args),
}))

import {
  useOnboardingProvisioning,
  AGENCY_OWNER_USER_TYPE,
} from './use-onboarding-provisioning'

type Hook = ReturnType<typeof useOnboardingProvisioning>

let container: HTMLDivElement
let root: Root

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useOnboardingProvisioning()
    return null
  }
  act(() => {
    root.render(React.createElement(TestComponent))
  })
  return { get: () => latest as Hook }
}

function flush() {
  return act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockUseAuth.mockReturnValue({ user: { firstName: 'Ana', lastName: 'Pérez' } })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  postUsersOnboardingMock.mockReset()
})

describe('useOnboardingProvisioning', () => {
  it('calls POST /users/me/onboarding on mount with the agency-owner userType', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()

    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(1)
    expect(postUsersOnboardingMock).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      userType: AGENCY_OWNER_USER_TYPE,
    })
  })

  // (a) agentSessionId present → ready with that id
  it('resolves to ready with the sessionId when agentSessionId is present', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-abc')
  })

  // (b) agentSessionId === null → error, no sessionId
  it('resolves to error (no retry-less crash) when agentSessionId is null', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  it('resolves to error when the request itself rejects (network/HTTP failure)', async () => {
    postUsersOnboardingMock.mockRejectedValue(new Error('network down'))
    const { get } = renderHook()
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  // (d) retry after null → calls provisioning again
  it('retry() re-runs the provisioning call', async () => {
    postUsersOnboardingMock.mockResolvedValueOnce({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()
    expect(get().status).toBe('error')

    postUsersOnboardingMock.mockResolvedValueOnce({ agentSessionId: 'sess-retry', tenantId: 'tenant-1' })
    act(() => {
      get().retry()
    })
    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(2)
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-retry')
  })
})
