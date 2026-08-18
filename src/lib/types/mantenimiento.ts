/**
 * mantenimiento.ts — Phase 7 plan 07-01 (DASH-01/02/03)
 *
 * SINGLE SOURCE OF TRUTH for the Martín maintenance-triage dashboard domain model.
 * Owner module: mock data (mock-mantenimiento.ts), the three data hooks, and all
 * three UI plans (07-02 overview, 07-03 inbox, 07-04 detail) IMPORT from here —
 * they NEVER redefine these types (CONTEXT §07-01).
 *
 * Pure type module — NO 'use client', zero runtime deps.
 *
 * The enumerable domains are declared as `as const` tuples so consumers can BOTH
 * iterate them (e.g. render every filter chip) AND derive the literal-union types
 * from them. Aligned with the agent backend Phases 1-8 (16-state machine, 5
 * severities, 13 categories, vision contract).
 */

// =============================================================================
// Enumerable domains — `as const` tuples + derived literal unions
// =============================================================================

/** The 16 ticket states, in canonical order (backend state machine, P1-8). */
export const MAINTENANCE_STATES = [
  'recibido',
  'en_triage',
  'informacion_incompleta',
  'clasificado',
  'requiere_aprobacion',
  'proveedor_sugerido',
  'proveedor_asignado',
  'visita_programada',
  'en_ejecucion',
  'pendiente_cotizacion',
  'pendiente_pago',
  'resuelto',
  'validado',
  'cerrado',
  'reabierto',
  'escalado',
] as const
export type MaintenanceTicketState = (typeof MAINTENANCE_STATES)[number]

/** The 5 severities, most → least urgent. */
export const SEVERITIES = ['emergencia', 'alta', 'media', 'baja', 'informativa'] as const
export type Severity = (typeof SEVERITIES)[number]

/** The 13 maintenance categories. */
export const CATEGORIES = [
  'plomeria',
  'electricidad',
  'gas',
  'humedad_filtracion',
  'carpinteria',
  'cerrajeria',
  'electrodomesticos',
  'pintura_acabados',
  'pisos',
  'vidrios_ventanas',
  'estructural',
  'zonas_comunes',
  'preventivo',
] as const
export type Category = (typeof CATEGORIES)[number]

/** Priority bucket derived from the 0–100 score. */
export type ScoreBucket = 'bajo' | 'medio' | 'alto' | 'critico' | 'emergencia'

/**
 * Probable responsible party — shown in the UI as a HYPOTHESIS, never a verdict
 * (CONTEXT §compliance: "No prometer").
 */
export type ProbableResponsible =
  | 'propietario'
  | 'inquilino'
  | 'copropiedad'
  | 'constructor'
  | 'proveedor_anterior'
  | 'aseguradora'
  | 'no_determinado'

// =============================================================================
// Domain interfaces
// =============================================================================

/**
 * Vision analysis for an attached photo. Keys are snake_case to match the
 * backend vision contract VERBATIM — do NOT camelCase these. The UI must surface
 * the LIMITS (`cannot_determine`, `safety_hold`) and never assert "clearance" for
 * gas/electricidad/estructural (CONTEXT §compliance).
 */
export interface VisionAnalysis {
  safety_hold: boolean
  requires_human_inspection: boolean
  signals: string[]
  /** 0–100 photo-quality heuristic. */
  photo_quality_score: number
  cannot_determine: string[]
}

/** A ticket as shown in the prioritized inbox (DASH-02 card). */
export interface MaintenanceTicketCard {
  id: string
  titulo: string
  inmueble: { address: string; unit?: string }
  /** 0–100. */
  score: number
  bucket: ScoreBucket
  categoria: Category
  severidad: Severity
  estado: MaintenanceTicketState
  /** ISO string. */
  createdAt: string
  /** ISO string — SLA deadline measured vs validated_at, not assigned (anti-gaming). */
  slaDeadlineAt: string
  proveedorSugerido?: string
  requiereAprobacion: boolean
  hasPhotos: boolean
  reabierto: boolean
  retencionRiesgo?: boolean
  /** Integer COP. */
  costoEstimadoCop?: number
  responsableProbable: ProbableResponsible
}

/** A recommended provider entry (principal or backup). */
export interface RecommendedProvider {
  nombre: string
  /** 0–5. */
  rating?: number
  etaHoras?: number
  motivo?: string
}

