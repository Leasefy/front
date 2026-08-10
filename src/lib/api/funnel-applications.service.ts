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
 * Both env vars are read at call time so tests can toggle them with vi.stubEnv.
 *
 * **Producción nunca entra a modo mock, ni siquiera sin `NEXT_PUBLIC_AGENT_URL`.**
 * El comentario que estaba acá afirmaba exactamente eso y era falso: bastaba
 * una env sin poner en el deploy para que una inmobiliaria real viera cuatro
 * postulaciones inventadas —con nivel y puntaje— y las trabajara como si
 * fueran personas. Es el mismo defecto que ya se cerró en
 * `aprobacion.service.ts` y `funnel.service.ts`; este quedó afuera porque
 * ninguna pantalla lo consumía todavía. Ahora sí la hay.
 */
function isMockMode(): boolean {
  if (process.env.NODE_ENV === 'production') return false
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

/**
 * Verdict → presentación (clave i18n + clases de token).
 *
 * Dos arreglos respecto de la versión anterior:
 *
 * 1. `approved` decía **"Pre-aprobada"**, palabra muerta en
 *    `docs/VOCABULARIO.md` (*"pero preaprobar qué"* —Juan). Lo que el verdict
 *    dice de verdad es si el agente resolvió la evaluación solo o si necesita
 *    ojos humanos, así que las etiquetas ahora son esas.
 * 2. Los colores eran hex crudos (`bg-[#E8F3EC]`), anti-patrón de
 *    `DESIGN.md` §9. Van por token, que además resuelve el modo oscuro solo.
 *
 * La etiqueta es una clave i18n y no un literal: el copy vive en
 * `locales/{es,en}.json` (VOCABULARIO §Cómo se aplica), y un servicio no puede
 * llamar a `t()`.
 */
export const VERDICT_CONFIG: Record<Verdict, { labelKey: string; className: string }> = {
  approved: {
    labelKey: 'inmobiliaria.recorrido.verdict.evaluada',
    className: 'bg-success-soft text-success',
  },
  review: {
    labelKey: 'inmobiliaria.recorrido.verdict.revision',
    className: 'bg-warning-soft text-warning',
  },
}

/** Short, PII-free reference for an opaque applicationId. */
export function shortApplicationRef(applicationId: string): string {
  if (!applicationId) return '—'
  return applicationId.length > 10 ? `${applicationId.slice(0, 8)}…` : applicationId
}
