/**
 * Applications API service
 * Wraps apiClient for application-specific operations
 */

import { apiClient, getAccessToken, ApiError } from './client';
import type {
  BackendApplication,
  BackendDocument,
  CreateApplicationDto,
  PaginatedApplications,
  LandlordCandidate,
  AllCandidatesResponse,
  LandlordApplicationDetail,
  EvaluationResult,
  EvaluationTriggerResponse,
  SmartMatchingResponse,
  CreditCheck,
  ProtectionOption,
  ApplicationPrefill,
} from './applications.types';
import type { Application } from '@/lib/types/application';
import type { TenantApplicationStatus } from '@/lib/types/tenant-application';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ============================================================================
// Tenant Application View (display type for tenant pages)
// ============================================================================

export interface TenantApplicationView {
  id: string;
  propertyId: string;
  status: TenantApplicationStatus;
  trackingCode: string;
  submittedAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    thumbnail: string;
    city: string;
    neighborhood: string;
    monthlyRent: number;
  } | null;
}

// ============================================================================
// Status mapping
// ============================================================================

const STATUS_MAP: Record<string, Application['status']> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INFO_REQUESTED: 'under_review',
  NEEDS_INFO: 'under_review',
  PREAPPROVED: 'under_review',
  PRE_APPROVED: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'rejected',
};

const STATUS_TO_TENANT_MAP: Record<string, TenantApplicationStatus> = {
  DRAFT: 'submitted',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INFO_REQUESTED: 'needs_info',
  NEEDS_INFO: 'needs_info',
  PREAPPROVED: 'pre_approved',
  PRE_APPROVED: 'pre_approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  CONTRACT_FAILED: 'contract_failed',
};

// ============================================================================
// Mapper
// ============================================================================

export function mapBackendApplication(ba: BackendApplication): Application {
  return {
    id: ba.id,
    propertyId: ba.propertyId,
    status: STATUS_MAP[ba.status] ?? 'draft',
    currentStep: 6, // Backend applications are always complete
    personal: {
      fullName: ba.fullName,
      documentType: ba.documentType as Application['personal']['documentType'],
      documentNumber: ba.documentNumber,
      dateOfBirth: ba.dateOfBirth,
      phone: ba.phone,
      email: ba.email,
      currentAddress: ba.currentAddress,
      timeAtCurrentAddress: ba.timeAtCurrentAddress,
      maritalStatus: ba.maritalStatus as Application['personal']['maritalStatus'],
      dependents: ba.dependents,
    },
    employment: {
      employmentStatus: ba.employmentStatus as Application['employment']['employmentStatus'],
      companyName: ba.companyName,
      industry: ba.industry,
      position: ba.position,
      contractType: ba.contractType as Application['employment']['contractType'],
      timeAtJob: ba.timeAtJob,
      employerPhone: ba.employerPhone,
      employerAddress: ba.employerAddress,
    },
    income: {
      monthlySalary: ba.monthlySalary ?? 0,
      additionalIncome: ba.additionalIncome ?? 0,
      additionalIncomeSource: ba.additionalIncomeSource,
      totalMonthlyIncome: ba.totalMonthlyIncome ?? 0,
      monthlyObligations: ba.monthlyObligations ?? 0,
      availableForRent: ba.availableForRent ?? 0,
    },
    references: ba.references ?? {
      previousLandlords: [],
      employmentReferences: [],
      personalReferences: [],
    },
    documents: {},
    hasCoSigner: ba.hasCoSigner ?? false,
    coSigner: ba.coSigner as Application['coSigner'],
    createdAt: ba.createdAt,
    updatedAt: ba.updatedAt,
  };
}