/** A timeline event on a ticket. */
export interface TicketEvent {
  id: string
  /** ISO string. */
  at: string
  tipo: string
  descripcion: string
  actor: 'agent' | 'human'
}

/** Full ticket detail (DASH-03) — the card plus the 5 detail panels. */
export interface MaintenanceTicketDetail extends MaintenanceTicketCard {
  descripcion: string
  /** "Qué entendí" panel — the agent's paraphrase of the report. */
  queEntendi: string
  clasificacion: {
    categoria: Category
    severidad: Severity
    score: number
    bucket: ScoreBucket
    rationale: string
  }
  /** One entry per attached photo — maps cleanly to ImagenesPanel (07-04). May be empty. */
  vision: VisionAnalysis[]
  proveedorRecomendado: {
    principal: RecommendedProvider | null
    backup: RecommendedProvider | null
  }
  aprobacion: {
    /** Integer COP — the owner-approval cap. */
    capCop: number
    /** Integer COP. */
    estimatedMaxCop: number
    requiresApproval: boolean
  }
  eventos: TicketEvent[]
}

/**
 * Operational-health KPIs (DASH-01).
 *
 * `reaperturas30dPct` and `tiempoResolucionRealDias` are the MANDATORY anti-gaming
 * metrics (CONTEXT §compliance): SLA/resolution is measured against `validated_at`,
 * NOT `assigned_at`, and reopened tickets within 30d are surfaced so a "fast close"
 * that immediately reopens cannot be gamed into looking healthy.
 */
export interface MaintenanceKpis {
  ticketsAbiertos: number
  emergenciasActivas: number
  vencidos: number
  tiempoPrimeraRespuestaMin: number
  slaCumplidoPct: number
  /** ANTI-GAMING: % of tickets reopened within 30 days of close. */
  reaperturas30dPct: number
  /** ANTI-GAMING: real days to resolution measured vs validated_at (not assigned). */
  tiempoResolucionRealDias: number
  /** Integer COP — sum of estimated cost across open tickets. */
  costoEstimadoAbiertoCop: number
  propietariosEnRiesgo: number
}

/** Every DASH-02 filter, all optional. */
export interface InboxFilters {
  severidad?: Severity[]
  categoria?: Category[]
  estado?: MaintenanceTicketState[]
  /** true → only tickets whose SLA deadline has passed. */
  slaBreached?: boolean
  proveedor?: string
  propietario?: string
  inmueble?: string
  zona?: string
  responsable?: ProbableResponsible[]
  requiereAprobacion?: boolean
  hasPhotos?: boolean
  reabierto?: boolean
  retencionRiesgo?: boolean
  /** Integer COP — inclusive lower bound on costoEstimadoCop. */
  costoMinCop?: number
  /** Integer COP — inclusive upper bound on costoEstimadoCop. */
  costoMaxCop?: number
}

// =============================================================================
// CTA gating — shared transition source of truth (C7-04)
// =============================================================================

/** Terminal states (no further CTA transitions out). */
export const MAINTENANCE_TERMINAL_STATES: readonly MaintenanceTicketState[] = ['cerrado'] as const

/**
 * Valid ORIGIN states per CTA, aligned with the backend 16-state machine (P1-8).
 * 07-04 IMPORTS this map and never hardcodes local sets — it only DISABLES buttons
 * whose `ticket.estado` is not an allowed origin (mock-first gating).
 *
 * `cerrar` requires origin `resuelto` AND the FENCE-04 evidence+confirmation gate
 * (the CTA shows a confirmation Dialog before invoking close()).
 */
export const CTA_ALLOWED_FROM: Record<
  'asignar' | 'pedirInfo' | 'solicitarAprobacion' | 'escalarEmergencia' | 'cerrar',
  readonly MaintenanceTicketState[]
> = {
  asignar: ['proveedor_sugerido'],
  pedirInfo: ['recibido', 'en_triage', 'informacion_incompleta', 'clasificado'],
  solicitarAprobacion: ['clasificado'],
  escalarEmergencia: [
    'recibido',
    'en_triage',
    'informacion_incompleta',
    'clasificado',
    'requiere_aprobacion',
    'proveedor_sugerido',
    'proveedor_asignado',
    'visita_programada',
    'en_ejecucion',
    'pendiente_cotizacion',
    'pendiente_pago',
    'resuelto',
  ],
  cerrar: ['resuelto'], // FENCE-04: cerrar exige evidencia+confirmación
}
