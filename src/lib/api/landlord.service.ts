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
  CandidateDecisionDto,
} from './landlord.types';
import type { Candidate, CandidateBasic, CandidateWithStatus } from '@/lib/types/candidate';
import type { LandlordCandidate, LandlordCandidateStatus, LandlordProperty, DashboardSummary } from '@/lib/types/landlord';
import type { RiskScore, RiskLevel, ScoreCategory, RiskFlag, SuggestedCondition } from '@/lib/types/risk-score';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const CANDIDATE_STATUS_MAP: Record<string, LandlordCandidateStatus> = {
  PENDING: 'pending',
  PRE_APPROVED: 'pre-approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MORE_INFO: 'more-info',
  WITHDRAWN: 'rejected', // Map withdrawn to rejected for frontend display
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
// Service
// ============================================================================

export const landlordApi = {
  // --------------------------------------------------------------------------
  // Candidates
  // --------------------------------------------------------------------------

  /** List candidates with optional filters */
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
    const searchParams = new URLSearchParams();
    if (params?.propertyId) searchParams.set('propertyId', params.propertyId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.riskLevel) searchParams.set('riskLevel', params.riskLevel);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.page != null) searchParams.set('page', String(params.page));
    if (params?.limit != null) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    const path = `/candidates${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<BackendCandidateListResponse>(path);

    return {
      candidates: res.candidates.map(mapLandlordCandidate),
      total: res.total,
      stats: res.stats,
    };
  },

  /** Get single candidate detail */
  async getCandidate(id: string): Promise<Candidate> {
    const bc = await apiClient.get<BackendCandidate>(`/candidates/${id}`);
    // Also fetch risk score
    let riskScore: RiskScore | undefined;
    try {
      riskScore = await landlordApi.getRiskScore(id);
    } catch {
      // Risk score may not be available yet
    }
    return mapFullCandidate(bc, riskScore);
  },

  /** Get candidate as CandidateWithStatus (for dashboard cards) */
  async getCandidateWithStatus(id: string): Promise<CandidateWithStatus> {
    const bc = await apiClient.get<BackendCandidate>(`/candidates/${id}`);
    return mapCandidateWithStatus(bc);
  },

  /** Make a decision on a candidate */
  async decideCandidate(id: string, decision: CandidateDecisionDto): Promise<LandlordCandidate> {
    const bc = await apiClient.post<BackendCandidate>(`/candidates/${id}/decision`, decision);
    return mapLandlordCandidate(bc);
  },

  /** Add a note to a candidate */
  async addNote(id: string, content: string): Promise<BackendCandidateNote> {
    return apiClient.post<BackendCandidateNote>(`/candidates/${id}/notes`, { content });
  },

  /** Get notes for a candidate */
  async getNotes(id: string): Promise<BackendCandidateNote[]> {
    return apiClient.get<BackendCandidateNote[]>(`/candidates/${id}/notes`);
  },

  // --------------------------------------------------------------------------
  // Risk Score
  // --------------------------------------------------------------------------

  /** Get risk score for a candidate */
  async getRiskScore(candidateId: string): Promise<RiskScore> {
    const bs = await apiClient.get<BackendRiskScore>(`/candidates/${candidateId}/risk-score`);
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

  /** Get full landlord dashboard data */
  async getDashboard(): Promise<BackendLandlordDashboard> {
    return apiClient.get<BackendLandlordDashboard>('/dashboard/landlord');
  },
};
