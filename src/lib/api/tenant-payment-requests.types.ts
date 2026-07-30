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
