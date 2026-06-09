/**
 * agent-workspace.ts — F6 of the Agent Workspace initiative.
 *
 * Front mirror of the three per-agent workspace contracts served by the agent
 * microservice (built in parallel — code to the contract, not to a live server):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/overview   → AgentOverviewResponse
 *   GET /api/agency/{agencyId}/ai-hub/work-items/{agente}/{id}    → WorkItemDetailResponse
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia  → AgentAutonomiaResponse
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/analitica  → AgentAnaliticaResponse (F10)
 *   GET /api/agency/{agencyId}/ai-hub/resumen                     → AiHubResumenResponse (F10)
 *
 * A 404 from any of these means "el agente aún no reporta" (endpoint not
 * deployed / nothing to show) and is surfaced as `notAvailable`, NOT an error.
 *
 * Follows the NEXT_PUBLIC_AGENT_URL + agentAuthHeaders pattern of
 * `use-agent-work-items.ts` / `work-item.ts`.
 */

import { agentAuthHeaders } from './agent-auth'
import type { AgenteId, OwnerRole, WorkItem, WorkItemAction, WorkItemEstado } from './work-item'

// ── Overview (Sala) ─────────────────────────────────────────────────────────

export type KpiFormat = 'number' | 'percent' | 'cop'

export interface OverviewKpi {
  id: string
  label: string
  value: number
  format: KpiFormat
}

export interface OverviewPipelineSegment {
  /** One of the 8 WorkItem estados (see work-item.ts). */
  estado: WorkItemEstado
  count: number
}

/** Who produced a feed/traza entry. */
export type ActorType = 'user' | 'agent' | 'system'

export interface OverviewFeedEntry {
  id: string
  titulo: string
  detalle: string
  actorType: ActorType
  occurredAt: string
}

export interface AgentOverviewResponse {
  agente: AgenteId
  kpis: OverviewKpi[]
  pipeline: OverviewPipelineSegment[]
  feed: OverviewFeedEntry[]
  generatedAt: string
}

// ── Work-item detail (Detalle de caso) ──────────────────────────────────────

export interface ContextoRow {
  label: string
  value: string
}

export interface ContextoBlock {
  title: string
  rows: ContextoRow[]
}

export interface TrazaEntry {
  id: string
  action: string
  actorType: ActorType
  actorId: string
  occurredAt: string
  details: Record<string, unknown>
}

export interface WorkItemDetailResponse {
  item: WorkItem
  contexto: ContextoBlock[]
  traza: TrazaEntry[]
  generatedAt: string
}

// ── Autonomía ───────────────────────────────────────────────────────────────

export type AutonomiaModo = 'sombra' | 'copiloto' | 'autonomo'

export interface VallaItem {
  id: string
  label: string
  value: string
  /** 'activo' renders a green dot; any other value renders neutral. */
  estado: string
}

export interface AgentAutonomiaResponse {
  agente: AgenteId
  modo: AutonomiaModo
  modosDisponibles: AutonomiaModo[]
  valla: VallaItem[]
  t323: boolean
  nota: string
  generatedAt: string
}

// ── Analítica (superficie 6) ────────────────────────────────────────────────

/** One zero-filled daily point (last 30 Bogotá days). */
export interface AnaliticaSeriePoint {
  /** YYYY-MM-DD (Bogotá calendar day). */
  date: string
  value: number
}

export interface AnaliticaSerie {
  id: string
  label: string
  /** percent values are FRACTIONS 0..1 (same convention as OverviewKpi). */
  format: KpiFormat
  points: AnaliticaSeriePoint[]
}

export interface AgentAnaliticaResponse {
  agente: AgenteId
  /** KPI strip — same {id,label,value,format} shape as the Sala KPIs. */
  resumen: OverviewKpi[]
  series: AnaliticaSerie[]
  generatedAt: string
}

// ── Hub resumen (6 colas por rol — decisión 2026-06-08) ─────────────────────

export interface ResumenAgenteEntry {
  agente: AgenteId
  enCola: number
  /**
   * false = that agent's count failed server-side (e.g. table pre-migration).
   * Render the card with "—" + a subtle "sin datos" hint, NOT an error.
   */
  disponible: boolean
}

export interface ResumenCola {
  rol: OwnerRole
  label: string
  total: number
  agentes: ResumenAgenteEntry[]
}

export interface AiHubResumenResponse {
  colas: ResumenCola[]
  totalEnCola: number
  generatedAt: string
}

// ── Fetchers ────────────────────────────────────────────────────────────────

export interface AgentWorkspaceFetchResult<T> {
  data: T | null
  /** true when the backend returned 404 — graceful empty state, NOT an error. */
  notAvailable: boolean
}

async function getJson<T>(path: string): Promise<AgentWorkspaceFetchResult<T>> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('not_configured')
  const res = await globalThis.fetch(`${agentUrl}${path}`, { headers: agentAuthHeaders() })
  if (res.status === 404) return { data: null, notAvailable: true }
  if (!res.ok) throw new Error(`${res.status}`)
  return { data: (await res.json()) as T, notAvailable: false }
}

export function fetchAgentOverview(
  agencyId: string,
  agente: AgenteId,
): Promise<AgentWorkspaceFetchResult<AgentOverviewResponse>> {
  return getJson<AgentOverviewResponse>(
    `/api/agency/${agencyId}/ai-hub/agentes/${agente}/overview`,
  )
}

export function fetchWorkItemDetail(
  agencyId: string,
  agente: AgenteId,
  id: string,
): Promise<AgentWorkspaceFetchResult<WorkItemDetailResponse>> {
  return getJson<WorkItemDetailResponse>(
    `/api/agency/${agencyId}/ai-hub/work-items/${agente}/${encodeURIComponent(id)}`,
  )
}

export function fetchAgentAnalitica(
  agencyId: string,
  agente: AgenteId,
): Promise<AgentWorkspaceFetchResult<AgentAnaliticaResponse>> {
  return getJson<AgentAnaliticaResponse>(
    `/api/agency/${agencyId}/ai-hub/agentes/${agente}/analitica`,
  )
}

export function fetchAgentAutonomia(
  agencyId: string,
  agente: AgenteId,
): Promise<AgentWorkspaceFetchResult<AgentAutonomiaResponse>> {
  return getJson<AgentAutonomiaResponse>(
    `/api/agency/${agencyId}/ai-hub/agentes/${agente}/autonomia`,
  )
}

export function fetchAiHubResumen(
  agencyId: string,
): Promise<AgentWorkspaceFetchResult<AiHubResumenResponse>> {
  return getJson<AiHubResumenResponse>(`/api/agency/${agencyId}/ai-hub/resumen`)
}

/**
 * Posts a WorkItemAction to its own declared endpoint — same semantics as
 * `useAgentWorkItems().runAction`, usable outside the list hook (e.g. the
 * detail page, which refetches the detail instead of the list).
 */
export async function runWorkItemAction(
  action: WorkItemAction,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  try {
    const res = await globalThis.fetch(`${agentUrl}${action.path}`, {
      method: action.method,
      headers: agentAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: errBody.error ?? `${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'action_failed' }
  }
}
