/**
 * Contracts API service
 * Endpoints for creating, signing, and managing rental contracts
 */

import { apiClient } from './client';
import type { BackendContract, CreateContractDto, SignContractDto } from './contracts.types';
import type { Contract, ContractType, ContractStatus, SignatureStatus } from '@/lib/types/contract';
import type { ContractAuditEvent, ContractAuditEventType, ContractAuditEventMetadata } from '@/lib/types/contract';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const CONTRACT_STATUS_MAP: Record<string, ContractStatus> = {
  DRAFT: 'draft',
  PENDING_LANDLORD: 'pending_landlord',
  PENDING_TENANT: 'pending_tenant',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  BASICO: 'basico',
  AMOBLADO: 'amoblado',
  COMPARTIDO: 'compartido',
  CUSTOM: 'custom',
};

const SIGNATURE_STATUS_MAP: Record<string, SignatureStatus> = {
  PENDING: 'pending',
  SIGNED: 'signed',
};

const AUDIT_TYPE_MAP: Record<string, ContractAuditEventType> = {
  CREATED: 'created',
  SENT_TO_LANDLORD: 'sent_to_landlord',
  LANDLORD_SIGNED: 'landlord_signed',
  SENT_TO_TENANT: 'sent_to_tenant',
  TENANT_SIGNED: 'tenant_signed',
  ACTIVATED: 'activated',
};

// ============================================================================
// Mapper
// ============================================================================

function mapBackendContract(bc: BackendContract): Contract {
  return {
    id: bc.id,
    propertyId: bc.propertyId,
    tenantId: bc.tenantId,
    landlordId: bc.landlordId,
    templateId: bc.templateId,
    type: (CONTRACT_TYPE_MAP[bc.type] ?? bc.type) as ContractType,
    status: (CONTRACT_STATUS_MAP[bc.status] ?? bc.status) as ContractStatus,
    propertyAddress: bc.propertyAddress,
    propertyCity: bc.propertyCity,
    tenantName: bc.tenantName,
    tenantEmail: bc.tenantEmail,
    tenantPhone: bc.tenantPhone,
    tenantDocument: bc.tenantDocument,
    landlordName: bc.landlordName,
    landlordEmail: bc.landlordEmail,
    landlordDocument: bc.landlordDocument,
    monthlyRent: bc.monthlyRent,
    adminFee: bc.adminFee,
    startDate: bc.startDate,
    endDate: bc.endDate,
    paymentDueDay: bc.paymentDueDay,
    guaranteeType: bc.guaranteeType as 'poliza' | 'codeudor',
    guaranteeDetails: bc.guaranteeDetails,
    landlordSignature: bc.landlordSignature
      ? {
          signedAt: bc.landlordSignature.signedAt,
          signedBy: bc.landlordSignature.signedBy,
          signerId: bc.landlordSignature.signerId,
          ipAddress: bc.landlordSignature.ipAddress,
          userAgent: bc.landlordSignature.userAgent,
          status: (SIGNATURE_STATUS_MAP[bc.landlordSignature.status] ?? bc.landlordSignature.status) as SignatureStatus,
          otpVerified: bc.landlordSignature.otpVerified,
          otpVerifiedAt: bc.landlordSignature.otpVerifiedAt,
        }
      : null,
    tenantSignature: bc.tenantSignature
      ? {
          signedAt: bc.tenantSignature.signedAt,
          signedBy: bc.tenantSignature.signedBy,
          signerId: bc.tenantSignature.signerId,
          ipAddress: bc.tenantSignature.ipAddress,
          userAgent: bc.tenantSignature.userAgent,
          status: (SIGNATURE_STATUS_MAP[bc.tenantSignature.status] ?? bc.tenantSignature.status) as SignatureStatus,
          otpVerified: bc.tenantSignature.otpVerified,
          otpVerifiedAt: bc.tenantSignature.otpVerifiedAt,
        }
      : null,
    nonNegotiableClauses: bc.nonNegotiableClauses,
    specialConditions: bc.specialConditions,
    createdAt: bc.createdAt,
    updatedAt: bc.updatedAt,
    auditTrail: (bc.auditTrail ?? []).map((ae) => ({
      id: ae.id,
      contractId: ae.contractId,
      type: (AUDIT_TYPE_MAP[ae.type] ?? ae.type) as ContractAuditEventType,
      timestamp: ae.timestamp,
      metadata: ae.metadata as ContractAuditEventMetadata,
    })),
    certificateId: bc.certificateId,
    documentHash: bc.documentHash,
  };
}

// ============================================================================
// Service
// ============================================================================

export const contractsApi = {
  /** GET /contracts - list user's contracts */
  async getMine(): Promise<Contract[]> {
    const raw = await apiClient.get<BackendContract[]>('/contracts');
    return raw.map(mapBackendContract);
  },

  /** GET /contracts/:id - get single contract */
  async getById(id: string): Promise<Contract> {
    const raw = await apiClient.get<BackendContract>(`/contracts/${id}`);
    return mapBackendContract(raw);
  },

  /** POST /contracts - create a new contract */
  async create(dto: CreateContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>('/contracts', dto);
    return mapBackendContract(raw);
  },

  /** POST /contracts/:id/sign - sign a contract */
  async sign(id: string, dto?: SignContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/sign`, dto);
    return mapBackendContract(raw);
  },

  /** POST /contracts/:id/activate - activate a contract */
  async activate(id: string): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/activate`);
    return mapBackendContract(raw);
  },

  /** PATCH /contracts/:id/cancel - cancel a contract */
  async cancel(id: string): Promise<Contract> {
    const raw = await apiClient.patch<BackendContract>(`/contracts/${id}/cancel`);
    return mapBackendContract(raw);
  },
};
