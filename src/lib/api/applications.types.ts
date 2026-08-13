/**
 * Backend application API types
 * Reflects the exact shape of NestJS responses for /applications and /documents
 */

export interface BackendApplication {
  id: string;
  propertyId: string;
  tenantId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

  // Personal
  fullName?: string;
  documentType?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  currentAddress?: string;
  timeAtCurrentAddress?: number;
  maritalStatus?: string;
  dependents?: number;

  // Employment
  employmentStatus?: string;
  companyName?: string;
  industry?: string;
  position?: string;
  contractType?: string;
  timeAtJob?: number;
  employerPhone?: string;
  employerAddress?: string;

  // Income
  monthlySalary?: number;
  additionalIncome?: number;
  additionalIncomeSource?: string;
  totalMonthlyIncome?: number;
  monthlyObligations?: number;
  availableForRent?: number;

  // References (JSON)
  references?: {
    previousLandlords?: Array<{
      name: string;
      phone: string;
      address: string;
      duration: number;
      relationship: string;
    }>;
    employmentReferences?: Array<{
      name: string;
      phone: string;
      company: string;
      relationship: string;
    }>;
    personalReferences?: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  };

  // Co-signer
  hasCoSigner?: boolean;
  coSigner?: Record<string, unknown>;

  // Agent attribution
  agentCode?: string;
  linkCode?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations
  documents?: BackendDocument[];
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    monthlyRent: number;
    images?: Array<{ url: string; order: number }>;
  };
}

/**
 * Review lifecycle status for a tenant-uploaded document.
 * Backend enum (uppercase). Spanish labels live in
 * `src/lib/documents/review-status.ts`.
 */
export type DocumentReviewStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface BackendDocument {
  id: string;
  applicationId: string;
  /** Canonical document type (e.g. ID_DOCUMENT, BANK_STATEMENT, INCOME_PROOF, EMPLOYMENT_LETTER, PAY_STUB, CREDIT_REPORT) */
  type: string;
  /** Original filename uploaded by the user (canonical field name from backend) */
  originalName: string;
  /** Path in Supabase Storage */
  storagePath?: string;
  /** @deprecated use originalName — kept for pre-migration payloads */
  fileName?: string;
  /** Optional public URL if backend returns a resolved download link */
  url?: string;
  mimeType: string;
  size: number;
  createdAt: string;
  /**
   * Review lifecycle fields (added when the back shipped document review).
   * Absent on pre-migration payloads → normalize to 'PENDING'.
   */
  reviewStatus?: DocumentReviewStatus;
  /** ISO timestamp of the last review transition. Null while still PENDING. */
  reviewedAt?: string | null;
  /** Reason surfaced to the tenant when reviewStatus is REJECTED. */
  rejectionReason?: string | null;
}

export interface CreateApplicationDto {
  propertyId: string;
  fullName?: string;
  documentType?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  currentAddress?: string;
  timeAtCurrentAddress?: number;
  maritalStatus?: string;
  dependents?: number;
  employmentStatus?: string;
  companyName?: string;
  industry?: string;
  position?: string;
  contractType?: string;
  timeAtJob?: number;
  employerPhone?: string;
  employerAddress?: string;
  monthlySalary?: number;
  additionalIncome?: number;
  additionalIncomeSource?: string;
  totalMonthlyIncome?: number;
  monthlyObligations?: number;
  availableForRent?: number;
  references?: Record<string, unknown>;
  hasCoSigner?: boolean;
  coSigner?: Record<string, unknown>;
  agentCode?: string;
  linkCode?: string;
  /** true when the candidate explicitly accepted the habeas-data consent */
  habeasDataConsent?: boolean;
  /** version string from GET /legal/consent-text — omit when text fetch failed */
  authorizationVersion?: string;
}

export interface ApplicationPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedApplications {
  data: BackendApplication[];
  meta: ApplicationPaginationMeta;
}

// ============================================================================
// Landlord / Agency — /landlord/* endpoints
// ============================================================================

// Status values returned by the /landlord/* endpoints
export type LandlordApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PREAPPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_INFO'
  | 'WITHDRAWN'
  /** Terminal: el flujo de contrato colapsó (rechazo definitivo o cancelación). El tenant debe crear una nueva aplicación para reintentar. */
  | 'CONTRACT_FAILED';

export interface LandlordRiskScore {
  totalScore: number; // 0-100
  level: 'A' | 'B' | 'C' | 'D';
}

/** Shape returned by GET /landlord/properties/:id/candidates */
export interface LandlordCandidate {
  id: string;
  tenantName: string;
  tenantEmail: string;
  status: LandlordApplicationStatus;
  submittedAt: string;
  riskScore?: LandlordRiskScore;
  privateNote?: string | null;
}

/** Item of GET /landlord/candidates — candidate plus its property context */
export interface AllCandidatesItem extends LandlordCandidate {
  propertyId: string;
  propertyTitle: string;
}

