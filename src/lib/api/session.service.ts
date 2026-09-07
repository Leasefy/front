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

export interface ClaimSessionBody {
  /**
   * Id estable de ESTE navegador (`getDeviceId`). Con él, el back responde
   * `superseded: true` sólo cuando la sesión anterior era de OTRO navegador —
   * sin él, la sesión anterior del mismo navegador (cerrada o vencida) contaba
   * como «otro dispositivo» y el cartel salía en cada login.
   */
  deviceId?: string
}

export const sessionApi = {
  claim(token?: string, body?: ClaimSessionBody): Promise<ClaimSessionResponse> {
    return apiClient.post<ClaimSessionResponse>('/auth/session/claim', body ?? {}, token)
  },
  revoke(token?: string): Promise<RevokeSessionResponse> {
    return apiClient.post<RevokeSessionResponse>('/auth/session/revoke', undefined, token)
  },
}

/** Convenience wrapper — POST /auth/session/claim. */
export function claimSession(token?: string, body?: ClaimSessionBody): Promise<ClaimSessionResponse> {
  return sessionApi.claim(token, body)
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

/**
 * Un dispositivo con la sesión de esta persona abierta.
 *
 * `desde` y `ultimaSenal` vienen en ISO o en null: las sesiones anteriores a
 * las columnas nuevas no saben desde cuándo están, y eso se dice, no se
 * inventa una fecha.
 */
export interface DispositivoConSesion {
  etiqueta: string
  esEsteDispositivo: boolean
  desde: string | null
  ultimaSenal: string | null
}

export interface SesionesActivasResponse {
  /**
   * Siempre true: Leasefy permite una sesión a la vez por persona. Viene en la
   * respuesta para que la pantalla pueda EXPLICAR por qué la lista trae una
   * sola fila, en vez de dejar a alguien buscando sus otros dispositivos.
   */
  unaSesionALaVez: boolean
  dispositivos: DispositivoConSesion[]
}

/** GET /auth/session/dispositivos — lo que muestra «Sesiones activas». */
export function getSesionesActivas(deviceId?: string): Promise<SesionesActivasResponse> {
  const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''
  return apiClient.get<SesionesActivasResponse>(`/auth/session/dispositivos${query}`)
}
