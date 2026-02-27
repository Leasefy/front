/**
 * Backend DTO types for the /leases and /tenant-payments endpoints.
 * Backend uses UPPERCASE enums; mapped to lowercase frontend types in leases.service.ts.
 */

export interface BackendLease {
  id: string;
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: string; // ACTIVE | ENDING_SOON | ENDED | TERMINATED
  monthlyRent: number;
  adminFee: number;
  guaranteeType: string;
  guaranteeDetails?: string;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  // Denormalized display fields
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyThumbnail: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAvatar?: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  // Documents
  contractUrl?: string;
  insuranceUrl?: string;
  inventoryUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendPayment {
  id: string;
  leaseId: string;
  amount: number;
  concept: string; // RENT | DEPOSIT | ADMIN_FEE | LATE_FEE | REPAIR
  dueDate: string;
  paidDate?: string;
  status: string; // PENDING | PAID | LATE | FAILED
  method?: string; // PSE | CREDIT_CARD | DEBIT_CARD | NEQUI | DAVIPLATA | CASH
  reference?: string;
  notes?: string;
}
