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
export type ContractType = 'basico' | 'amoblado' | 'compartido';

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
};

/**
 * Spanish descriptions for contract types
 */
export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  basico: 'Arriendo estandar sin muebles. Ideal para inquilinos que tienen sus propios muebles.',
  amoblado: 'Arriendo con muebles incluidos. Incluye inventario detallado de bienes.',
  compartido: 'Arriendo de habitacion con areas comunes compartidas.',
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
  draft: 'bg-slate-100 text-slate-700',
  pending_landlord: 'bg-amber-100 text-amber-700',
  pending_tenant: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
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
  depositAmount: number;
  adminFee: number;
  startDate: string;      // ISO date
  endDate: string;        // ISO date
  paymentDueDay: number;  // 1-28

  // Signatures
  landlordSignature: Signature | null;
  tenantSignature: Signature | null;

  // Custom terms (editable)
  specialConditions?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
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
  depositAmount: number;
  adminFee: number;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
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
