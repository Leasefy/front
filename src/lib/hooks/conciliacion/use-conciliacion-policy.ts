'use client'

/**
 * use-conciliacion-policy.ts — Sala de Conciliación auto-match policy wiring.
 *
 * Connects the autonomy/configuración screen to the real backend endpoints:
 *
 *   GET  /api/agency/{agencyId}/conciliacion/policy
 *   POST /api/agency/{agencyId}/conciliacion/policy
 *
 * Shapes are matched EXACTLY to conciliacion-policy.ts (the backend route):
 *
 *   GET 200 → {
 *     id: string | null,
 *     version_number: number,
 *     policy_json: { autoMatchEnabled: {recaudo,dispersion,ap,comision},
 *                    confidenceThresholds: {recaudo?,dispersion?,ap?,comision?} },
 *     created_by: string | null,
 *     created_at: string | null,
 *     change_description: string | null,
 *     source: 'default' | 'stored',
 *   }
 *
 *   POST body → { policy_json: {...}, change_description?: string }
 *   POST 201  → { id, version_number, created_at }
 *
 * FAIL-SOFT (REGLA DE ORO): the backend may not be deployed yet → 404/503/error.
 * On any failure the hook degrades to the SAFE DEFAULT (all domains false,
 * source:'default', version 0) and surfaces `error` so the UI can show a
 * "requiere backend" notice WITHOUT breaking. The backend itself also returns
 * the same safe default on GET when the table is absent, so the screen renders
 * identically whether the endpoint is missing entirely or pre-migration.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── Domains ───────────────────────────────────────────────────────────────

/** The four reconciliation domains apply-match.ts gates auto-match on. */
export const CONCILIACION_DOMAINS = [
  'recaudo',
  'dispersion',
  'ap',
  'comision',
] as const

export type ConciliacionDomain = (typeof CONCILIACION_DOMAINS)[number]

// ── API shapes (matched to conciliacion-policy.ts) ─────────────────────────

export interface AutoMatchEnabled {
  recaudo: boolean
  dispersion: boolean
  ap: boolean
  comision: boolean
}

export interface ConfidenceThresholds {
  recaudo?: number
  dispersion?: number
  ap?: number
  comision?: number
}

export interface PolicyJson {
  autoMatchEnabled: AutoMatchEnabled
  confidenceThresholds: ConfidenceThresholds
}

/** GET response (snake_case — exactly the backend PolicyResponseSchema). */
export interface ConciliacionPolicyResponse {
  id: string | null
  version_number: number
  policy_json: PolicyJson
  created_by: string | null
  created_at: string | null
  change_description: string | null
  source: 'default' | 'stored'
}

/** POST 201 response. */
export interface ConciliacionPolicyCreated {
  id: string
  version_number: number
  created_at: string
}

// ── Safe default (mirrors DEFAULT_POLICY_JSON / resolveAutoMode null posture) ─

export const DEFAULT_AUTO_MATCH_ENABLED: AutoMatchEnabled = {
  recaudo: false,
  dispersion: false,
  ap: false,
  comision: false,
}

const SAFE_DEFAULT_POLICY: ConciliacionPolicyResponse = {
  id: null,
  version_number: 0,
  policy_json: {
    autoMatchEnabled: { ...DEFAULT_AUTO_MATCH_ENABLED },
    confidenceThresholds: {},
  },
  created_by: null,
  created_at: null,
  change_description: null,
  source: 'default',
}

// ── Action result ──────────────────────────────────────────────────────────

export interface SavePolicyInput {
  policyJson: PolicyJson
  changeDescription?: string
}

export interface SavePolicyResult {
  ok: boolean
  error?: string
  created?: ConciliacionPolicyCreated
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseConciliacionPolicyResult {
  /** Active policy (or the safe default when none/unavailable). Never null. */
  data: ConciliacionPolicyResponse
  isLoading: boolean
  /** Non-null when the GET failed (e.g. 404 backend not deployed). The screen
   *  still shows the safe default; this just drives the "requiere backend" hint. */
  error: string | null
  refetch: () => Promise<void>
  savePolicy: (input: SavePolicyInput) => Promise<SavePolicyResult>
}

export function useConciliacionPolicy(): UseConciliacionPolicyResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<ConciliacionPolicyResponse>(SAFE_DEFAULT_POLICY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionPolicy] NEXT_PUBLIC_AGENT_URL is not configured')
      setData(SAFE_DEFAULT_POLICY)
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/conciliacion/policy`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConciliacionPolicyResponse
      // Defensive: ensure the four flags always exist (backend guarantees them,
      // but a partial body must still render the safe posture).
      setData({
        ...json,
        policy_json: {
          autoMatchEnabled: {
            ...DEFAULT_AUTO_MATCH_ENABLED,
            ...(json.policy_json?.autoMatchEnabled ?? {}),
          },
          confidenceThresholds: json.policy_json?.confidenceThresholds ?? {},
        },
      })
      setError(null)
    } catch (err) {
      // FAIL-SOFT: degrade to the safe all-false default, never break the screen.
      setData(SAFE_DEFAULT_POLICY)
      setError(err instanceof Error ? err.message : 'Failed to fetch reconciliation policy')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchData()
  }, [fetchData, agencyId])

  const savePolicy = useCallback(
    async (input: SavePolicyInput): Promise<SavePolicyResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/policy`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              policy_json: input.policyJson,
              ...(input.changeDescription
                ? { change_description: input.changeDescription }
                : {}),
            }),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        const created = (await res.json()) as ConciliacionPolicyCreated
        await fetchData()
        return { ok: true, created }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'save_failed' }
      }
    },
    [agencyId, fetchData],
  )

  return { data, isLoading, error, refetch: fetchData, savePolicy }
}
