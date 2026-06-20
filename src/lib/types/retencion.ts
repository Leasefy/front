/**
 * Tipos del frontend del agente de Retención ("Laura").
 * Reflejan el contrato del backend `GET /api/agency/:agencyId/retencion/*`
 * (agente flag-OFF `RETENCION_ENABLED` — ver `~/rent/agent` rama
 * feat/agente-retencion-laura). Mientras el backend no esté vivo, los hooks
 * caen a mock data (mock-first).
 */

export type RetentionState =
  | 'saludable'
  | 'observacion'
  | 'riesgo_medio'
  | 'alto_riesgo'
  | 'critico'
  | 'recuperado'
  | 'perdido'

export type Confidence = 'alta' | 'media' | 'baja'

export interface RootCause {
  key: string
  label: string
  pct: number
}

export interface RetentionCase {
  caseId: string
  ownerId: string
  ownerName: string
  ownerType: string
  city: string | null
  propertyCount: number
  drivingProperty?: { id: string; address: string | null } | null
  score: number
  state: RetentionState
  rootCause: RootCause
  lastSignal?: { label: string; at: string } | null
  monthlyIncomeAtRisk: number
  expectedCommissionLoss: number
  responsible: { role: string; name?: string | null }
  dueDate?: { at: string; reason: string } | null
  nextAction: { code: string; label: string }
  confidence: Confidence
}

export interface BandejaFacets {
  byState: Record<string, number>
  byCause: Record<string, number>
  byCity: Record<string, number>
  byExecutive: Record<string, number>
}

export type BandejaTab =
  | 'critico'
  | 'alto'
  | 'medio'
  | 'renovaciones'
  | 'vacancia'
  | 'mantenimiento'
  | 'finanzas'
  | 'comunicacion'
  | 'recuperados'
  | 'perdidos'

export interface BandejaResult {
  cases: RetentionCase[]
  facets: BandejaFacets
  total: number
}

export type DashboardState = 'empty' | 'alert' | 'success' | 'ok'
export type CardTone = 'default' | 'warning' | 'danger' | 'success'

export interface DashboardCard {
  key: string
  label: string
  value: string | number
  hint?: string
  tone?: CardTone
}

export interface UrgentCase {
  caseId: string
  ownerName: string
  score: number
  state: RetentionState
  rootCauseLabel: string
  expectedCommissionLoss: number
  nextActionLabel: string
}

export interface RetencionDashboard {
  cards: DashboardCard[]
  urgent: UrgentCase[]
  state: DashboardState
  generatedAt?: string
}

/** Sección que puede no tener fuente desplegada todavía (honesto, no inventa). */
export interface NoSource<T> {
  available: boolean
  reason?: string
  note?: string
  items: T[]
}

export interface OwnerPropertyRow {
  id: string
  address: string | null
  canon: number | null
  estado: string
  diasVacio?: number | null
  score?: number
}

export interface OwnerProfile {
  header: RetentionCase
  resumenSalud: {
    state: RetentionState
    score: number
    rootCause: RootCause
    diagnosis: string
    confidence: Confidence
  }
  inmuebles: NoSource<OwnerPropertyRow>
  financiero: NoSource<{ label: string; value: string }>
  interacciones: NoSource<{ at: string; kind: string; summary: string }>
  casos: NoSource<{ id: string; label: string; state: string }>
  mantenimientos: NoSource<{ at: string; label: string; status: string }>
  contratos: NoSource<{ id: string; label: string; vence?: string | null }>
  documentos: NoSource<{ id: string; label: string }>
  plan: NoSource<{ id: string; objective: string; status: string }>
  bitacora: NoSource<{ at: string; label: string }>
}

export type PlanStatus = 'activo' | 'logrado' | 'perdido' | 'cancelado'
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'

export interface RetencionTaskDTO {
  id?: string
  code: string
  title: string
  description?: string | null
  responsibleRole: string
  dueDate?: string | null
  status: TaskStatus
}

export interface RetencionPlanDTO {
  id?: string
  caseId: string
  playbookId: string
  rootCauseKey: string
  objective: string
  responsibleRole: string
  expectedResult?: string | null
  actualResult?: string | null
  status: PlanStatus
  nextFollowUpAt?: string | null
  tasks: RetencionTaskDTO[]
  /** true = propuesto on-the-fly (no persistido todavía). */
  proposed?: boolean
}

export type MessageChannel = 'whatsapp' | 'email' | 'guion'
export type MessageTone = 'neutral' | 'formal'

export interface OwnerMessageDraft {
  channel: MessageChannel
  tone: MessageTone
  subject?: string | null
  body: string
  source: 'template' | 'llm'
  /** true = el LLM intentó algo no-compliant y se cayó al template (piso). */
  barrierApplied: boolean
}

export interface RetentionGuard {
  canDraftMessage: boolean
  retentionRecommended: boolean
  escalateLegal: boolean
  financialDataConsistent: boolean
  reasons: string[]
}

export interface CaseBundle {
  caseId: string
  profile: OwnerProfile
  plan: RetencionPlanDTO | null
  guard: RetentionGuard
  message: OwnerMessageDraft
}
