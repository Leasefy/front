'use client'

/**
 * useOnboardingProvisioning — provisions the agent onboarding session for
 * the authenticated agency owner.
 *
 * Calls `POST /users/me/onboarding` on mount (see
 * `src/lib/api/onboarding-provisioning.service.ts` for the contract). The
 * back returns `{ agentSessionId, tenantId }`:
 *  - `agentSessionId` present  → `status: 'ready'`, the wizard mounts with it.
 *  - `agentSessionId === null` → the back created the user row but the
 *    handoff to the agent's `onboardingStart` failed. Surfaced as
 *    `status: 'error'`, same as a network/HTTP failure — the caller renders
 *    one retry-able error state either way and calls `retry()`.
 *
 * Not used when `?session=<uuid>` is present in the URL — that is a
 * dev/testing override handled entirely by the caller
 * (`OnboardingInmobiliariaClient`), which skips mounting this hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/use-auth'
import { postUsersOnboarding } from '@/lib/api/onboarding-provisioning.service'

/**
 * TODO: confirm with back the userType for the OWNER that creates the
 * agency through this wizard. Existing call sites
 * (`src/app/registro/page.tsx`, `src/app/onboarding/propietario/page.tsx`)
 * use 'AGENT' for the member ACCEPTING an invitation (`acceptInvitation`
 * flow) — not the owner who creates the agency and triggers
 * `agentSessionId` provisioning here. Using the same value until back
 * confirms whether the owner needs a distinct userType.
 */
export const AGENCY_OWNER_USER_TYPE = 'AGENT'

export type OnboardingProvisioningStatus = 'provisioning' | 'ready' | 'error'

export interface UseOnboardingProvisioningResult {
  status: OnboardingProvisioningStatus
  /** Only populated once `status === 'ready'`. */
  sessionId: string | null
  /** Re-runs the provisioning call. Wired to the "Reintentar" CTA. */
  retry: () => void
}

export function useOnboardingProvisioning(): UseOnboardingProvisioningResult {
  const { user } = useAuth()
  const [status, setStatus] = useState<OnboardingProvisioningStatus>('provisioning')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const mountedRef = useRef(true)
  // Guards against a stale response overwriting state after a later retry.
  const requestIdRef = useRef(0)
  // useCallback below closes over `user` at call time via a ref so `retry`
  // has a stable identity while always reading the latest user.
  const userRef = useRef(user)
  userRef.current = user

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const provision = useCallback(() => {
    const requestId = ++requestIdRef.current
    setStatus('provisioning')
    postUsersOnboarding({
      firstName: userRef.current?.firstName || '',
      lastName: userRef.current?.lastName || '',
      userType: AGENCY_OWNER_USER_TYPE,
    })
      .then((res) => {
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
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        setSessionId(null)
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    provision()
  }, [provision])

  return { status, sessionId, retry: provision }
}
