/**
 * Landlord API service
 * Endpoints for candidates, landlord properties, dashboard, and scoring
 */

import { apiClient } from './client';
import { mapBackendProperty } from './properties.mapper';
import type {
  BackendCandidate,
  BackendCandidateListResponse,
  BackendCandidateNote,
  BackendLandlordDashboard,
  BackendLandlordProperty,
  BackendRiskScore,
  BackendUrgentAction,
  BackendUpcomingEvent,
  BackendActivityItem,
  CandidateDecisionDto,
  DashboardData,
  DashboardUrgentAction,
  DashboardUpcomingEvent,
  DashboardActivity,
  DashboardFinancialStats,
} from './landlord.types';
import type { Candidate, CandidateBasic, CandidateWithStatus } from '@/lib/types/candidate';
import type { LandlordCandidate, LandlordCandidateStatus, LandlordProperty, DashboardSummary } from '@/lib/types/landlord';
import type { RiskScore, RiskLevel, ScoreCategory, RiskFlag, SuggestedCondition } from '@/lib/types/risk-score';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const CANDIDATE_STATUS_MAP: Record<string, LandlordCandidateStatus> = {
  // Backend uses ApplicationStatus enum values
  DRAFT: 'pending',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'pending',
  NEEDS_INFO: 'more-info',
  PREAPPROVED: 'pre-approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'rejected',
  // Legacy mappings (in case backend uses these)
  PENDING: 'pending',
  PRE_APPROVED: 'pre-approved',
  MORE_INFO: 'more-info',
};

// ============================================================================
// Mappers
// ============================================================================

function mapRiskLevel(level?: string): RiskLevel {
  if (level === 'A' || level === 'B' || level === 'C' || level === 'D') return level;
  return 'C'; // Default to C if unknown
}

function mapRiskScore(bs: BackendRiskScore): RiskScore {
  return {
    level: mapRiskLevel(bs.level),
    numericScore: bs.numericScore,
    categories: bs.categories as ScoreCategory[],
    drivers: bs.drivers,
    flags: bs.flags as RiskFlag[],
    suggestedConditions: bs.suggestedConditions as SuggestedCondition[],
    aiExplanation: bs.aiExplanation,
  };
}

function mapCandidateBasic(bc: BackendCandidate): CandidateBasic {
  return {
    id: bc.id,
    fullName: bc.fullName,
    photo: bc.photo,
    age: bc.age,
    occupation: bc.occupation,
    riskLevel: mapRiskLevel(bc.riskLevel),
    numericScore: bc.numericScore ?? 0,
    appliedAt: bc.appliedAt,
  };
}

function mapLandlordCandidate(bc: BackendCandidate): LandlordCandidate {
  return {
    ...mapCandidateBasic(bc),
    status: CANDIDATE_STATUS_MAP[bc.status] ?? 'pending',
    statusChangedAt: bc.statusChangedAt,
    notes: bc.notes,
    propertyId: bc.propertyId,
  };
}

function mapCandidateWithStatus(bc: BackendCandidate): CandidateWithStatus {
  return {
    ...mapCandidateBasic(bc),
    status: CANDIDATE_STATUS_MAP[bc.status] === 'more-info'
      ? 'reviewing'
      : (CANDIDATE_STATUS_MAP[bc.status] as CandidateWithStatus['status']) ?? 'pending',
    propertyId: bc.propertyId,
    propertyTitle: bc.propertyTitle ?? '',
    lastActivityAt: bc.statusChangedAt ?? bc.appliedAt,
  };
}

