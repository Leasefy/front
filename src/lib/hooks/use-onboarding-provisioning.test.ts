/**
 * use-onboarding-provisioning.test.ts — provisions the agent onboarding
 * session for the agency owner via `POST /users/me/onboarding` with
 * `userType: 'INMOBILIARIA'` and the `agency: { name, nit }` object (the
 * back only creates the agency + agent session for that combination).
 *
 * The hook never auto-provisions on mount: razón social + NIT are always
 * captured by the caller first (`status: 'needs-info'`), then posted via
 * `provision()`. `agentSessionId: null` (back created the rows but the
 * agent handoff failed) is a retry-able error, same as a network failure.
 *
 * Render harness mirrors use-onboarding-session.test.ts (createRoot + act —
 * no @testing-library/react in this repo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const postUsersOnboardingMock = vi.fn()
vi.mock('@/lib/api/onboarding-provisioning.service', () => ({
  postUsersOnboarding: (...args: unknown[]) => postUsersOnboardingMock(...args),
}))

import {
  useOnboardingProvisioning,
  INMOBILIARIA_USER_TYPE,
  type ProvisioningInput,
} from './use-onboarding-provisioning'

type Hook = ReturnType<typeof useOnboardingProvisioning>

const VALID_INPUT: ProvisioningInput = {
  firstName: 'Ana',
  lastName: 'Pérez',
  agencyName: 'Inmobiliaria Andes SAS',
  nit: '900123456-7',
}

const EXPECTED_BODY = {
  firstName: 'Ana',
  lastName: 'Pérez',
  userType: INMOBILIARIA_USER_TYPE,
  agency: { name: 'Inmobiliaria Andes SAS', nit: '900123456-7' },
}

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
  it('reports needs-info on mount and never auto-provisions (razón social + NIT are always required)', async () => {
    const { get } = renderHook()
    await flush()

    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
    expect(get().status).toBe('needs-info')
    expect(get().sessionId).toBeNull()
  })

  it('provision() posts userType INMOBILIARIA with the agency object and resolves to ready', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    act(() => {
      get().provision(VALID_INPUT)
    })
    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(1)
    expect(postUsersOnboardingMock).toHaveBeenCalledWith(EXPECTED_BODY)
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-abc')
  })

  // The "Agencia" step (AgencyStepForm) re-asks razón social/NIT unless the
  // caller threads these captured values back in as its prefill source.
  it('exposes the captured razón social + NIT as agencyPrefill once provisioning succeeds', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    expect(get().agencyPrefill).toBeNull()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().agencyPrefill).toEqual({
      legalName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('does not expose agencyPrefill when provisioning fails', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().agencyPrefill).toBeNull()
  })

  // agentSessionId === null → the back created the user/agency rows but the
  // agent handoff failed. Retry-able error, NOT ready.
  it('resolves to error (no sessionId) when the back returns agentSessionId null', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  it('resolves to error when the request itself rejects (network/HTTP failure)', async () => {
    postUsersOnboardingMock.mockRejectedValue(new Error('network down'))
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  it('retry() re-posts the exact same captured data after a failure', async () => {
    postUsersOnboardingMock.mockRejectedValueOnce(new Error('network down'))
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()
    expect(get().status).toBe('error')

    postUsersOnboardingMock.mockResolvedValueOnce({ agentSessionId: 'sess-retry', tenantId: 'tenant-1' })
    act(() => {
      get().retry()
    })
    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(2)
    expect(postUsersOnboardingMock).toHaveBeenLastCalledWith(EXPECTED_BODY)
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-retry')
  })

  // The back's createAgency is a non-atomic findFirst-then-create — a fast
  // double submit must never fire two POSTs for the same owner.
  it('ignores provision()/retry() while a request is already in flight (double submit posts once)', async () => {
    let resolveRequest!: (value: unknown) => void
    postUsersOnboardingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    act(() => {
      get().provision(VALID_INPUT)
    })
    act(() => {
      get().retry()
    })

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(1)
    expect(get().status).toBe('provisioning')

    await act(async () => {
      resolveRequest({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-abc')

    // Once settled, retry() is allowed again.
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-2', tenantId: 'tenant-1' })
    act(() => {
      get().retry()
    })
    await flush()
    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(2)
  })

  it('retry() before any provision() does nothing (no data to re-post)', async () => {
    const { get } = renderHook()
    await flush()

    act(() => {
      get().retry()
    })
    await flush()

    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
    expect(get().status).toBe('needs-info')
  })

  // The back rejects an empty lastName with a 400 (`@IsNotEmpty`) — mirror
  // the canonical split in src/app/onboarding/propietario/page.tsx.
  it('falls back lastName to firstName when lastName is empty', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision({ ...VALID_INPUT, lastName: '' })
    })
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledWith({
      ...EXPECTED_BODY,
      lastName: 'Ana',
    })
  })
})
