/**
 * registration-profiles.service.ts — PUBLIC read of which signup profiles are
 * enabled. Consumed by the signup surfaces (AuthForm register step, the
 * post-auth role picker) to hide profiles an admin has switched off.
 *
 * Public on purpose: the register step runs BEFORE the user authenticates, so
 * this must work with no Bearer token. `apiClient.get` omits `Authorization`
 * when no token is set, which is exactly what we want here.
 *
 * Contract (main backend, `NEXT_PUBLIC_BACKEND_URL`):
 *   GET /config/registration-profiles
 *     200 → Array<{ key: RegistrationProfileKey; enabled: boolean }>
 *   Cheap, cacheable, no auth. Until the backend ships it this GET 404s and the
 *   consuming hook fails OPEN (all profiles visible) — signup must never break.
 */

import { apiClient } from './client'
import {
  isRegistrationProfileKey,
  type RegistrationProfileKey,
} from '@/lib/constants/registration-profiles'

export interface RegistrationProfileState {
  key: RegistrationProfileKey
  enabled: boolean
}

const PUBLIC_PATH = '/config/registration-profiles'

/**
 * Returns the canonical keys of the profiles currently enabled for signup.
 * Throws `ApiError` on any transport/HTTP failure — the caller owns the
 * fail-open decision.
 */
export async function fetchEnabledRegistrationProfiles(): Promise<RegistrationProfileKey[]> {
  const rows = await apiClient.get<RegistrationProfileState[]>(PUBLIC_PATH)
  return (rows ?? [])
    .filter((r) => r?.enabled && isRegistrationProfileKey(r.key))
    .map((r) => r.key)
}
