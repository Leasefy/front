/**
 * Backend types for landlord endpoints
 * Maps to frontend Candidate, LandlordCandidate, LandlordProperty, DashboardSummary
 */

// ============================================================================
// Backend Candidate (from GET /candidates/:id)
// ============================================================================

export interface BackendCandidate {
  id: string;
  applicationId: string;
  propertyId: string;
  propertyTitle?: string;
  status: string; // PENDING, PRE_APPROVED, APPROVED, REJECTED, MORE_INFO, WITHDRAWN
  fullName: string;
  photo?: string;
  age: number;
  occupation: string;

  // Personal
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

  // Income
  monthlySalary?: number;
  additionalIncome?: number;
  totalIncome?: number;
  monthlyObligations?: number;
  availableForRent?: number;

  // Scoring
  riskLevel?: string; // A, B, C, D
  numericScore?: number;

  // References counts
  previousLandlordsCount?: number;
  employmentReferencesCount?: number;
  personalReferencesCount?: number;

  // Document status
  hasIdDocument?: boolean;
  hasIncomeProof?: boolean;
  hasEmploymentLetter?: boolean;
  hasBankStatements?: boolean;

  // Metadata
  appliedAt: string;
  statusChangedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Backend Risk Score (from GET /candidates/:id/risk-score)
// ============================================================================

export interface BackendRiskScore {
  level: string; // A, B, C, D
  numericScore: number;
  categories: BackendScoreCategory[];
  drivers: string[];
  flags: BackendRiskFlag[];
  suggestedConditions: BackendSuggestedCondition[];
  aiExplanation: string;
}

export interface BackendScoreCategory {
  name: string;
  label: string;
  score: number;
  weight: number;
  factors: string[];
}

export interface BackendRiskFlag {
  id: string;
  severity: string; // low, medium, high
  message: string;
  suggestion?: string;
}

export interface BackendSuggestedCondition {
  id: string;
  condition: string;
  reason: string;
}

// ============================================================================
// Backend Landlord Property (from GET /landlord/properties)
// ============================================================================

export interface BackendLandlordProperty {
  id: string;
  title: string;
  type: string;
  status: string;
  city: string;
  neighborhood: string;
  address: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images?: { id: string; url: string; order: number }[];
  candidateCount: number;
  pendingCount: number;
  preApprovedCount: number;
  approvedCount: number;
  candidates?: BackendCandidate[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Backend Dashboard (from GET /dashboard/landlord)
// ============================================================================

export interface BackendLandlordDashboard {
  summary: {
    totalProperties: number;
    activeLeases: number;
    pendingApplications: number;
    monthlyRevenue: number;
  };
  urgentActions: BackendUrgentAction[];
  upcomingEvents: BackendUpcomingEvent[];
  recentActivity: BackendActivityItem[];
  riskDistribution: { A: number; B: number; C: number; D: number };
}

export interface BackendUrgentAction {
  id: string;
  type: string;
  message: string;
  propertyId?: string;
  candidateId?: string;
  createdAt: string;
}

export interface BackendUpcomingEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  propertyId?: string;
}

export interface BackendActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  propertyId?: string;
}

// ============================================================================
// Display types (mapped from backend for UI consumption)
// ============================================================================

export interface DashboardUrgentAction {
  id: string;
  type: 'signature' | 'late_payment' | 'pending_review' | 'ending_lease' | 'pending_visit';
  title: string;
  description: string;
  count: number;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DashboardUpcomingEvent {
  id: string;
  type: 'lease_ending' | 'payment_due' | 'contract_renewal' | 'inspection';
  title: string;
  description: string;
  date: string;
  daysUntil: number;
  href?: string;
}

export interface DashboardActivity {
  id: string;
  type: 'application' | 'status_change' | 'message' | 'document';
  title: string;
  description: string;
  timestamp: string;
  propertyId?: string;
}

export interface DashboardFinancialStats {
  monthlyIncome: number;
  activeLeases: number;
  collectionRate: number;
  pendingPayments: number;
}

export interface DashboardData {
  financial: DashboardFinancialStats;
  urgentActions: DashboardUrgentAction[];
  upcomingEvents: DashboardUpcomingEvent[];
  recentActivity: DashboardActivity[];
  riskDistribution: { A: number; B: number; C: number; D: number };
}

// ============================================================================
// Candidate list response (from GET /candidates)
// ============================================================================

export interface BackendCandidateListResponse {
  candidates: BackendCandidate[];
  total: number;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

// ============================================================================
// Candidate note
// ============================================================================

export interface BackendCandidateNote {
  id: string;
  content: string;
  createdAt: string;
  authorId?: string;
  authorName?: string;
}

// ============================================================================
// Decision DTO
// ============================================================================

export interface CandidateDecisionDto {
  decision: 'pre-approved' | 'approved' | 'rejected' | 'more-info';
  notes?: string;
  conditions?: string[];
}
