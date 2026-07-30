/**
 * Real PSE (Wompi recaudo) checkout for tenant rent — replaces the /pse-mock flow.
 *
 * Backend contract (see back `WompiController`):
 *   GET  /leases/pse/financial-institutions        → PseFinancialInstitution[]
 *   POST /leases/:leaseId/pse/checkout             → PseCheckoutResponse
 *   GET  /leases/:leaseId/payment-requests/:reqId  → TenantPaymentRequest (poll)
 *
 * Flow: checkout creates a PROCESSING request + a Wompi transaction and returns
 * `asyncPaymentUrl` (may be null). The front opens it in a new tab; confirmation
 * arrives asynchronously via the Wompi webhook, so we poll the request status.
 */

import type { TenantPaymentRequestStatus } from './tenant-payment-requests.types';

export type PseUserType = 'NATURAL' | 'JURIDICA';

/** Wompi/back-accepted legal id types. Note: passport is 'PP' (not 'PASAPORTE'). */
export type PseLegalIdType = 'CC' | 'CE' | 'NIT' | 'PP';

/** Raw shape returned by Wompi's /pse/financial_institutions catalog. */
export interface PseFinancialInstitution {
  /** Numeric PSE code (e.g. "1051") — this is what goes in `financialInstitutionCode`. */
  financial_institution_code: string;
  financial_institution_name: string;
}

export interface PseCheckoutDto {
  /** Optional — backend defaults to the lease's monthlyRent. */
  amount?: number;
  /** 1-12 — period being paid. */
  periodMonth: number;
  periodYear: number;
  userType: PseUserType;
  legalIdType: PseLegalIdType;
  /** 6-15 digits. */
  legalId: string;
  /** `financial_institution_code` from the catalog above. */
  financialInstitutionCode: string;
  email: string;
  fullName: string;
}

export interface PseCheckoutResponse {
  paymentRequestId: string;
  wompiTransactionId: string;
  /** Redirect the tenant here to complete the payment. Can be null (URL not ready yet). */
  asyncPaymentUrl: string | null;
  status: 'PROCESSING';
}

/**
 * Subset of the TenantPaymentRequest row returned while polling. Success is
 * `status === 'APPROVED'`; `PROCESSING` is the in-flight state.
 */
export interface PsePaymentRequestState {
  id: string;
  leaseId: string;
  amount: number;
  status: TenantPaymentRequestStatus;
  /** Raw Wompi gateway status (PENDING/APPROVED/DECLINED/…) — display/debug only. */
  gatewayStatus?: string | null;
  rejectionReason?: string | null;
  /** Set once the payment is APPROVED. */
  paymentId?: string | null;
  wompiTransactionId?: string | null;
}
