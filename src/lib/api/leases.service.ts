/**
 * Leases & Payments API service
 * Endpoints for managing active leases and tenant payments.
 */

import { apiClient, ApiError } from './client';
import type { BackendLease, BackendPayment, BackendPaymentInfo } from './leases.types';
import type {
  Lease,
  LeaseStatus,
  Payment,
  PaymentStatus,
  PaymentMethod,
} from '@/lib/types/lease';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const LEASE_STATUS_MAP: Record<string, LeaseStatus> = {
  ACTIVE: 'active',
  ENDING_SOON: 'ending_soon',
  ENDED: 'ended',
  TERMINATED: 'terminated',
};

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: 'pending',
  PAID: 'paid',
  LATE: 'late',
  FAILED: 'failed',
};

const PAYMENT_CONCEPT_MAP: Record<string, Payment['concept']> = {
  RENT: 'rent',
  DEPOSIT: 'deposit',
  ADMIN_FEE: 'admin_fee',
  LATE_FEE: 'late_fee',
  REPAIR: 'repair',
};

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  PSE: 'pse',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  NEQUI: 'nequi',
  DAVIPLATA: 'daviplata',
  CASH: 'cash',
};

// ============================================================================
// Mappers
// ============================================================================

function mapBackendLease(bl: BackendLease): Lease {
  return {
    id: bl.id,
    contractId: bl.contractId,
    propertyId: bl.propertyId,
    landlordId: bl.landlordId,
    tenantId: bl.tenantId,
    status: (LEASE_STATUS_MAP[bl.status] ?? bl.status) as LeaseStatus,
    monthlyRent: bl.monthlyRent,
    deposit: bl.deposit,
    startDate: bl.startDate,
    endDate: bl.endDate,
    paymentDay: bl.paymentDay,
    propertyTitle: bl.propertyTitle,
    propertyAddress: bl.propertyAddress,
    propertyCity: bl.propertyCity,
    propertyThumbnail: bl.propertyThumbnail,
    tenantName: bl.tenantName,
    tenantEmail: bl.tenantEmail,
    tenantPhone: bl.tenantPhone,
    tenantAvatar: bl.tenantAvatar,
    landlordName: bl.landlordName,
    landlordEmail: bl.landlordEmail,
    landlordPhone: bl.landlordPhone,
    contractUrl: bl.contractUrl,
    insuranceUrl: bl.insuranceUrl,
    inventoryUrl: bl.inventoryUrl,
    createdAt: bl.createdAt,
    updatedAt: bl.updatedAt,
    // Legacy: el backend NO devuelve estos campos. Los pasamos solo si vinieran (compat).
    adminFee: bl.adminFee,
    guaranteeType: bl.guaranteeType as Lease['guaranteeType'],
    guaranteeDetails: bl.guaranteeDetails,
  };
}

function mapBackendPayment(bp: BackendPayment): Payment {
  return {
    id: bp.id,
    leaseId: bp.leaseId,
    amount: bp.amount,
    concept: (PAYMENT_CONCEPT_MAP[bp.concept] ?? bp.concept) as Payment['concept'],
    dueDate: bp.dueDate,
    paidDate: bp.paidDate,
    status: (PAYMENT_STATUS_MAP[bp.status] ?? bp.status) as PaymentStatus,
    method: bp.method
      ? ((PAYMENT_METHOD_MAP[bp.method] ?? bp.method) as PaymentMethod)
      : undefined,
    reference: bp.reference,
    notes: bp.notes,
  };
}

// ============================================================================
// API
// ============================================================================

export const leasesApi = {
  /** GET /leases — leases for the authenticated user */
  async getMine(): Promise<Lease[]> {
    try {
      const raw = await apiClient.get<BackendLease[]>('/leases');
      return raw.map(mapBackendLease);
    } catch (err) {
      // 403 = tenant calling landlord-only endpoint, 404 = endpoint not available
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return [];
      }
      throw err;
    }
  },

  /** GET /leases/:id — single lease */
  async getById(id: string): Promise<Lease> {
    const raw = await apiClient.get<BackendLease>(`/leases/${id}`);
    return mapBackendLease(raw);
  },

  /** GET /tenant-payments/lease/:leaseId — payments for a specific lease */
  async getPayments(leaseId: string): Promise<Payment[]> {
    try {
      const raw = await apiClient.get<BackendPayment[]>(`/tenant-payments/lease/${leaseId}`);
      return raw.map(mapBackendPayment);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return [];
      }
      throw err;
    }
  },

  /**
   * GET /leases/:leaseId/payment-info — info del lease para mostrar el modal de pago.
   * Devuelve monto + día de pago + cuentas del landlord + período actual (month/year).
   * Solo accesible para el TENANT del lease.
   */
  async getPaymentInfo(leaseId: string): Promise<BackendPaymentInfo> {
    return apiClient.get<BackendPaymentInfo>(`/leases/${leaseId}/payment-info`);
  },

  /** GET /tenant-payments/mine — all payments for the authenticated tenant */
  async getMyPayments(): Promise<Payment[]> {
    try {
      const raw = await apiClient.get<BackendPayment[]>('/tenant-payments/mine');
      return raw.map(mapBackendPayment);
    } catch (err) {
      // 404 = endpoint not implemented yet in backend
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return [];
      }
      throw err;
    }
  },
};
