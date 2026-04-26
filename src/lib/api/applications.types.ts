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
}

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
    preferredLocations: string[];
  };
  results: SmartMatchResult[];
  message?: string;
}