function generateTrackingCode(id: string): string {
  return 'AF-' + id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function mapToTenantView(ba: BackendApplication): TenantApplicationView {
  const firstImage = ba.property?.images?.[0];
  return {
    id: ba.id,
    propertyId: ba.propertyId,
    status: STATUS_TO_TENANT_MAP[ba.status] ?? 'submitted',
    trackingCode: generateTrackingCode(ba.id),
    submittedAt: ba.createdAt,
    updatedAt: ba.updatedAt,
    property: ba.property
      ? {
          id: ba.property.id,
          title: ba.property.title,
          thumbnail: firstImage?.url || '/placeholder-property.svg',
          city: ba.property.city,
          neighborhood: ba.property.neighborhood,
          monthlyRent: ba.property.monthlyRent,
        }
      : null,
  };
}

// ============================================================================
// Service
// ============================================================================

export const applicationsApi = {
  /** Create and submit an application (authenticated) */
  async create(data: CreateApplicationDto): Promise<Application> {
    const ba = await apiClient.post<BackendApplication>('/applications', data);
    return mapBackendApplication(ba);
  },

  /** Submit application as guest (unauthenticated) — backend sends invite email */
  async createGuest(data: CreateApplicationDto & { agentCode?: string; linkCode?: string }): Promise<{
    applicationId: string;
    trackingCode: string;
    userAlreadyExisted: boolean;
  }> {
    const res = await fetch(`${BACKEND_URL}/applications/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message || 'Error al enviar la aplicación');
    }
    return res.json();
  },

  /** Get my applications as tenant */
  async getMine(): Promise<Application[]> {
    const result = await apiClient.get<BackendApplication[]>('/applications/mine');
    return result.map(mapBackendApplication);
  },

  /** Get my applications mapped for tenant display pages */
  async getMineForDisplay(): Promise<TenantApplicationView[]> {
    const result = await apiClient.get<BackendApplication[]>('/applications/mine');
    return result.map(mapToTenantView);
  },

  /**
   * Lightweight list of my applications with the RAW backend status — used to
   * decide if a property already has an active application (see
   * `isActiveApplicationStatus`). The mapped `getMine()` collapses statuses
   * (WITHDRAWN → 'rejected', etc.), which loses the distinction the anti-dup
   * guard needs; this keeps `status` verbatim.
   */
  async getMineStatuses(): Promise<Array<{ id: string; propertyId: string; status: string }>> {
    const result = await apiClient.get<BackendApplication[]>('/applications/mine');
    return result.map((ba) => ({ id: ba.id, propertyId: ba.propertyId, status: ba.status }));
  },

  /** Get a single application by ID */
  async getById(id: string): Promise<Application> {
    const ba = await apiClient.get<BackendApplication>(`/applications/${id}`);
    return mapBackendApplication(ba);
  },

  /** Get a single application mapped for tenant display */
  async getByIdForDisplay(id: string): Promise<TenantApplicationView> {
    const ba = await apiClient.get<BackendApplication>(`/applications/${id}`);
    return mapToTenantView(ba);
  },

  /** Get applications for a property (landlord view) */
  async getByProperty(propertyId: string): Promise<Application[]> {
    const result = await apiClient.get<BackendApplication[]>(
      `/applications/property/${propertyId}`
    );
    return result.map(mapBackendApplication);
  },

  /**
   * Update a single step of an application (NEEDS_INFO / DRAFT flow)
   * Step 1 → personal, 2 → employment, 3 → income, 4 → references
   */
  async updateStep(
    id: string,
    step: 1 | 2 | 3 | 4,
    data: Record<string, unknown>
  ): Promise<void> {
    await apiClient.patch(`/applications/${id}/steps/${step}`, data);
  },

  /** Withdraw an application */
  async withdraw(id: string): Promise<void> {
    await apiClient.post(`/applications/${id}/withdraw`);
  },

  /**
   * Respond to an info request.
   * When readyForReview=true the backend transitions NEEDS_INFO → UNDER_REVIEW.
   */
  async respondToInfoRequest(
    id: string,
    message: string,
    readyForReview = false
  ): Promise<void> {
    await apiClient.post(`/applications/${id}/respond-info`, {
      message,
      readyForReview,
    });
  },

  /**
   * Upload a document for an application (multipart).
   * @param applicationId - The application to attach the document to.
   * @param file - The file to upload.
   * @param type - Document type key (e.g. 'ID_DOCUMENT', 'BANK_STATEMENT').
   */
  async uploadDocument(
    applicationId: string,
    file: File,
    type: string
  ): Promise<BackendDocument> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message || 'Upload failed');
    }

    return res.json();
  },

  /**
   * Fetch prefill data from the tenant's most recent previous application.
   * Requires an authenticated TENANT session (Bearer JWT).
   * Returns { hasPreviousApplication: false } when no previous application exists.
   * GET /applications/prefill
   */
  async getPrefill(): Promise<ApplicationPrefill> {
    return apiClient.get<ApplicationPrefill>('/applications/prefill');
  },

  /** Get documents for an application */
  async getDocuments(applicationId: string): Promise<BackendDocument[]> {
    return apiClient.get<BackendDocument[]>(`/documents/application/${applicationId}`);
  },

  /**
   * Delete a specific document from an application.
   * DELETE /applications/:applicationId/documents/:documentId
   */
  async deleteDocument(applicationId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/applications/${applicationId}/documents/${documentId}`);
  },

};

// ============================================================================
// Landlord / Agency API — manage candidates from the panel
// ============================================================================

export const landlordApplicationsApi = {
  /** GET /landlord/candidates — all candidates across all properties, with stats */
  async getAllCandidates(): Promise<AllCandidatesResponse> {
    return apiClient.get<AllCandidatesResponse>('/landlord/candidates');
  },

  /** GET /landlord/properties/:propertyId/candidates */
  async getCandidates(propertyId: string): Promise<LandlordCandidate[]> {
    return apiClient.get<LandlordCandidate[]>(
      `/landlord/properties/${propertyId}/candidates`
    );
  },

  /** GET /landlord/applications/:applicationId */
  async getDetail(applicationId: string): Promise<LandlordApplicationDetail> {
    return apiClient.get<LandlordApplicationDetail>(
      `/landlord/applications/${applicationId}`
    );
  },

  /** POST /landlord/applications/:id/preapprove */
  async preapprove(applicationId: string, data?: object): Promise<void> {
    await apiClient.post(
      `/landlord/applications/${applicationId}/preapprove`,
      data ?? {}
    );
  },

  /** POST /landlord/applications/:id/approve */
  async approve(applicationId: string, data?: object): Promise<void> {
    await apiClient.post(
      `/landlord/applications/${applicationId}/approve`,
      data ?? {}
    );
  },

  /** POST /landlord/applications/:id/reject */
  async reject(applicationId: string, reason: string): Promise<void> {
    await apiClient.post(`/landlord/applications/${applicationId}/reject`, {
      reason,
    });
  },

  /** POST /landlord/applications/:id/request-info */
  async requestInfo(applicationId: string, message: string): Promise<void> {
    await apiClient.post(
      `/landlord/applications/${applicationId}/request-info`,
      { message }
    );
  },

  /** POST /landlord/applications/:id/notes */
  async saveNote(applicationId: string, content: string): Promise<void> {
    await apiClient.post(`/landlord/applications/${applicationId}/notes`, {
      content,
    });
  },

  /** DELETE /landlord/applications/:id/notes */
  async deleteNote(applicationId: string): Promise<void> {
    await apiClient.delete(`/landlord/applications/${applicationId}/notes`);
  },

  // ==========================================================================
  // AI Agent endpoints
  // ==========================================================================

  /**
   * Trigger a re-evaluation of the applicant via the Tenant-Scoring agent.
   * POST /evaluations/:applicationId → 202 Accepted (async).
   * Backend may return 400 if the agency has no evaluation credits left.
   */
  async triggerReevaluation(applicationId: string): Promise<EvaluationTriggerResponse> {
    return apiClient.post<EvaluationTriggerResponse>(`/evaluations/${applicationId}`, {});
  },

  /**
   * Get the consolidated evaluation result for an application.
   * GET /evaluations/:applicationId/result
   *
   * This is the landlord/agency-facing endpoint. The /scoring/* endpoints are
   * tenant-only (they 403 for any other role).
   */
  async getEvaluationResult(applicationId: string): Promise<EvaluationResult> {
    // Normalize the backend response: status comes uppercase, score/level may
    // be at root or nested under `result`, depending on completion stage.
    const raw = await apiClient.get<Record<string, unknown>>(`/evaluations/${applicationId}/result`);
    const nested = (raw.result as Record<string, unknown> | undefined) ?? {};
    const status = typeof raw.status === 'string' ? raw.status.toLowerCase() : undefined;
    // credit_check arrives at root level (not nested under `result`).
    // Fall back to nested just in case a backend version wraps everything under result.
    const creditCheck =
      (raw.credit_check as CreditCheck | undefined) ??
      (nested.credit_check as CreditCheck | undefined);
    // protection_options follows the same root-first, nested-fallback pattern.
    const protectionOptions =
      (raw.protection_options as ProtectionOption[] | undefined) ??
      (nested.protection_options as ProtectionOption[] | undefined);
    return {
      ...(raw as unknown as EvaluationResult),
      status: status as EvaluationResult['status'],
      totalScore: (raw.totalScore as number | undefined) ?? (raw.score as number | undefined) ?? (nested.score as number | undefined),
      level: (raw.level as EvaluationResult['level']) ?? (nested.level as EvaluationResult['level']),
      requires_manual_review: (raw.requires_manual_review as boolean | undefined) ?? (nested.requires_manual_review as boolean | undefined),
      integrity_flags: (raw.integrity_flags as EvaluationResult['integrity_flags']) ?? (nested.integrity_flags as EvaluationResult['integrity_flags']),
      observations: (raw.observations as EvaluationResult['observations']) ?? (nested.observations as EvaluationResult['observations']),
      score_breakdown: (raw.score_breakdown as EvaluationResult['score_breakdown']) ?? (nested.score_breakdown as EvaluationResult['score_breakdown']),
      credit_check: creditCheck,
      protection_options: protectionOptions,
    };
  },

  /**
   * Get a short-lived signed download URL for a document (TTL 60s).
   * GET /applications/:applicationId/documents/:documentId/download
   */
  async getDocumentDownloadUrl(applicationId: string, documentId: string): Promise<{ url: string; expiresAt: string }> {
    return apiClient.get(`/applications/${applicationId}/documents/${documentId}/download`);
  },

  /**
   * Trigger Smart-Matching agent on-demand: find compatible properties in the
   * landlord's portfolio for this candidate.
   * POST /applications/:id/smart-matching
   */
  async triggerSmartMatching(
    applicationId: string,
    limit = 10
  ): Promise<SmartMatchingResponse> {
    return apiClient.post<SmartMatchingResponse>(
      `/applications/${applicationId}/smart-matching`,
      { limit }
    );
  },
};
