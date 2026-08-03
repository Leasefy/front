/**
 * funnel-applications.service.ts — client for the agency Postulaciones inbox (F2b).
 *
 * Calls the AGENT backend agency-scoped endpoint
 * `GET {NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/funnel/applications`
 * (authenticated with the Bearer JWT via agentAuthHeaders).
 * Backend: src/server/routes/agency-funnel-applications.ts.
 */

import { agentAuthHeaders } from './agent-auth'

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

/**
 * Agent mock mode is active when EITHER:
 *  1. NEXT_PUBLIC_AGENT_URL is not configured — mirrors the repo's
 *     `isAgentConfigured()` convention (see ai-hub-lessons.ts): no agent
 *     backend, so local dev gets mock data out of the box; OR
 *  2. NEXT_PUBLIC_USE_MOCK_API === 'true' — explicit dev override
 *     (matches .env.example), even with the agent URL set.
 * With the URL configured and no override, the REAL fetch always runs, so
 * production can never serve mock data. Both env vars are read at call time
 * so tests can toggle them with vi.stubEnv.
 */
function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return true
  return !process.env.NEXT_PUBLIC_AGENT_URL
}

/** Deterministic fixture served in mock mode (stable ids, both verdicts). */
const MOCK_FUNNEL_APPLICATIONS: FunnelApplicationsResponse = {
  items: [
    {
      applicationId: 'mock-app-0001-approved',
      verdict: 'approved',
      score: 87,
      level: 'A',
      requiresManualReview: false,
      escalate: false,
      scoredAt: '2026-07-10T14:30:00.000Z',
    },
    {
      applicationId: 'mock-app-0002-review',
      verdict: 'review',
      score: 63,
      level: 'B',
      requiresManualReview: true,
      escalate: false,
      scoredAt: '2026-07-09T09:15:00.000Z',
    },
    {
      applicationId: 'mock-app-0003-approved',
      verdict: 'approved',
      score: 91,
      level: 'A',
      requiresManualReview: false,
      escalate: false,
      scoredAt: '2026-07-08T16:45:00.000Z',
    },
    {
      applicationId: 'mock-app-0004-review',
      verdict: 'review',
      score: 48,
      level: 'C',
      requiresManualReview: true,
      escalate: true,
      scoredAt: '2026-07-05T11:20:00.000Z',
    },
  ],
  generatedAt: '2026-07-10T15:00:00.000Z',
}

export async function fetchFunnelApplications(
  agencyId: string,
  opts?: { limit?: number },
): Promise<FunnelApplicationsResponse> {
  if (!agencyId) throw new Error('Falta el identificador de la agencia.')
  if (isMockMode()) {
    // Fresh copies so callers can't mutate the shared fixture.
    return {
      items: MOCK_FUNNEL_APPLICATIONS.items.map((item) => ({ ...item })),
      generatedAt: MOCK_FUNNEL_APPLICATIONS.generatedAt,
    }
  }
  // Read at call time (not module load) so the mock decision above and the
  // base URL always agree, and tests can stub the env.
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || ''
  const qs = opts?.limit ? `?limit=${opts.limit}` : ''
  const res = await fetch(`${agentUrl}/api/agency/${agencyId}/funnel/applications${qs}`, {
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
    className: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
  },
  review: {
    label: 'En revisión',
    className: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
  },
}

/** Short, PII-free reference for an opaque applicationId. */
export function shortApplicationRef(applicationId: string): string {
  if (!applicationId) return '—'
  return applicationId.length > 10 ? `${applicationId.slice(0, 8)}…` : applicationId
}