function mapFullCandidate(bc: BackendCandidate, riskScore?: RiskScore): Candidate {
  const basic = mapCandidateBasic(bc);
  return {
    ...basic,
    documentType: (bc.documentType ?? 'cc') as Candidate['documentType'],
    documentNumber: bc.documentNumber ?? '',
    dateOfBirth: bc.dateOfBirth ?? '',
    phone: bc.phone ?? '',
    email: bc.email ?? '',
    currentAddress: bc.currentAddress ?? '',
    timeAtCurrentAddress: bc.timeAtCurrentAddress ?? 0,
    maritalStatus: (bc.maritalStatus ?? 'single') as Candidate['maritalStatus'],
    dependents: bc.dependents ?? 0,
    employmentStatus: (bc.employmentStatus ?? 'employed') as Candidate['employmentStatus'],
    companyName: bc.companyName,
    industry: bc.industry,
    position: bc.position,
    contractType: bc.contractType,
    timeAtJob: bc.timeAtJob,
    employerPhone: bc.employerPhone,
    monthlySalary: bc.monthlySalary ?? 0,
    additionalIncome: bc.additionalIncome ?? 0,
    totalIncome: bc.totalIncome ?? 0,
    monthlyObligations: bc.monthlyObligations ?? 0,
    availableForRent: bc.availableForRent ?? 0,
    applicationId: bc.applicationId,
    propertyId: bc.propertyId,
    propertyTitle: bc.propertyTitle,
    riskScore: riskScore ?? {
      level: basic.riskLevel,
      numericScore: basic.numericScore,
      categories: [],
      drivers: [],
      flags: [],
      suggestedConditions: [],
      aiExplanation: '',
    },
    previousLandlordsCount: bc.previousLandlordsCount ?? 0,
    employmentReferencesCount: bc.employmentReferencesCount ?? 0,
    personalReferencesCount: bc.personalReferencesCount ?? 0,
    hasIdDocument: bc.hasIdDocument ?? false,
    hasIncomeProof: bc.hasIncomeProof ?? false,
    hasEmploymentLetter: bc.hasEmploymentLetter ?? false,
    hasBankStatements: bc.hasBankStatements ?? false,
  };
}

function mapLandlordProperty(blp: BackendLandlordProperty): LandlordProperty {
  // Map the base property fields using the existing mapper
  const baseProperty: Property = mapBackendProperty(blp as unknown as import('./properties.types').BackendProperty);

  return {
    ...baseProperty,
    candidateCount: blp.candidateCount,
    pendingCount: blp.pendingCount,
    preApprovedCount: blp.preApprovedCount,
    approvedCount: blp.approvedCount,
    candidates: blp.candidates?.map(mapLandlordCandidate),
  };
}

// ============================================================================
// Dashboard mappers (backend -> display types)
// ============================================================================

const URGENT_ACTION_TYPE_MAP: Record<string, DashboardUrgentAction['type']> = {
  signature: 'signature',
  late_payment: 'late_payment',
  pending_review: 'pending_review',
  ending_lease: 'ending_lease',
  pending_visit: 'pending_visit',
};

const URGENT_ACTION_PRIORITY_MAP: Record<string, DashboardUrgentAction['priority']> = {
  signature: 'high',
  late_payment: 'high',
  pending_review: 'medium',
  ending_lease: 'medium',
  pending_visit: 'medium',
};

const URGENT_ACTION_HREF_MAP: Record<string, string> = {
  signature: '/panel/contratos',
  late_payment: '/panel/leases',
  pending_review: '/panel/candidatos',
  ending_lease: '/panel/leases',
  pending_visit: '/panel/visitas',
};

function mapUrgentAction(ba: BackendUrgentAction): DashboardUrgentAction {
  const type = URGENT_ACTION_TYPE_MAP[ba.type] ?? 'pending_review';
  // Split message into title/description: use first sentence as title
  const parts = ba.message.split(/[.:]\s*/);
  const title = parts[0] || ba.message;
  const description = parts.slice(1).join('. ').trim() || ba.message;

  return {
    id: ba.id,
    type,
    title,
    description,
    count: 1,
    href: ba.propertyId
      ? `/panel/${ba.propertyId}`
      : URGENT_ACTION_HREF_MAP[ba.type] ?? '/panel',
    priority: URGENT_ACTION_PRIORITY_MAP[ba.type] ?? 'medium',
  };
}

const EVENT_TYPE_MAP: Record<string, DashboardUpcomingEvent['type']> = {
  lease_ending: 'lease_ending',
  payment_due: 'payment_due',
  contract_renewal: 'contract_renewal',
  inspection: 'inspection',
};

function mapUpcomingEvent(be: BackendUpcomingEvent): DashboardUpcomingEvent {
  const now = new Date();
  const eventDate = new Date(be.date);
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const type = EVENT_TYPE_MAP[be.type] ?? 'payment_due';

  const hrefMap: Record<string, string> = {
    lease_ending: '/panel/leases',
    payment_due: '/panel/leases',
    contract_renewal: '/panel/contratos',
    inspection: '/panel/visitas',
  };

  return {
    id: be.id,
    type,
    title: be.title,
    description: be.propertyId ? `Propiedad ${be.propertyId}` : '',
    date: be.date,
    daysUntil,
    href: be.propertyId ? `/panel/${be.propertyId}` : hrefMap[type] ?? '/panel',
  };
}

