/**
 * Backend types for contract endpoints
 * Maps to /contracts controller in NestJS backend
 */

export interface BackendSignature {
  signedAt: string;
  signedBy: string;
  signerId: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  otpVerified: boolean;
  otpVerifiedAt?: string;
}

export interface BackendAuditEvent {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface BackendContract {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  templateId: string;
  type: string;
  status: string;
  propertyAddress: string;
  propertyCity: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantDocument: string;
  landlordName: string;
  landlordEmail: string;
  landlordDocument: string;
  monthlyRent: number;
  adminFee: number;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  guaranteeType: string;
  guaranteeDetails?: string;
  landlordSignature?: BackendSignature | null;
  tenantSignature?: BackendSignature | null;
  nonNegotiableClauses?: Array<{ id: string; title: string; content: string; required: boolean }>;
  specialConditions?: string;
  createdAt: string;
  updatedAt: string;
  auditTrail?: BackendAuditEvent[];
  certificateId?: string;
  documentHash?: string;
}

export interface CreateContractDto {
  propertyId: string;
  tenantId: string;
  templateType: string;
}

export interface SignContractDto {
  otpVerified?: boolean;
}
