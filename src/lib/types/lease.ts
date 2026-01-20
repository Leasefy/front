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
  adminFee: number;
  depositAmount: number;
  depositPaid: boolean;
  startDate: string;
  endDate: string;
  paymentDueDay: number; // Day of month (1-31)

  // Property info (denormalized for display)
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyThumbnail: string;

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
