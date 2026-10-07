'use client'

/**
 * use-conciliacion-run.ts — on-demand reconciliation trigger (build C).
 *
 * Emits the durable reconciliation run via:
 *
 *   POST /api/agency/{agencyId}/conciliacion/run   body: { from?, to? }
 *
 * Response shape mirrors conciliacion-run.ts (verified against the route):
 *   { enqueued: boolean, runId?: string, reason?: string }
 * The backend is fail-soft by construction (returns 200 { enqueued:false,
 * reason } when the event backend is unavailable rather than 500ing).
 *
 * T-323: this is a HUMAN-initiated trigger — the caller gates it behind an
 * explicit operator confirmation. The run itself is shadow-mode (it never
 * auto-applies money without a stored policy).
 *
 * FAIL-SOFT: missing NEXT_PUBLIC_AGENT_URL / no agencyId / 404 (route not
 * deployed) / network error → returns { ok:false, ... }; never throws. The
 * caller surfaces an honest message and leaves the screen untouched.
 */

import { useCallback, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { accionQueNoSalioConCuerpo } from '@/lib/hooks/ai/accion-del-micro'

export interface ConciliacionRunWindow {
  /** ISO-8601 lower bound. Omit → backend default look-back (7 days). */
  from?: string
  /** ISO-8601 upper bound. Omit → now. */
  to?: string
}

export interface ConciliacionRunResult {
  ok: boolean
  /** true only when the backend confirmed the run was enqueued. */
  enqueued?: boolean
  runId?: string
  /** db_unavailable | inngest_unavailable (backend) · http status · network msg. NO es para la persona. */
  reason?: string
  /** El error entero para el traductor (`mensajeParaLaPersona`): el `ApiError` del micro o el de red tal cual. */
  fallo?: unknown
}

export interface UseConciliacionRunResult {
  /** true while a run request is in flight (drive the button busy state). */
  isRunning: boolean
  requestRun: (window?: ConciliacionRunWindow) => Promise<ConciliacionRunResult>
}

export function useConciliacionRun(): UseConciliacionRunResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isRunning, setIsRunning] = useState(false)

  const requestRun = useCallback(
    async (window?: ConciliacionRunWindow): Promise<ConciliacionRunResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { ok: false, reason: 'not_configured' }
      }

      const body: ConciliacionRunWindow = {}
      if (window?.from) body.from = window.from
      if (window?.to) body.to = window.to

      try {
        setIsRunning(true)
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/run`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        if (res.status === 404) {
          // Route not deployed yet — honest no-op (not a crash).
          return { ok: false, reason: 'not_available' }
        }
        const json = (await res.json().catch(() => ({}))) as {
          enqueued?: boolean
          runId?: string
          reason?: string
          error?: string
        }
        if (!res.ok) {
          const { fallo } = await accionQueNoSalioConCuerpo(res.status, json)
          return { ok: false, reason: json.error ?? json.reason ?? `${res.status}`, fallo }
        }
        return {
          ok: true,
          enqueued: json.enqueued,
          runId: json.runId,
          reason: json.reason,
        }
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'run_failed', fallo: err }
      } finally {
        setIsRunning(false)
      }
    },
    [agencyId],
  )

  return { isRunning, requestRun }
}
