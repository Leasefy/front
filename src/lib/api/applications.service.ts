/**
 * Applications API service
 * Wraps apiClient for application-specific operations
 */

import { apiClient, getAccessToken } from './client';
import type {
  BackendApplication,
  BackendDocument,
  CreateApplicationDto,
  PaginatedApplications,
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
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'rejected',
};

const STATUS_TO_TENANT_MAP: Record<string, TenantApplicationStatus> = {
  DRAFT: 'submitted',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INFO_REQUESTED: 'under_review',
  PRE_APPROVED: 'pre_approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
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
          thumbnail: firstImage?.url || '/placeholder-property.jpg',
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
  /** Create and submit an application */
  async create(data: CreateApplicationDto): Promise<Application> {
    const ba = await apiClient.post<BackendApplication>('/applications', data);
    return mapBackendApplication(ba);
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

  /** Withdraw an application */
  async withdraw(id: string): Promise<void> {
    await apiClient.post(`/applications/${id}/withdraw`);
  },

  /** Respond to info request */
  async respondToInfoRequest(id: string, message: string): Promise<void> {
    await apiClient.post(`/applications/${id}/respond-info`, { message });
  },

  /** Upload a document for an application (multipart) */
  async uploadDocument(
    file: File,
    type: string
  ): Promise<BackendDocument> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${res.status}`);
    }

    return res.json();
  },

  /** Get documents for an application */
  async getDocuments(applicationId: string): Promise<BackendDocument[]> {
    return apiClient.get<BackendDocument[]>(`/documents/application/${applicationId}`);
  },
};