function mapActivity(ba: BackendActivityItem): DashboardActivity {
  const typeMap: Record<string, DashboardActivity['type']> = {
    application: 'application',
    status_change: 'status_change',
    message: 'message',
    document: 'document',
  };

  // Split message: first part = title, rest = description
  const separatorIndex = ba.message.indexOf(' - ');
  const title = separatorIndex > 0 ? ba.message.substring(0, separatorIndex) : ba.message;
  const description = separatorIndex > 0 ? ba.message.substring(separatorIndex + 3) : '';

  return {
    id: ba.id,
    type: typeMap[ba.type] ?? 'application',
    title,
    description,
    timestamp: ba.timestamp,
    propertyId: ba.propertyId,
  };
}

function mapDashboard(backend: BackendLandlordDashboard): DashboardData {
  const financial: DashboardFinancialStats = {
    monthlyIncome: backend.summary.monthlyRevenue,
    activeLeases: backend.summary.activeLeases,
    collectionRate: backend.summary.activeLeases > 0 ? 95 : 100, // Backend doesn't provide this yet
    pendingPayments: 0, // Backend doesn't provide this yet
  };

  return {
    financial,
    urgentActions: backend.urgentActions.map(mapUrgentAction),
    upcomingEvents: backend.upcomingEvents.map(mapUpcomingEvent).sort((a, b) => a.daysUntil - b.daysUntil),
    recentActivity: backend.recentActivity.map(mapActivity),
    riskDistribution: backend.riskDistribution,
  };
}

// ============================================================================
// Service
// ============================================================================

