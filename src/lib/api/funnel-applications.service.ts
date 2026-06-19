/**
 * funnel-applications.service.ts — client for the agency Postulaciones inbox (F2b).
 *
 * Calls the AGENT backend agency-scoped endpoint
 * `GET {NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/funnel/applications`
 * (authenticated with the Bearer JWT via agentAuthHeaders).
 * Backend: src/server/routes/agency-funnel-applications.ts.
 */

import { agentAuthHeaders } from './agent-auth'

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || ''

export type Verdict = 'approved' | 'review'

export interface FunnelApplication {
  applicationId: string
  verdict: Verdict
  score: number | null
  level: string | null
  requiresManualReview: boolean
  escalate: boolean
  scoredAt: string
}

export interface FunnelApplicationsResponse {
  items: FunnelApplication[]
  generatedAt: string
}

export async function fetchFunnelApplications(
  agencyId: string,
  opts?: { limit?: number },
): Promise<FunnelApplicationsResponse> {
  if (!agencyId) throw new Error('Falta el identificador de la agencia.')
  const qs = opts?.limit ? `?limit=${opts.limit}` : ''
  const res = await fetch(`${AGENT_URL}/api/agency/${agencyId}/funnel/applications${qs}`, {
    headers: agentAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error(`No se pudieron cargar las postulaciones (error ${res.status}).`)
  }
  const data = (await res.json()) as Partial<FunnelApplicationsResponse>
  return {
    items: Array.isArray(data.items) ? (data.items as FunnelApplication[]) : [],
    generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : '',
  }
}

/** Verdict → presentation (label + Tailwind pill classes). */
export const VERDICT_CONFIG: Record<Verdict, { label: string; className: string }> = {
  approved: {
    label: 'Pre-aprobada',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  review: {
    label: 'En revisión',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

/** Short, PII-free reference for an opaque applicationId. */
export function shortApplicationRef(applicationId: string): string {
  if (!applicationId) return '—'
  return applicationId.length > 10 ? `${applicationId.slice(0, 8)}…` : applicationId
}
