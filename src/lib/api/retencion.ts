/**
 * Cliente del agente de Retención ("Laura"). Llama
 * `${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/retencion/*` con bearer
 * (`agentAuthHeaders`). Mock-first: sin URL del agente, o si el backend responde
 * error/404/flag-OFF, cae a mock data para que la demo siempre renderice.
 */
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import {
  getMockBandeja,
  getMockCaseBundle,
  getMockDashboard,
  getMockDecisions,
  patchMockDecision,
} from '@/lib/data/mock-retencion'
import type {
  BandejaResult,
  BandejaTab,
  CaseBundle,
  DecisionsResult,
  PatchDecisionResult,
  RetencionDashboard,
  ReviewOutcome,
} from '@/lib/types/retencion'

export interface Fetched<T> {
  data: T
  /** true = se devolvió mock (backend ausente, flag-OFF o error). */
  usingMock: boolean
}

function agentBase(agencyId: string): string | null {
  const url = process.env.NEXT_PUBLIC_AGENT_URL
  if (!url) return null
  return `${url}/api/agency/${agencyId}/retencion`
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await globalThis.fetch(path, { headers: agentAuthHeaders(), signal })
  if (!res.ok) throw new Error(`${res.status}`)
  return (await res.json()) as T
}

export async function fetchDashboard(
  agencyId: string,
  signal?: AbortSignal,
): Promise<Fetched<RetencionDashboard>> {
  const base = agentBase(agencyId)
  if (!base) return { data: getMockDashboard(), usingMock: true }
  try {
    return { data: await getJson<RetencionDashboard>(`${base}/dashboard`, signal), usingMock: false }
  } catch {
    return { data: getMockDashboard(), usingMock: true }
  }
}

export async function fetchBandeja(
  agencyId: string,
  tab: BandejaTab | 'todos' = 'todos',
  signal?: AbortSignal,
): Promise<Fetched<BandejaResult>> {
  const base = agentBase(agencyId)
  if (!base) return { data: getMockBandeja(), usingMock: true }
  const qs = tab && tab !== 'todos' ? `?tab=${encodeURIComponent(tab)}` : ''
  try {
    return { data: await getJson<BandejaResult>(`${base}/bandeja${qs}`, signal), usingMock: false }
  } catch {
    return { data: getMockBandeja(), usingMock: true }
  }
}

/**
 * Bundle de un caso: perfil + plan propuesto + guardrails + borrador de mensaje.
 * El backend expone estos como rutas separadas; aquí se ensamblan en paralelo y,
 * ante cualquier fallo, se cae al bundle mock completo.
 */
export async function fetchCaseBundle(
  agencyId: string,
  caseId: string,
  signal?: AbortSignal,
): Promise<Fetched<CaseBundle>> {
  const base = agentBase(agencyId)
  if (!base) return { data: getMockCaseBundle(caseId), usingMock: true }
  const enc = encodeURIComponent(caseId)
  const ownerId = caseId.startsWith('owner:') ? caseId.slice('owner:'.length) : caseId
  try {
    const [profile, plan, guard, message] = await Promise.all([
      getJson<CaseBundle['profile']>(`${base}/propietarios/${encodeURIComponent(ownerId)}/perfil`, signal),
      getJson<CaseBundle['plan']>(`${base}/casos/${enc}/plan-propuesto`, signal).catch(() => null),
      getJson<CaseBundle['guard']>(`${base}/casos/${enc}/guardrails`, signal),
      getJson<CaseBundle['message']>(`${base}/casos/${enc}/mensaje`, signal),
    ])
    return { data: { caseId, profile, plan, guard, message }, usingMock: false }
  } catch {
    return { data: getMockCaseBundle(caseId), usingMock: true }
  }
}

export interface FetchDecisionsOpts {
  reviewableOnly?: boolean
  caseId?: string
  limit?: number
}

/**
 * Cola de revisión de decisiones autónomas (T-323). `base` ya incluye
 * `/retencion`, así que la ruta final es `${base}/decisions`. Mock-first.
 */
export async function fetchDecisions(
  agencyId: string,
  opts: FetchDecisionsOpts = {},
  signal?: AbortSignal,
): Promise<Fetched<DecisionsResult>> {
  const base = agentBase(agencyId)
  if (!base) return { data: getMockDecisions(opts), usingMock: true }
  const params = new URLSearchParams()
  if (opts.reviewableOnly) params.set('reviewableOnly', 'true')
  if (opts.caseId) params.set('caseId', opts.caseId)
  if (typeof opts.limit === 'number') params.set('limit', String(opts.limit))
  const qs = params.toString()
  try {
    return {
      data: await getJson<DecisionsResult>(`${base}/decisions${qs ? `?${qs}` : ''}`, signal),
      usingMock: false,
    }
  } catch {
    return { data: getMockDecisions(opts), usingMock: true }
  }
}

/**
 * Revisa una decisión autónoma. `PATCH ${base}/decisions/:id`. Mock-first.
 * `agentAuthHeaders({ 'content-type': 'application/json' })` conserva el bearer
 * (construye `new Headers(extra)` y luego setea Authorization — no se pierde).
 */
export async function patchDecisionReview(
  agencyId: string,
  decisionId: string,
  body: { reviewOutcome: ReviewOutcome; reviewedBy?: string },
  signal?: AbortSignal,
): Promise<Fetched<PatchDecisionResult>> {
  const base = agentBase(agencyId)
  if (!base) return { data: patchMockDecision(decisionId, body), usingMock: true }
  try {
    const res = await globalThis.fetch(`${base}/decisions/${encodeURIComponent(decisionId)}`, {
      method: 'PATCH',
      headers: agentAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return { data: (await res.json()) as PatchDecisionResult, usingMock: false }
  } catch {
    return { data: patchMockDecision(decisionId, body), usingMock: true }
  }
}
