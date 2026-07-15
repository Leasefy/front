/**
 * onboarding-provisioning.service.ts — typed wrapper for
 * `POST /users/me/onboarding`, used by the agency onboarding wizard
 * (`useOnboardingProvisioning`) to provision the agent session before the
 * wizard mounts.
 *
 * The back returns `{ agentSessionId, tenantId }`. `agentSessionId` is
 * `null` when the back created the user/agency row but the handoff to the
 * agent's `onboardingStart` failed (back `users.service.ts:622`) — callers
 * MUST treat `null` as a distinct, retry-able outcome, not throw it away.
 *
 * Existing call sites (`src/app/registro/page.tsx`,
 * `src/app/onboarding/propietario/page.tsx`,
 * `src/lib/context/TenantOnboardingContext.tsx`) call
 * `apiClient.post('/users/me/onboarding', ...)` directly without capturing
 * the response and are untouched by this file — they keep compiling because
 * `apiClient.post<T>` only narrows the return type when a caller captures it.
 */

import { apiClient } from './client'

export interface UsersMeOnboardingResponse {
  agentSessionId: string | null
  tenantId: string
}

export interface UsersMeOnboardingRequest {
  firstName: string
  lastName: string
  phone?: string
  userType: string
}

export function postUsersOnboarding(
  body: UsersMeOnboardingRequest,
): Promise<UsersMeOnboardingResponse> {
  return apiClient.post<UsersMeOnboardingResponse>('/users/me/onboarding', body)
}
