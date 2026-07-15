/**
 * pagos-home.types.ts — Pagos IA Home data-layer types.
 *
 * Hand-written response shapes for the 4 agent endpoints under
 * `GET ${NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/pagos/home/...`.
 * Authoritative (not codegen) — mirror the agent contract exactly. Keep in sync
 * with the agent's `pagos/home` route handlers.
 */

// ── 1. GET /pagos/home/metrics ───────────────────────────────────────────────

export interface PagosHomeMetrics {
  cobrosProgramados: number
  cobrosEnviados: number
  pagosRecibidos: number
  linksPendientes: number
  pagosFallidos: number
  valorRecaudadoCop: number
  propietariosListos: number
  valorPendienteLiquidarCop: number
}

// ── 2. GET /pagos/home/attention ─────────────────────────────────────────────

export type PagosHomeAttentionKind =
  | 'cobro_fallido'
  | 'link_vencido'
  | 'proximo_a_vencer'
  | 'pago_en_proceso'

export type PagosHomeAttentionPriority = 'alta' | 'media' | 'baja'

export interface PagosHomeAttentionItem {
  id: string
  kind: PagosHomeAttentionKind
  priority: PagosHomeAttentionPriority
  title: string
  detail: string
  totalCop: number
  suggestedAction: string
}

export interface PagosHomeAttention {
  items: PagosHomeAttentionItem[]
}

// ── 3. GET /pagos/home/payment/{invoiceId} ───────────────────────────────────

export interface PaymentDetailContexto {
  invoiceId: string
  periodo: string
  totalCop: number
  status: string
  dueDate: string | null
  tenantPersonName: string
  tenantPersonPhone: string
  propertyRef: string
}

export interface PaymentDetailActivityEntry {
  at: string
  kind: string
  detail: string
}

export interface PaymentDetailRecomendacionIA {
  text: string
  suggestedAction: string
}

export interface PaymentDetail {
  contexto: PaymentDetailContexto
  actividad: PaymentDetailActivityEntry[]
  recomendacionIA: PaymentDetailRecomendacionIA
}

// ── 4. GET /pagos/home/owner-inbox ───────────────────────────────────────────

export interface OwnerInboxRow {
  ownerProfileId: string
  ownerName: string
  inmueblesCount: number
  valorAPagarCop: number
  estado: string
  suggestedAction: string
}

export interface OwnerInbox {
  rows: OwnerInboxRow[]
}
