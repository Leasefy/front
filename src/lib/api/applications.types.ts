/**
 * Backend application API types
 * Reflects the exact shape of NestJS responses for /applications and /documents
 */

export interface BackendApplication {
  id: string;
  propertyId: string;
  tenantId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

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
  type: string;
  fileName: string;
  url: string;
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
