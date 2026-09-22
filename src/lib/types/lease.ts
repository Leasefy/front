/**
 * Lease and payment types for post-contract management
 */

export type LeaseStatus = 'active' | 'ending_soon' | 'ended' | 'terminated';
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'failed';
export type PaymentMethod =
  | 'pse'
  | 'credit_card'
  | 'debit_card'
  | 'nequi'
  | 'daviplata'
  | 'cash';

/**
 * Active lease representing a signed contract in effect
 */
export interface Lease {
  id: string;
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: LeaseStatus;

  // Terms
  monthlyRent: number;
  deposit?: number;
  startDate: string;
  endDate: string;
  paymentDay: number; // Day of month (1-28)

  // ─── Campos legacy / no modelados en backend ────────
  /** @deprecated backend no modela adminFee en lease. Si necesitas, viene de la property. */
  adminFee?: number;
  /** @deprecated backend no modela garantías en lease todavía. */
  guaranteeType?: 'poliza' | 'codeudor';
  /** @deprecated backend no modela garantías en lease todavía. */
  guaranteeDetails?: string;

  // Property info (denormalized for display)
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  /** `null` cuando el inmueble no tiene fotos (todos los migrados). */
  propertyThumbnail: string | null;

  // Tenant info (denormalized for landlord view)
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAvatar?: string;

  // Landlord info (denormalized for tenant view)
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;

  // Documents
  contractUrl?: string;
  insuranceUrl?: string;
  inventoryUrl?: string;

  // Pending renewal proposed by the agency (tenant sees "en renovación")
  renovacion?: {
    id: string;
    status: string;
    proposedRent: number;
    proposedAdminFee: number | null;
    newEndDate: string | null;
    tenantAcceptedAt: string | null;
    /**
     * El aviso de que NO se renueva, venga de quien venga. `null` = nadie
     * avisó, que es el caso normal: sin aviso el contrato se prorroga solo
     * (Ley 820). `por` es INQUILINO · PROPIETARIO · INMOBILIARIA, y decide
     * quién puede retirarlo.
     */
    avisoNoRenovar?: {
      at: string;
      por: string | null;
      motivo: string | null;
    } | null;
  } | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Monthly rent payment record
 */
export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  concept: 'rent' | 'deposit' | 'admin_fee' | 'late_fee' | 'repair';
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
}

/**
 * Payment method option for selector UI
 */
export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  processingTime?: string;
  fee?: number;
}

/**
 * Lease summary stats for dashboard
 */
export interface LeaseSummaryStats {
  activeLeases: number;
  endingSoon: number;
  totalMonthlyIncome: number;
  pendingPayments: number;
  latePayments: number;
}
