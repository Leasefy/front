/**
 * registration-profiles.ts (admin) — the toggle "method" behind the admin
 * screen. Reads and writes the platform-wide on/off state of each signup
 * profile through the admin backend.
 *
 * Contract (admin backend, `NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`):
 *   GET   /registration-profiles            → RegistrationProfileAdminRow[]
 *   PATCH /registration-profiles/:key       body { enabled } → updated row
 *
 * The backend MUST refuse to disable the last enabled profile (a dead signup)
 * and MUST write an audit_log entry on every PATCH. The front guards the
 * last-enabled case too, but the server is the source of truth.
 */

import { adminApi } from './api'
import type { RegistrationProfileKey } from '@/lib/constants/registration-profiles'

export interface RegistrationProfileAdminRow {
  key: RegistrationProfileKey
  enabled: boolean
  /** ISO timestamp of the last toggle, or null if never changed. */
  updated_at: string | null
  /** Admin email that made the last change, or null. */
  updated_by: string | null
}

const PATH = '/registration-profiles'

/** Lists every registration profile with its persisted on/off state. */
export function listRegistrationProfiles(
  signal?: AbortSignal,
): Promise<RegistrationProfileAdminRow[]> {
  return adminApi<RegistrationProfileAdminRow[]>(PATH, { signal })
}

/**
 * Flips a single profile on/off. Returns the updated row (with fresh
 * `updated_at` / `updated_by`). Throws `ApiError` on the backend guard
 * (e.g. 409 when trying to disable the last enabled profile).
 */
export function setRegistrationProfileEnabled(
  key: RegistrationProfileKey,
  enabled: boolean,
): Promise<RegistrationProfileAdminRow> {
  return adminApi<RegistrationProfileAdminRow>(`${PATH}/${key}`, {
    method: 'PATCH',
    body: { enabled },
  })
}
