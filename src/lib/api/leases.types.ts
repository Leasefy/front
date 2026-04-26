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
  status: string;       // ACTIVE | ENDING_SOON | ENDED | TERMINATED
  monthlyRent: number;  // COP, NOT NULL en backend
  deposit?: number;     // COP, opcional según contexto
  paymentDay: number;   // 1-28 — backend usa `paymentDay`, NO `paymentDueDay`
  startDate: string;
  endDate: string;

  // Denormalized display fields (snapshots al activar)
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

  // ─── Campos legacy/no modelados en backend (kept opcionales) ────────
  /** @deprecated backend NO modela adminFee en lease (vive en Property). */
  adminFee?: number;
  /** @deprecated backend NO modela garantías en lease todavía. */
  guaranteeType?: string;
  /** @deprecated backend NO modela garantías en lease todavía. */
  guaranteeDetails?: string;
}

/**
 * Status del período actual calculado por el backend para el lease del tenant.
 * Se usa en el modal de pago como pre-flight check antes de mostrar el form,
 * y para gating del CTA "Pagar arriendo".
 */
export type CurrentPeriodStatus =
  | 'NONE'                // No hay nada para el período → puede pagar
  | 'PENDING_VALIDATION'  // Hay una request en validación → no puede pagar de nuevo
  | 'APPROVED'            // Ya hay un Payment confirmado → no puede pagar
  | 'REJECTED';           // Última request rechazada → puede reintentar

/**
 * Shape de GET /leases/:leaseId/payment-info — info necesaria para mostrar el modal "Pagar arriendo".
 * Incluye monto, día de pago, cuentas del landlord y el período actual calculado por el backend.
 */
export interface BackendPaymentInfo {
  leaseId: string;
  monthlyRent: number;
  paymentDay: number;
  paymentMethods: Array<{
    id: string;
    bankName: string;
    accountType: 'AHORROS' | 'CORRIENTE';
    accountNumber: string;
    holderName: string;
    phoneNumber: string | null;
    methodType: string;
    instructions: string | null;
  }>;
  currentPeriod: {
    month: number; // 1-12
    year: number;
  };
  currentPeriodStatus: CurrentPeriodStatus;
  /** Mensaje del rechazo cuando currentPeriodStatus === 'REJECTED'. */
  currentPeriodRejectionReason: string | null;
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
