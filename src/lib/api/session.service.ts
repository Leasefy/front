/**
 * Single-session API service.
 *
 * `claim` marks the current device's Supabase session as the one active session
 * for the user; any previously active session is superseded (its next request
 * gets a 401 with code SESSION_SUPERSEDED, and it receives an instant
 * revocation event via Realtime on `session_revocations`). Must be called right
 * after a valid Supabase session appears and BEFORE other authenticated
 * requests — otherwise this device is the one that gets 401'd.
 */

import { apiClient } from '@/lib/api/client'

export interface ClaimSessionResponse {
  /** True when this claim superseded a different previously-active session. */
  superseded: boolean
}

export const sessionApi = {
  claim(token?: string): Promise<ClaimSessionResponse> {
    return apiClient.post<ClaimSessionResponse>('/auth/session/claim', undefined, token)
  },
}

/** Convenience wrapper — POST /auth/session/claim. */
export function claimSession(token?: string): Promise<ClaimSessionResponse> {
  return sessionApi.claim(token)
}
