/**
 * Backend types for the /pse-mock endpoints — used for tenant rent payments.
 * The backend implements a deterministic mock based on the last digit of the document number:
 *   - 0 → FAILURE (Fondos insuficientes)
 *   - 1 → FAILURE (Transacción rechazada)
 *   - 9 → PENDING (Pendiente verificación bancaria)
 *   - 2-8 → SUCCESS
 */

export interface PseBank {
  /** Código del banco (ej. "BANCOLOMBIA"). Usar este valor en `bankCode` del processPayment. */
  code: string;
  /** Nombre legible (ej. "Bancolombia"). */
  name: string;
}

export type PsePersonType = 'NATURAL' | 'JURIDICA';
export type PseDocumentType = 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
export type PseProcessStatus = 'SUCCESS' | 'FAILURE' | 'PENDING';

export interface PseProcessDto {
  leaseId: string;
  /** Opcional. Default: lease.monthlyRent del backend. */
  amount?: number;
  /** 1-12 — mes del período que se está pagando. */
  periodMonth: number;
  periodYear: number;
  personType: PsePersonType;
  documentType: PseDocumentType;
  /** 6-15 dígitos. */
  documentNumber: string;
  fullName: string;
  email: string;
  /** Código del banco devuelto por GET /pse-mock/banks. */
  bankCode: string;
}

export interface PseProcessResponse {
  transactionId: string;
  status: PseProcessStatus;
  message: string;
  bankName: string;
  timestamp: string;
  /** Solo viene cuando status === 'SUCCESS'. */
  paymentRequestId?: string;
}
