/**
 * Backend types for /tenant-payments/requests/mine — fuente única del historial
 * de pagos del tenant. Devuelve TODOS los estados (pendientes, aprobados,
 * rechazados, etc.), no solo los Payment confirmados.
 */

export type TenantPaymentRequestStatus =
  | 'PENDING_VALIDATION'
  | 'PROCESSING' // pago PSE real en curso — esperando confirmación del webhook Wompi
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'CANCELLED';

export type TenantPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'PSE'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'NEQUI'
  | 'DAVIPLATA';

export interface BackendTenantPaymentRequest {
  id: string;
  leaseId: string;
  amount: number;                 // COP entero
  paymentMethod: TenantPaymentMethod;
  periodMonth: number;            // 1-12
  periodYear: number;
  paymentDate: string;            // "YYYY-MM-DD"
  dueDate: string;                // ISO — calculado con lease.paymentDay
  hasReceipt: boolean;            // true si BANK_TRANSFER con comprobante
  pseTransactionId: string | null;
  pseBankCode: string | null;     // ej "BANCOLOMBIA"
  bankName: string | null;        // ej "Bancolombia" — display name
  referenceNumber: string | null;
  status: TenantPaymentRequestStatus;
  validatedAt: string | null;     // ISO datetime
  rejectionReason: string | null; // solo en REJECTED/DISPUTED
  paymentId: string | null;       // uuid del Payment creado si APPROVED
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
  lease: {
    propertyAddress: string;
    propertyCity: string;
  };
}

/**
 * Signed, expiring URL to the internal payment receipt ("comprobante interno").
 * Same shape/discipline as v7-02 `ContractSignedPdf { url, expiresAt }`: the backend
 * signs and stamps the expiry; the frontend never fabricates the URL.
 *
 * NOTE: this is an INTERNAL receipt, not a DIAN electronic invoice (FE) — the real
 * tax invoice is a separate, later capability. The backend endpoint that returns this
 * does not exist yet, so `getReceiptUrl` resolves to `null` today (→ UI "Próximamente").
 */
export interface TenantReceiptUrl {
  url: string;
  expiresAt: string;
}
