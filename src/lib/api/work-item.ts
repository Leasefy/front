/**
 * work-item.ts — front mirror of the unified WorkItem contract.
 *
 * MIRROR of `rent/agent/src/types/work-item.ts` (no shared package between the
 * two repos — keep these in sync by hand). See `.planning/AGENT-WORKSPACE-F0.md`.
 *
 * The agent normalizes each agent's human queue to this shape; the front renders
 * it generically via `<ColaHumana>` and posts back to `WorkItemAction.path`.
 */

/** The 6 agents that own a workspace (roster closed 2026-06-08). */
export type AgenteId =
  | 'cobranza'
  | 'cotizador'
  | 'conciliacion'
  | 'pagos'
  | 'estudio'
  | 'matching'

/** Who despatches the queue — the hub shows one cola per role. */
export type OwnerRole = 'cobrador' | 'analista_riesgo' | 'contador' | 'comercial'

/** Unified 8-state lifecycle (AGENT-WORKSPACE-SPEC §1.2). */
export type WorkItemEstado =
  | 'detectado'
  | 'sugerido'
  | 'en_revision'
  | 'aprobado'
  | 'ejecutando'
  | 'resuelto'
  | 'rechazado'
  | 'fallo'

/** Cross-cutting flags (accumulate; not states). `t323` = legal human-review. */
export type WorkItemFlag = 'necesita_humano' | 'en_espera' | 't323'

/** Mapped from domain urgency or amount thresholds. */
export type Severidad = 'baja' | 'media' | 'alta' | 'critica'

/** A real, already-existing backend action surfaced on the item. */
export interface WorkItemAction {
  id: string
  label: string
  kind: 'primary' | 'danger' | 'neutral'
  method: 'POST'
  /** Full endpoint path (starts with /api/...), already templated. */
  path: string
  bodyHint?: Record<string, 'string' | 'number' | 'enum' | 'empty'>
  requiresReason?: boolean
  perm?: string
}

/** How the agent's suggestion surfaces to the operator. */
export interface AccionSugerida {
  label: string
  confianza?: number
  razon: string
  evidencia?: Array<{ label: string; value: string }>
}

/** The normalized unit of human work, transversal to all agents. */
export interface WorkItem {
  id: string
  agente: AgenteId
  tipo: string
  estado: WorkItemEstado
  flags: WorkItemFlag[]
  ownerRole: OwnerRole
  severidad: Severidad
  titulo: string
  accionSugerida: AccionSugerida
  actions: WorkItemAction[]
  subject: { kind: string; id: string; masked?: string }
  amountCop?: number
  slaAt?: string
  createdAt: string
  decidedBy?: string | null
  decidedAt?: string | null
  source: { endpoint: string; entity: string }
}

/** Response shape of GET /api/agency/{id}/ai-hub/work-items. */
export interface AgentWorkItemsResponse {
  items: WorkItem[]
  total: number
  page: number
  pageSize: number
}
