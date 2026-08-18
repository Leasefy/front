/**
 * cotizador.ts (admin) — CRUD sobre el registry de carriers del cotizador
 * (empezando por Fianly). Este backend PROXYA al micro del cotizador; usa
 * `noForbiddenRedirect: true` en todas las llamadas porque acá un 403 es un
 * error de dominio del micro, no un rechazo de allowlist (ver `ApiOptions`).
 *
 * Contract (`NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin/cotizador/registry`):
 *   GET    /cotizador/registry        → { success, registry: CarrierRow[] }
 *   GET    /cotizador/registry/:name  → { success, carrier: CarrierRow } | 404
 *   POST   /cotizador/registry        → 201 { success, carrier }
 *   PATCH  /cotizador/registry/:name  → { success, carrier }
 *   DELETE /cotizador/registry/:name  → 204; soft-delete (enabled:false)
 *
 * ⚠️ Asimetría de casing: el REQUEST body es snake_case (`CarrierWriteBody`);
 * el RESPONSE row es camelCase (`CarrierRow`, salvo `has_config` que viene en
 * snake). El micro nunca devuelve credenciales.
 *
 * ⚠️ `config` es all-or-nothing: si se manda, el micro RE-ENCRIPTA todo el
 * objeto; si se omite, preserva lo existente. Los callers (el form) deben
 * omitirlo salvo que el usuario haya escrito credenciales nuevas.
 *
 * El micro devuelve errores como `{ success:false, error:'...' }` (NO
 * `{ message }`); `adminApi` los expone en `ApiError.body.error`.
 */

import { adminApi } from './api'

export type CarrierMode = 'stub' | 'rest' | 'form-rpa' | 'email-broker' | 'open-finance'
export type CarrierProductType = 'seguro' | 'fianza'

/** Response shape of a carrier row. Never contiene credenciales. */
export interface CarrierRow {
  id: string
  name: string
  displayName: string | null
  productType: CarrierProductType
  route: string
  mode: CarrierMode
  enabled: boolean
  priority: number | null
  maxCanonCop: number | null
  has_config: boolean
  createdAt: string
  updatedAt: string
}

/** Credenciales del carrier — write-only, nunca se leen de vuelta. */
export interface CarrierCredentialsConfig {
  base_url?: string
  username?: string
  password?: string
}

/**
 * POST/PATCH body (snake_case). Todos los campos son opcionales en PATCH
 * (solo se aplican los presentes); en POST son requeridos `name`, `route` y
 * `mode`. `config`, si se incluye, reemplaza TODO lo guardado (ver nota arriba).
 */
export interface CarrierWriteBody {
  name?: string
  route?: string
  display_name?: string
  product_type?: CarrierProductType
  mode?: CarrierMode
  enabled?: boolean
  priority?: number
  max_canon_cop?: number
  config?: CarrierCredentialsConfig
}

const PATH = '/cotizador/registry'

/** Lista todos los carriers del registry (activos e inactivos). */
export function listCarriers(signal?: AbortSignal): Promise<CarrierRow[]> {
  return adminApi<{ success: boolean; registry: CarrierRow[] }>(PATH, {
    signal,
    noForbiddenRedirect: true,
  }).then((r) => r.registry)
}

/** Trae un carrier por nombre (slug). Throws `ApiError` 404 si no existe. */
export function getCarrier(name: string, signal?: AbortSignal): Promise<CarrierRow> {
  return adminApi<{ success: boolean; carrier: CarrierRow }>(`${PATH}/${name}`, {
    signal,
    noForbiddenRedirect: true,
  }).then((r) => r.carrier)
}

/** Crea un carrier. Requeridos en el body: `name`, `route`, `mode`. */
export function createCarrier(body: CarrierWriteBody): Promise<CarrierRow> {
  return adminApi<{ success: boolean; carrier: CarrierRow }>(PATH, {
    method: 'POST',
    body,
    noForbiddenRedirect: true,
  }).then((r) => r.carrier)
}

/** Edita un carrier. Solo se aplican los campos presentes en el body. */
export function updateCarrier(name: string, body: CarrierWriteBody): Promise<CarrierRow> {
  return adminApi<{ success: boolean; carrier: CarrierRow }>(`${PATH}/${name}`, {
    method: 'PATCH',
    body,
    noForbiddenRedirect: true,
  }).then((r) => r.carrier)
}

/** Soft-deletea un carrier (enabled:false; no borra la fila). */
export function deleteCarrier(name: string): Promise<void> {
  return adminApi<void>(`${PATH}/${name}`, {
    method: 'DELETE',
    noForbiddenRedirect: true,
  })
}

// ── Pre-scoring de afianzamiento: config de TTL ─────────────────────────────
//
// Config de plataforma del pre-scoring: validez del estudio (reúso) y ventana
// de espera de autorización. También PROXYA al micro de agentes, así que va con
// `noForbiddenRedirect: true` (un 403/502 acá es error de dominio del micro, no
// rechazo de allowlist). Ambas horas son enteros en rango 1..720.
//
//   GET   /cotizador/prescoring-config → { success, config: PreScoringConfig }
//   PATCH /cotizador/prescoring-config → { success, config } (>=1 campo, 1..720)

/** Config del TTL de pre-scoring. Horas enteras. */
export interface PreScoringConfig {
  /** Horas que se espera la autorización del candidato antes de dar por vencida la solicitud. */
  authorizationWaitHours: number
  /** Horas que un estudio COMPLETADO se reutiliza antes de relanzar uno nuevo. TTL principal. */
  resultReuseTtlHours: number
}

/** PATCH body: ambos opcionales pero al menos uno requerido; el back valida 1..720. */
export type PreScoringConfigUpdate = Partial<PreScoringConfig>

const PRESCORING_CONFIG_PATH = '/cotizador/prescoring-config'

/** Lee la config actual del TTL de pre-scoring. */
export function getPreScoringConfig(signal?: AbortSignal): Promise<PreScoringConfig> {
  return adminApi<{ success: boolean; config: PreScoringConfig }>(PRESCORING_CONFIG_PATH, {
    signal,
    noForbiddenRedirect: true,
  }).then((r) => r.config)
}

/** Actualiza la config; solo los campos presentes se aplican. Devuelve la config resultante. */
export function updatePreScoringConfig(body: PreScoringConfigUpdate): Promise<PreScoringConfig> {
  return adminApi<{ success: boolean; config: PreScoringConfig }>(PRESCORING_CONFIG_PATH, {
    method: 'PATCH',
    body,
    noForbiddenRedirect: true,
  }).then((r) => r.config)
}
