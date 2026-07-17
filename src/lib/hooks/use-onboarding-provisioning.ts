'use client'

/**
 * useOnboardingProvisioning — provisions the agent onboarding session for
 * the authenticated agency owner.
 *
 * Calls `POST /users/me/onboarding` (see
 * `src/lib/api/onboarding-provisioning.service.ts` for the contract) with
 * `userType: 'INMOBILIARIA'` and the `agency: { name, nit }` object — the
 * back only creates the agency + ADMIN membership + agent session for that
 * exact combination. The back returns `{ agentSessionId, tenantId }`:
 *  - `agentSessionId` present  → `status: 'ready'`, the wizard mounts with it.
 *  - `agentSessionId === null` → the back created the user/agency rows but
 *    the handoff to the agent's `onboardingStart` failed. Surfaced as
 *    `status: 'error'`, same as a network/HTTP failure — the caller renders
 *    one retry-able error state either way and calls `retry()`.
 *
 * The hook NEVER auto-provisions on mount: the agency's razón social and NIT
 * are always required (without a `nit` the back flips the agency to
 * `provisioningStatus: FAILED`, which is never auto-retried), and the /auth
 * signup captures neither those nor the owner's name. The hook reports
 * `status: 'needs-info'` until the caller collects everything and calls
 * `provision({ firstName, lastName, agencyName, nit })`.
 *
 * Not used when `?session=<uuid>` is present in the URL — that is a
 * dev/testing override handled entirely by the caller
 * (`OnboardingInmobiliariaClient`), which skips mounting this hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { postUsersOnboarding } from '@/lib/api/onboarding-provisioning.service'

/**
 * userType for the OWNER who creates the agency through this wizard.
 * Confirmed against the back: only `'INMOBILIARIA'` (plus an `agency`
 * object) triggers agency creation + agent-session provisioning. `'AGENT'`
 * is reserved for members ACCEPTING an invitation (`acceptInvitation` flow
 * in `src/app/registro/page.tsx`).
 */
export const INMOBILIARIA_USER_TYPE = 'INMOBILIARIA'

export type OnboardingProvisioningStatus = 'needs-info' | 'provisioning' | 'ready' | 'error'

export interface ProvisioningInput {
  firstName: string
  lastName: string
  /** Razón social — becomes `agency.name` in the request body. */
  agencyName: string
  /** NIT — required by the back; without it the agency provisioning FAILS terminally. */
  nit: string
}

export interface UseOnboardingProvisioningResult {
  status: OnboardingProvisioningStatus
  /** Only populated once `status === 'ready'`. */
  sessionId: string | null
  /** Re-posts the last `provision()` payload. Wired to the "Reintentar" CTA. */
  retry: () => void
  /** Provisions with the explicitly captured owner + agency data. */
  provision: (input: ProvisioningInput) => void
}

export function useOnboardingProvisioning(): UseOnboardingProvisioningResult {
  const [status, setStatus] = useState<OnboardingProvisioningStatus>('needs-info')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const mountedRef = useRef(true)
  // Guards against a stale response overwriting state after a later retry.
  const requestIdRef = useRef(0)
  // Data captured through `provision()` — kept in a ref so `retry()`
  // re-posts the exact same payload after a failure.
  const inputRef = useRef<ProvisioningInput | null>(null)
  // Double-submit guard: the back's createAgency is a non-atomic
  // findFirst-then-create, so a second POST while one is in flight could
  // create a duplicate agency. Ignore provision()/retry() until it settles.
  const inFlightRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const runProvision = useCallback(() => {
    const input = inputRef.current
    // retry() before any provision(): nothing to re-post — stay in needs-info.
    if (!input) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    const requestId = ++requestIdRef.current
    setStatus('provisioning')
    postUsersOnboarding({
      firstName: input.firstName,
      // Mirrors the canonical split in `src/app/onboarding/propietario/page.tsx`:
      // lastName falls back to firstName so the back's @IsNotEmpty passes.
      lastName: input.lastName || input.firstName,
      userType: INMOBILIARIA_USER_TYPE,
      agency: { name: input.agencyName, nit: input.nit },
    })
      .then((res) => {
        inFlightRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        if (res.agentSessionId) {
          setSessionId(res.agentSessionId)
          setStatus('ready')
        } else {
          setSessionId(null)
          setStatus('error')
        }
      })
      .catch(() => {
        inFlightRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        setSessionId(null)
        setStatus('error')
      })
  }, [])

  const provision = useCallback(
    (input: ProvisioningInput) => {
      inputRef.current = input
      runProvision()
    },
    [runProvision],
  )

  return { status, sessionId, retry: runProvision, provision }
}