/** Shape returned by GET /landlord/candidates */
export interface AllCandidatesResponse {
  candidates: AllCandidatesItem[];
  total: number;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface LandlordApplicationDocument {
  id: string;
  type: string;
  name: string;
  uploadedAt: string;
}

export interface LandlordApplicationTimelineEvent {
  event: string;
  timestamp: string;
  actor?: string;
  notes?: string;
}

export interface LandlordApplicationDetail extends LandlordCandidate {
  documents?: LandlordApplicationDocument[];
  timeline?: LandlordApplicationTimelineEvent[];
  property?: {
    id: string;
    title: string;
    monthlyRent: number;
  };
}

// ============================================================================
// Credit bureau check types
// ============================================================================

export type CreditCheckStatus =
  | 'approved'
  | 'rejected_credit'
  | 'rejected_income'
  | 'blocked_admin'
  | 'awaiting_authorization'
  | 'error'
  | 'not_evaluated';

export type CreditCheckReasonCode =
  | 'credit_history_rejection'
  | 'declared_income_insufficient'
  | 'study_payment_pending'
  | 'unknown_rejection'
  | 'awaiting_habeas_data'
  | 'study_error'
  | null;

/**
 * Credit bureau check result returned as part of EvaluationResponseDto.
 * Present only when status is COMPLETED or FAILED; absent on old evaluations.
 * Top-level key is snake_case `credit_check`; inner keys are camelCase (backend asymmetry).
 * Absence must be treated as not_evaluated.
 */
export interface CreditCheck {
  status: CreditCheckStatus;
  bureauScore: number | null;
  monthlyCapacity: number | null;
  reasonCode: CreditCheckReasonCode;
  progressPercentage: number | null;
}

// ============================================================================
// Protection options — insurance/bond carriers panel (agente de seguros)
// ============================================================================

export type ProtectionProductType = 'seguro' | 'fianza';
export type ProtectionOptionStatus = 'available' | 'not_available';

/**
 * One carrier entry from the backend's tier2_carriers block.
 * Derived by the Tenant-Scoring agent; present only on new evaluations.
 * Absence of the whole `protection_options` array must be tolerated silently.
 *
 * Key naming matches the backend mapping exactly (camelCase for premium/canon fields).
 *  - `isDemo` MUST be displayed visually when true — prices are stubs until the
 *    backend flips the flag to false (real carrier API integration).
 *  - `maxBackedCanonCop` is fianly-only: the max rent it would back even when
 *    this tenant is rejected — enables an actionable "lower rent or add co-signer"
 *    suggestion instead of a dead-end rejection card.
 */
export interface ProtectionOption {
  carrier: string;
  productType: ProtectionProductType;
  status: ProtectionOptionStatus;
  /** Monthly premium in COP. Null when carrier rejected or no pricing available. */
  monthlyPremiumCop: number | null;
  /** True when the price is a demo/stub — MUST be shown as a badge on the card. */
  isDemo: boolean;
  /** Why the carrier rejected this tenant. Null when available or no reason given. */
  rejectionReason: string | null;
  /**
   * Fianly-only: the maximum canon the carrier would back.
   * Present even when status is not_available — drives the actionable co-signer card.
   */
  maxBackedCanonCop: number | null;
}

// ============================================================================
// AI Agent types (Tenant Scoring + Smart Matching)
// ============================================================================

/**
 * Integrity flag — document fraud / inconsistency signal.
 * severity=high always triggers requires_manual_review=true.
 */
export interface IntegrityFlag {
  doc_type: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
  source: 'metadata' | 'cross_validation' | 'visual' | 'api_comparison';
  detail: string;
}

/**
 * Observation — soft informational warning, does NOT block approval.
 */
export interface Observation {
  doc_type: string;
  code: string;
  severity: 'info' | 'warning';
  emission_date?: string;
  message: string;
}

/**
 * Score breakdown factor — one scoring dimension with weight and value.
 */
export interface ScoreBreakdownFactor {
  weight: number;
  value: number;
  weighted: number;
  source: string;
}

/** Full score breakdown keyed by factor name (e.g. "solvencia", "credito") */
export type ScoreBreakdown = Record<string, ScoreBreakdownFactor>;

/**
 * Consolidated evaluation result — this is what landlords/agencies see.
 * The /scoring/* endpoints are tenant-only; landlords access scoring data
 * exclusively via /evaluations/:id/result.
 */
export interface EvaluationResult {
  id?: string;
  applicationId: string;
  runId?: string;
  status?: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
  // Score
  totalScore?: number;
  level?: 'A' | 'B' | 'C' | 'D';
  /** @deprecated use score_breakdown — kept for pre-migration payloads */
  subscores?: {
    financialStability?: number;
    rentalHistory?: number;
    documentVerification?: number;
    personalProfile?: number;
  };
  /** Detailed score breakdown by factor (replaces subscores) */
  score_breakdown?: ScoreBreakdown;
  // Manual review gate
  /** When true, the landlord CANNOT approve — must review integrity_flags first */
  requires_manual_review?: boolean;
  // Fraud / inconsistency signals
  integrity_flags?: IntegrityFlag[];
  // Soft observations (informational, non-blocking)
  observations?: Observation[];
  // Explanation / reasoning
  summary?: string;
  reasoning?: string[];
  /** @deprecated use integrity_flags — kept for pre-migration payloads */
  flags?: string[];
  recommendation?: 'approve' | 'preapprove' | 'needs_info' | 'reject';
  confidence?: number;
  documentsAnalyzed?: string[];
  // Timestamps
  createdAt?: string;
  completedAt?: string;
  /**
   * Credit bureau check result. Present when backend returns it (COMPLETED/FAILED only).
   * Absent on old evaluations → treat as not_evaluated.
   * Top-level key is snake_case; inner keys are camelCase (backend asymmetry).
   */
  credit_check?: CreditCheck;
  /**
   * Insurance/bond carrier options for this tenant's lease.
   * Derived from the agent's tier2_carriers block.
   * Absent on old evaluations → render nothing (do NOT error).
   */
  protection_options?: ProtectionOption[];
}

// ============================================================================
// Wizard prefill — GET /applications/prefill
// ============================================================================

/** Returned when the tenant has no previous application to prefill from */
export interface ApplicationPrefillEmpty {
  hasPreviousApplication: false;
}

/**
 * Un documento que el inquilino ya subió y no hay que volver a pedirle.
 *
 * Llega con `uploadedAt` a propósito: la pantalla muestra de cuándo es cada
 * archivo antes de que la persona confirme. Un extracto bancario de hace ocho
 * meses sigue siendo un archivo válido, pero no es el extracto que la
 * aseguradora espera — y reemplazarlo o no es decisión suya, no nuestra.
 */
export interface DocumentoReutilizable {
  /** Tipo del back: ID_DOCUMENT, BANK_STATEMENT, EMPLOYMENT_LETTER… */
  type: string;
  originalName: string;
  size: number;
  /** ISO-8601 */
  uploadedAt: string;
}

/** Resultado de POST /applications/:id/documents/reuse */
export interface ResultadoDeReuso {
  copiados: Array<{ id: string; type: string; originalName: string }>;
  /** Tipos que la postulación ya tenía: no se pisaron. */
  yaEstaban: string[];
  /** Tipos cuya copia falló. NO quedaron adjuntos. */
  fallaron: string[];
}

/** Returned when the tenant has a previous application; every scalar may be null */
export interface ApplicationPrefillData {
  hasPreviousApplication: true;
  fullName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  currentAddress: string | null;
  timeAtCurrentAddress: number | null;
  maritalStatus: string | null;
  dependents: number | null;
  employmentStatus: string | null;
  companyName: string | null;
  industry: string | null;
  position: string | null;
  contractType: string | null;
  timeAtJob: number | null;
  employerPhone: string | null;
  employerAddress: string | null;
  monthlySalary: number | null;
  additionalIncome: number | null;
  additionalIncomeSource: string | null;
  totalMonthlyIncome: number | null;
  monthlyObligations: number | null;
  availableForRent: number | null;
  references: {
    previousLandlords: Array<{
      name: string;
      phone: string;
      address: string;
      duration: number;
      relationship: string;
    }>;
    employmentReferences: Array<{
      name: string;
      phone: string;
      company: string;
      relationship: string;
    }>;
    personalReferences: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  } | null;
  hasCoSigner: boolean | null;
  coSigner: Record<string, unknown> | null;
  /**
   * Documentos que ya subió y se pueden volver a usar — el más reciente de cada
   * tipo, sin los que una inmobiliaria rechazó en revisión.
   *
   * Opcional porque un back anterior a este contrato no lo manda; ausente se
   * lee como "no hay ninguno reutilizable", que es el comportamiento de antes.
   */
  documents?: DocumentoReutilizable[];
}

/** Discriminated union returned by GET /applications/prefill */
export type ApplicationPrefill = ApplicationPrefillEmpty | ApplicationPrefillData;

export interface EvaluationTriggerResponse {
  runId?: string;
  status?: 'queued' | 'running' | 'completed';
  message?: string;
}

export interface SmartMatchResult {
  propertyId: string;
  compatibilityScore: number;
  matchFactors: {
    incomeScore: number;
    employmentScore: number;
    budgetScore: number;
    locationScore: number;
    creditScore: number;
  };
  property: {
    id: string;
    title: string;
    monthlyRent: number;
    city: string;
    neighborhood: string;
    bedrooms: number;
    image?: string;
  };
}

export interface SmartMatchingResponse {
  runId: string;
  candidateProfile: {
    monthlyIncome: number;
    employmentMonths: number;
    maxBudget: number;
    // The backend can omit this when it has no location signal for the
    // candidate — treat it as optional and guard before reading `.length`.
    preferredLocations?: string[];
  };
  results: SmartMatchResult[];
  message?: string;
}