export const landlordApi = {
  // --------------------------------------------------------------------------
  // Candidates
  // --------------------------------------------------------------------------

  /** List candidates - per property if propertyId given, otherwise all */
  async getCandidates(params?: {
    propertyId?: string;
    status?: string;
    riskLevel?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    candidates: LandlordCandidate[];
    total: number;
    stats: { total: number; pending: number; approved: number; rejected: number };
  }> {
    // Backend CandidateCardDto shape (used by both endpoints)
    interface BackendCandidateCard {
      id: string;
      tenantName: string;
      tenantEmail: string;
      status: string;
      submittedAt: string;
      propertyId?: string;
      propertyTitle?: string;
      riskScore?: { totalScore: number; level: string };
      note?: { id: string; content: string; updatedAt: string };
    }

    let rawCandidates: BackendCandidateCard[];
    let stats: { total: number; pending: number; approved: number; rejected: number } | undefined;

    if (params?.propertyId) {
      // Per-property endpoint: GET /landlord/properties/:propertyId/candidates
      // Returns CandidateCardDto[] directly (array, not wrapped)
      rawCandidates = await apiClient.get<BackendCandidateCard[]>(
        `/landlord/properties/${params.propertyId}/candidates`
      );
    } else {
      // Global endpoint: GET /landlord/candidates
      // Returns { candidates, total, stats }
      const res = await apiClient.get<{
        candidates: BackendCandidateCard[];
        total: number;
        stats: { total: number; pending: number; approved: number; rejected: number };
      }>('/landlord/candidates');
      rawCandidates = res.candidates ?? [];
      stats = res.stats;
    }

    // Map backend CandidateCardDto to frontend LandlordCandidate
    const mapped: LandlordCandidate[] = rawCandidates.map((c) => ({
      id: c.id,
      fullName: c.tenantName,
      photo: undefined,
      age: 0,
      occupation: '',
      riskLevel: mapRiskLevel(c.riskScore?.level),
      numericScore: c.riskScore?.totalScore ?? 0,
      appliedAt: c.submittedAt,
      status: CANDIDATE_STATUS_MAP[c.status] ?? 'pending',
      statusChangedAt: undefined,
      notes: c.note?.content,
      propertyId: c.propertyId ?? params?.propertyId ?? '',
      propertyTitle: c.propertyTitle,
    }));

    return {
      candidates: mapped,
      total: stats?.total ?? mapped.length,
      stats: stats ?? {
        total: mapped.length,
        pending: mapped.filter(c => c.status === 'pending').length,
        approved: mapped.filter(c => c.status === 'approved').length,
        rejected: mapped.filter(c => c.status === 'rejected').length,
      },
    };
  },

  /** Get single candidate detail (applicationId) */
  async getCandidate(id: string): Promise<Candidate> {
    // Backend: GET /landlord/applications/:applicationId -> CandidateDetailDto
    const detail = await apiClient.get<{
      id: string;
      status: string;
      submittedAt: string;
      tenant: { id: string; firstName: string; lastName: string; email: string; phone?: string };
      property: { id: string; title: string; monthlyRent: number };
      riskScore?: {
        totalScore: number;
        level: string;
        financialScore: number;
        stabilityScore: number;
        historyScore: number;
        integrityScore: number;
        drivers: Array<{ text: string; positive: boolean }>;
        flags: Array<{ code: string; severity: string; message: string }>;
        conditions: Array<{ type: string; message: string; required: boolean }>;
      };
      documents: Array<{ id: string; type: string; originalName: string; createdAt: string }>;
      timeline: Array<{ id: string; type: string; metadata: Record<string, unknown>; createdAt: string }>;
      note?: { id: string; content: string; updatedAt: string };
    }>(`/landlord/applications/${id}`);

    const riskLevel = mapRiskLevel(detail.riskScore?.level);
    const numericScore = detail.riskScore?.totalScore ?? 0;

    const riskScore: RiskScore = detail.riskScore ? {
      level: riskLevel,
      numericScore,
      categories: [
        { name: 'financial', label: 'Financiero', score: detail.riskScore.financialScore, weight: 35, factors: [] },
        { name: 'stability', label: 'Estabilidad', score: detail.riskScore.stabilityScore, weight: 25, factors: [] },
        { name: 'history', label: 'Historial', score: detail.riskScore.historyScore, weight: 15, factors: [] },
        { name: 'integrity', label: 'Integridad', score: detail.riskScore.integrityScore, weight: 25, factors: [] },
      ] as ScoreCategory[],
      drivers: detail.riskScore.drivers.map(d => d.text),
      flags: detail.riskScore.flags.map(f => ({
        id: f.code,
        severity: f.severity as 'low' | 'medium' | 'high',
        message: f.message,
      })) as RiskFlag[],
      suggestedConditions: detail.riskScore.conditions.map(c => ({
        id: c.type,
        condition: c.message,
        reason: c.required ? 'Requerido' : 'Sugerido',
      })) as SuggestedCondition[],
      aiExplanation: '',
    } : {
      level: riskLevel,
      numericScore,
      categories: [],
      drivers: [],
      flags: [],
      suggestedConditions: [],
      aiExplanation: '',
    };

    return {
      id: detail.id,
      fullName: [detail.tenant.firstName, detail.tenant.lastName].filter(Boolean).join(' ') || 'Unknown',
      photo: undefined,
      age: 0,
      occupation: '',
      riskLevel,
      numericScore,
      appliedAt: detail.submittedAt,
      documentType: 'cc',
      documentNumber: '',
      dateOfBirth: '',
      phone: detail.tenant.phone ?? '',
      email: detail.tenant.email,
      currentAddress: '',
      timeAtCurrentAddress: 0,
      maritalStatus: 'single',
      dependents: 0,
      employmentStatus: 'employed',
      monthlySalary: 0,
      additionalIncome: 0,
      totalIncome: 0,
      monthlyObligations: 0,
      availableForRent: 0,
      applicationId: detail.id,
      propertyId: detail.property.id,
      propertyTitle: detail.property.title,
      riskScore,
      previousLandlordsCount: 0,
      employmentReferencesCount: 0,
      personalReferencesCount: 0,
      hasIdDocument: detail.documents.some(d => d.type === 'CEDULA' || d.type === 'ID'),
      hasIncomeProof: detail.documents.some(d => d.type === 'INCOME_PROOF'),
      hasEmploymentLetter: detail.documents.some(d => d.type === 'EMPLOYMENT_LETTER'),
      hasBankStatements: detail.documents.some(d => d.type === 'BANK_STATEMENTS'),
    };
  },

  /** Get candidate as CandidateWithStatus (for dashboard cards) */
  async getCandidateWithStatus(id: string): Promise<CandidateWithStatus> {
    const detail = await apiClient.get<{
      id: string;
      status: string;
      submittedAt: string;
      tenant: { id: string; firstName: string; lastName: string; email: string };
      property: { id: string; title: string };
      riskScore?: { totalScore: number; level: string };
    }>(`/landlord/applications/${id}`);

    return {
      id: detail.id,
      fullName: [detail.tenant.firstName, detail.tenant.lastName].filter(Boolean).join(' ') || 'Unknown',
      photo: undefined,
      age: 0,
      occupation: '',
      riskLevel: mapRiskLevel(detail.riskScore?.level),
      numericScore: detail.riskScore?.totalScore ?? 0,
      appliedAt: detail.submittedAt,
      status: (['pending', 'reviewing', 'approved', 'rejected'].includes(
        CANDIDATE_STATUS_MAP[detail.status] ?? ''
      )
        ? CANDIDATE_STATUS_MAP[detail.status]
        : 'pending') as CandidateWithStatus['status'],
      propertyId: detail.property.id,
      propertyTitle: detail.property.title,
      lastActivityAt: detail.submittedAt,
    };
  },

  /** Make a decision on a candidate using the specific action endpoint */
  async decideCandidate(id: string, decision: CandidateDecisionDto): Promise<LandlordCandidate> {
    // Backend has separate endpoints per action:
    // POST /landlord/applications/:id/approve   { message? }
    // POST /landlord/applications/:id/reject    { reason }
    // POST /landlord/applications/:id/preapprove { message? }
    // POST /landlord/applications/:id/request-info { message }
    let endpoint: string;
    let body: Record<string, unknown>;

    switch (decision.decision) {
      case 'approved':
        endpoint = `/landlord/applications/${id}/approve`;
        body = { message: decision.notes };
        break;
      case 'rejected':
        endpoint = `/landlord/applications/${id}/reject`;
        body = { reason: decision.notes || 'Rechazado por el propietario' };
        break;
      case 'pre-approved':
        endpoint = `/landlord/applications/${id}/preapprove`;
        body = { message: decision.notes };
        break;
      case 'more-info':
        endpoint = `/landlord/applications/${id}/request-info`;
        body = { message: decision.notes || 'Se requiere información adicional' };
        break;
      default:
        endpoint = `/landlord/applications/${id}/approve`;
        body = { message: decision.notes };
    }

    const result = await apiClient.post<{ id: string; status: string; propertyId: string }>(endpoint, body);

    // Return a minimal LandlordCandidate from the response
    return {
      id: result.id,
      fullName: '',
      photo: undefined,
      age: 0,
      occupation: '',
      riskLevel: 'C',
      numericScore: 0,
      appliedAt: '',
      status: CANDIDATE_STATUS_MAP[result.status] ?? 'pending',
      statusChangedAt: undefined,
      notes: undefined,
      propertyId: result.propertyId,
    };
  },

  /** Add/update a note on a candidate (upsert) */
  async addNote(id: string, content: string): Promise<BackendCandidateNote> {
    // Backend: POST /landlord/applications/:applicationId/notes { content }
    const note = await apiClient.post<{ id: string; content: string; updatedAt: string; landlordId: string }>(`/landlord/applications/${id}/notes`, { content });
    return { id: note.id, content: note.content, createdAt: note.updatedAt, authorId: note.landlordId };
  },

  /** Get notes for a candidate - backend only stores one note per landlord, returned in detail */
  async getNotes(id: string): Promise<BackendCandidateNote[]> {
    // The note comes embedded in the candidate detail, no separate list endpoint
    try {
      const detail = await apiClient.get<{ note?: { id: string; content: string; updatedAt: string } }>(`/landlord/applications/${id}`);
      if (detail.note) {
        return [{ id: detail.note.id, content: detail.note.content, createdAt: detail.note.updatedAt }];
      }
    } catch {
      // Silently fail
    }
    return [];
  },

  // --------------------------------------------------------------------------
  // Risk Score
  // --------------------------------------------------------------------------

  /** Get risk score for a candidate/application */
  async getRiskScore(candidateId: string): Promise<RiskScore> {
    // Backend: GET /scoring/:applicationId
    const bs = await apiClient.get<BackendRiskScore>(`/scoring/${candidateId}`);
    return mapRiskScore(bs);
  },

  // --------------------------------------------------------------------------
  // Landlord Properties
  // --------------------------------------------------------------------------

  /** Get landlord's properties with candidate counts */
  async getMyProperties(): Promise<{
    properties: LandlordProperty[];
    summary: DashboardSummary;
  }> {
    const res = await apiClient.get<{
      properties: BackendLandlordProperty[];
      summary: DashboardSummary;
    }>('/landlord/properties');

    return {
      properties: res.properties.map(mapLandlordProperty),
      summary: res.summary,
    };
  },

  /** Get a single landlord property with candidates */
  async getMyProperty(propertyId: string): Promise<LandlordProperty> {
    const blp = await apiClient.get<BackendLandlordProperty>(`/landlord/properties/${propertyId}`);
    return mapLandlordProperty(blp);
  },

  // --------------------------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------------------------

  /** Get full landlord dashboard data (raw backend response) */
  async getDashboard(): Promise<BackendLandlordDashboard> {
    return apiClient.get<BackendLandlordDashboard>('/landlord/dashboard');
  },

  /** Get dashboard data mapped for display */
  async getDashboardForDisplay(): Promise<DashboardData> {
    const backend = await apiClient.get<BackendLandlordDashboard>('/landlord/dashboard');
    return mapDashboard(backend);
  },
};
