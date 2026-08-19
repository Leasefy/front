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

export interface RevokeSessionResponse {
  revoked: boolean
}

export const sessionApi = {
  claim(token?: string): Promise<ClaimSessionResponse> {
    return apiClient.post<ClaimSessionResponse>('/auth/session/claim', undefined, token)
  },
  revoke(token?: string): Promise<RevokeSessionResponse> {
    return apiClient.post<RevokeSessionResponse>('/auth/session/revoke', undefined, token)
  },
}

/** Convenience wrapper — POST /auth/session/claim. */
export function claimSession(token?: string): Promise<ClaimSessionResponse> {
  return sessionApi.claim(token)
}

/**
 * Invalidar la sesión en el SERVIDOR — POST /auth/session/revoke.
 *
 * Sin esto el cierre por inactividad sería cosmético: los access tokens de
 * Supabase se validan por firma contra el JWKS, no contra una tabla, así que
 * uno ya emitido sigue verificando hasta su `exp` (hasta una hora) por más que
 * el navegador haya vuelto al login. Quien lo hubiera copiado seguiría entrando.
 *
 * Hay que pasarle el token EXPLÍCITO: para cuando esto corre, el cierre ya
 * limpió el que estaba en memoria, y una petición sin `Authorization` no
 * revocaría nada.
 */
export function revokeSession(token?: string): Promise<RevokeSessionResponse> {
  return sessionApi.revoke(token)
}
