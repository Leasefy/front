/**
 * Contract types and interfaces
 * Types for rental contracts, signatures, and signing flow
 */

// ============================================================================
// Contract Type Enums
// ============================================================================

/**
 * Types of rental contracts
 */
export type ContractType = 'basico' | 'amoblado' | 'compartido' | 'custom';

/**
 * Contract status throughout the signing flow
 */
export type ContractStatus =
  | 'draft'           // Borrador - being configured
  | 'pending_landlord' // Pendiente firma arrendador
  | 'pending_tenant'   // Pendiente firma arrendatario
  | 'active'          // Activo - both signed
  | 'expired'         // Expirado - past end date
  | 'cancelled';      // Cancelado - terminated early

/**
 * Signature status for each party
 */
export type SignatureStatus = 'pending' | 'signed';

// ============================================================================
// Spanish Labels
// ============================================================================

/**
 * Spanish labels for contract types
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  basico: 'Contrato Basico',
  amoblado: 'Contrato Amoblado',
  compartido: 'Contrato Compartido',
  custom: 'Contrato Propio',
};

/**
 * Spanish descriptions for contract types
 */
export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  basico: 'Arriendo estandar sin muebles. Ideal para inquilinos que tienen sus propios muebles.',
  amoblado: 'Arriendo con muebles incluidos. Incluye inventario detallado de bienes.',
  compartido: 'Arriendo de habitacion con areas comunes compartidas.',
  custom: 'Sube tu propio contrato en formato PDF. Se usara como base para el proceso de firma.',
};

/**
 * Spanish labels for contract status
 */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Borrador',
  pending_landlord: 'Pendiente firma arrendador',
  pending_tenant: 'Pendiente firma arrendatario',
  active: 'Activo',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

/**
 * Status badge colors for contract status
 */
export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-muted text-foreground',
  pending_landlord: 'bg-plan-status-yellow-bg text-plan-status-yellow',
  pending_tenant: 'bg-plan-status-blue-bg text-plan-status-blue',
  active: 'bg-plan-status-green-bg text-plan-status-green',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-plan-status-red-bg text-plan-status-red',
};

// ============================================================================
// Contract Clause
// ============================================================================

/**
 * Individual clause within a contract template
 */
export interface ContractClause {
  id: string;
  title: string;
  content: string;
  required: boolean;
}

// ============================================================================
// Contract Template
// ============================================================================

/**
 * Reusable contract template with clauses
 */
export interface ContractTemplate {
  id: string;
  type: ContractType;
  name: string;
  description: string;
  clauses: ContractClause[];
}

// ============================================================================
// Signature
// ============================================================================

/**
 * Electronic signature with legal compliance metadata
 */
export interface Signature {
  signedAt: string;      // ISO date string
  signedBy: string;      // Name of signer
  signerId: string;      // User ID
  ipAddress: string;     // IP for legal record
  userAgent: string;     // Browser info for legal record
  status: SignatureStatus;
  otpVerified: boolean;       // Whether OTP verification was completed
  otpVerifiedAt?: string;     // ISO date string when OTP was verified
}

// ============================================================================
// Audit Trail
// ============================================================================

/**
 * Types of audit events in contract lifecycle
 */
export type ContractAuditEventType =
  | 'created'
  | 'sent_to_landlord'
  | 'landlord_signed'
  | 'sent_to_tenant'
  | 'tenant_signed'
  | 'activated';

/**
 * Audit event metadata
 */
export interface ContractAuditEventMetadata {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  otpVerified?: boolean;
}

/**
 * Individual audit event in contract history
 */
export interface ContractAuditEvent {
  id: string;
  contractId: string;
  type: ContractAuditEventType;
  timestamp: string;        // ISO date string
  metadata: ContractAuditEventMetadata;
}

// ============================================================================
// Contract
// ============================================================================

/**
 * Full contract instance with signatures and terms
 */
export interface Contract {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  templateId: string;
  type: ContractType;
  status: ContractStatus;

  // Property details (denormalized for convenience)
  propertyAddress: string;
  propertyCity: string;

  // Tenant details (denormalized)
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantDocument: string;

  // Landlord details (denormalized)
  landlordName: string;
  landlordEmail: string;
  landlordDocument: string;

  // Contract terms
  monthlyRent: number;
  adminFee: number;
  startDate: string;      // ISO date
  endDate: string;        // ISO date
  paymentDueDay: number;  // 1-28

  // Guarantee (deposits are PROHIBITED by Art. 16, Ley 820/2003)
  guaranteeType: 'poliza' | 'codeudor';
  guaranteeDetails?: string; // Policy number or co-signer name

  // Signatures
  landlordSignature: Signature | null;
  tenantSignature: Signature | null;

  // Non-negotiable clauses from tenant requirements
  nonNegotiableClauses?: ContractClause[];

  // Custom terms (editable)
  specialConditions?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Audit & Certification
  auditTrail: ContractAuditEvent[];
  certificateId?: string;        // e.g., CERT-{contractId}-{timestamp}
  documentHash?: string;         // SHA-256 hash of the PDF
}

// ============================================================================
// Contract Timeline Step
// ============================================================================

/**
 * Step in the contract signing timeline
 */
export interface ContractStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  completedAt?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Data needed to create a new contract
 */
export interface CreateContractInput {
  propertyId: string;
  tenantId: string;
  templateId: string;
  monthlyRent: number;
  adminFee: number;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  guaranteeType: 'poliza' | 'codeudor';
  guaranteeDetails?: string;
  specialConditions?: string;
}

/**
 * Contract summary for list views
 */
export interface ContractSummary {
  id: string;
  propertyAddress: string;
  tenantName: string;
  status: ContractStatus;
  monthlyRent: number;
  startDate: string;
  endDate: string;
}
