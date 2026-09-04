/**
 * onboarding-provisioning.service.ts — typed wrapper for
 * `POST /users/me/onboarding`, used by the agency onboarding wizard
 * (`useOnboardingProvisioning`) to provision the agent session before the
 * wizard mounts.
 *
 * The back only creates the agency + ADMIN membership + agent session when
 * it receives `userType: 'INMOBILIARIA'` AND an `agency` object; any other
 * userType returns a plain User with no `agentSessionId`. Within `agency`,
 * `name` is required and `nit` is effectively required too — without it the
 * back flips the agency to `provisioningStatus: FAILED` immediately and a
 * FAILED agency is never auto-retried (resubmitting returns a 400).
 * `agency.email` is optional (the back falls back to the user's email).
 *
 * The back returns `{ agentSessionId, tenantId }`. `agentSessionId` is
 * `null` when the back created the user/agency rows but the handoff to the
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

export interface UsersMeOnboardingAgency {
  /** Razón social. */
  name: string
  /** NIT — omit and the back marks the agency FAILED with no auto-retry. */
  nit: string
  /** Optional — the back falls back to the user's email. */
  email?: string
}

export interface UsersMeOnboardingRequest {
  firstName: string
  lastName: string
  phone?: string
  userType: string
  /** Required (together with `userType: 'INMOBILIARIA'`) to provision an agency. */
  agency?: UsersMeOnboardingAgency
}

export function postUsersOnboarding(
  body: UsersMeOnboardingRequest,
): Promise<UsersMeOnboardingResponse> {
  return apiClient.post<UsersMeOnboardingResponse>('/users/me/onboarding', body)
}

/**
 * Punto de retorno del asistente, tal como lo ve el back para el usuario
 * autenticado. `GET /users/me/onboarding/session`.
 *
 * Existe para que quien cerró la pestaña (o entra desde otro computador) no
 * tenga que volver a escribir la razón social y el NIT: si ya hay una sesión
 * minteada, el asistente se monta directo en el paso donde iba.
 *
 * `agentSessionId` en null significa tres cosas distintas y `provisioningStatus`
 * es lo que las separa:
 *  - `null` → todavía no hay agencia; se muestra el paso previo.
 *  - `'ACTIVE'` → la agencia existe y el traspaso al agente falló; reenviar el
 *    paso previo lo vuelve a intentar (el back ya no devuelve null para siempre).
 *  - `'FAILED'` → terminal, lo tiene que destrabar soporte; no ofrecer reintento.
 */
export interface OnboardingResumePoint {
  agentSessionId: string | null
  tenantId: string | null
  provisioningStatus: 'PENDING' | 'ACTIVE' | 'FAILED' | null
  legalName: string | null
  nit: string | null
  onboardingCompleted: boolean
}

export function getOnboardingResumePoint(): Promise<OnboardingResumePoint> {
  return apiClient.get<OnboardingResumePoint>('/users/me/onboarding/session')
}
