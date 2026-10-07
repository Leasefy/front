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
  /**
   * Representante legal de la inmobiliaria, tal como figura en el RUT.
   *
   * NO es quien se registra: la cuenta puede crearla un contador o un asesor
   * para la inmobiliaria de otra persona. `firstName`/`lastName` son de quien
   * se registra —van atados a su correo—; esto es de la empresa.
   *
   * Las columnas ya existen en la agencia y se editan desde Configuración >
   * Perfil de agencia; lo que faltaba era poder mandarlas al crearla.
   */
  legalRepresentative?: string
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
 *  - `'PENDING'` → la agencia existe pero el micro no respondió (caída nuestra);
 *    reenviar el paso previo lo vuelve a intentar. Desde el 01-10-2026 el back
 *    también informa así las que la regla vieja dejó FAILED por una caída.
 *  - `'FAILED'` → terminal, lo tiene que destrabar soporte; no ofrecer reintento.
 */
export interface OnboardingResumePoint {
  agentSessionId: string | null
  tenantId: string | null
  provisioningStatus: 'PENDING' | 'ACTIVE' | 'FAILED' | null
  legalName: string | null
  nit: string | null
  /** Lo que ya escribió quien se registra. Opcionales: un back anterior no los manda. */
  ownerFirstName?: string | null
  ownerLastName?: string | null
  legalRepresentative?: string | null
  onboardingCompleted: boolean
  /**
   * ¿Esta persona REGISTRÓ la inmobiliaria? El asistente del micro sólo le
   * contesta a ella (403 a cualquier otro miembro). `null` sin inmobiliaria o
   * en una agencia sin fundador conocido; ausente en un back anterior.
   */
  esQuienLaRegistro?: boolean | null
}

export function getOnboardingResumePoint(): Promise<OnboardingResumePoint> {
  return apiClient.get<OnboardingResumePoint>('/users/me/onboarding/session')
}

/** `DELETE /users/me/onboarding/agency`. */
export interface DesistirDelRegistroResponse {
  desistido: boolean
  agencyId: string | null
}

/**
 * Deja de lado el registro de inmobiliaria a medias de esta persona, para que
 * pueda entrar con otro perfil (Nico, 01-10-2026). El back se niega con 409 si
 * la inmobiliaria ya tiene información o el registro ya terminó, y con 503
 * (`servicio: 'asistente'`) si el asistente no responde: en esos casos no se
 * borró nada.
 */
export function desistirDelRegistroDeInmobiliaria(): Promise<DesistirDelRegistroResponse> {
  return apiClient.delete<DesistirDelRegistroResponse>('/users/me/onboarding/agency')
}
