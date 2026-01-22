/**
 * Mock lease and payment data for post-contract dashboards
 */

import type {
  Lease,
  Payment,
  PaymentMethodOption,
  LeaseSummaryStats,
} from '@/lib/types/lease';

/**
 * Mock active leases
 */
export const MOCK_LEASES: Lease[] = [
  {
    id: 'lease-1',
    contractId: 'contract-1',
    propertyId: '1',
    landlordId: 'landlord-001',
    tenantId: 'user-tenant-1',
    status: 'active',
    monthlyRent: 2500000,
    adminFee: 180000,
    guaranteeType: 'poliza',
    guaranteeDetails: 'Poliza Seguros Bolivar #POL-2025-789012',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    paymentDueDay: 5,
    propertyTitle: 'Apartamento Moderno en Chapinero',
    propertyAddress: 'Cra 7 #72-45, Apto 501',
    propertyCity: 'Bogota',
    propertyThumbnail:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
    tenantName: 'Carlos Rodriguez Martinez',
    tenantEmail: 'carlos.rodriguez@email.com',
    tenantPhone: '+57 300 123 4567',
    tenantAvatar: undefined,
    landlordName: 'Maria Gonzalez Perez',
    landlordEmail: 'maria.gonzalez@email.com',
    landlordPhone: '+57 310 987 6543',
    contractUrl: '/documents/contract-1.pdf',
    insuranceUrl: '/documents/insurance-1.pdf',
    inventoryUrl: '/documents/inventory-1.pdf',
    createdAt: '2025-12-15T10:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'lease-2',
    contractId: 'contract-2',
    propertyId: '2',
    landlordId: 'landlord-001',
    tenantId: 'user-tenant-2',
    status: 'active',
    monthlyRent: 1800000,
    adminFee: 150000,
    guaranteeType: 'codeudor',
    guaranteeDetails: 'Roberto Herrera Castillo - C.C. 80.456.123',
    startDate: '2025-11-01',
    endDate: '2026-11-01',
    paymentDueDay: 1,
    propertyTitle: 'Estudio en el Poblado',
    propertyAddress: 'Cra 43A #14-95, Apto 302',
    propertyCity: 'Medellin',
    propertyThumbnail:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    tenantName: 'Ana Sofia Herrera',
    tenantEmail: 'ana.herrera@email.com',
    tenantPhone: '+57 301 456 7890',
    tenantAvatar: undefined,
    landlordName: 'Maria Gonzalez Perez',
    landlordEmail: 'maria.gonzalez@email.com',
    landlordPhone: '+57 310 987 6543',
    contractUrl: '/documents/contract-2.pdf',
    insuranceUrl: undefined,
    inventoryUrl: '/documents/inventory-2.pdf',
    createdAt: '2025-10-20T14:30:00Z',
    updatedAt: '2025-11-01T09:00:00Z',
  },
  {
    id: 'lease-3',
    contractId: 'contract-3',
    propertyId: '3',
    landlordId: 'landlord-001',
    tenantId: 'user-tenant-3',
    status: 'ending_soon',
    monthlyRent: 3200000,
    adminFee: 250000,
    guaranteeType: 'poliza',
    guaranteeDetails: 'Poliza Liberty Seguros #LIB-2025-345678',
    startDate: '2025-03-01',
    endDate: '2026-03-01',
    paymentDueDay: 10,
    propertyTitle: 'Casa Campestre en Chia',
    propertyAddress: 'Vereda Fonqueta, Casa 15',
    propertyCity: 'Chia',
    propertyThumbnail:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
    tenantName: 'Juan Pablo Mendez',
    tenantEmail: 'jp.mendez@email.com',
    tenantPhone: '+57 302 789 0123',
    tenantAvatar: undefined,
    landlordName: 'Maria Gonzalez Perez',
    landlordEmail: 'maria.gonzalez@email.com',
    landlordPhone: '+57 310 987 6543',
    contractUrl: '/documents/contract-3.pdf',
    insuranceUrl: '/documents/insurance-3.pdf',
    inventoryUrl: '/documents/inventory-3.pdf',
    createdAt: '2025-02-15T11:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'lease-4',
    contractId: 'contract-4',
    propertyId: '4',
    landlordId: 'user-landlord-2',
    tenantId: 'user-tenant-1',
    status: 'active',
    monthlyRent: 1200000,
    adminFee: 100000,
    guaranteeType: 'poliza',
    guaranteeDetails: 'Poliza Sura #SURA-2025-567890',
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    paymentDueDay: 15,
    propertyTitle: 'Habitacion Amoblada Centro',
    propertyAddress: 'Cra 5 #15-30, Hab 3',
    propertyCity: 'Bogota',
    propertyThumbnail:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    tenantName: 'Carlos Rodriguez Martinez',
    tenantEmail: 'carlos.rodriguez@email.com',
    tenantPhone: '+57 300 123 4567',
    tenantAvatar: undefined,
    landlordName: 'Pedro Ramirez',
    landlordEmail: 'pedro.ramirez@email.com',
    landlordPhone: '+57 315 111 2222',
    contractUrl: '/documents/contract-4.pdf',
    insuranceUrl: undefined,
    inventoryUrl: undefined,
    createdAt: '2025-05-20T09:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
];

/**
 * Mock payments history
 */
export const MOCK_PAYMENTS: Payment[] = [
  // Lease 1 payments (active - current tenant view)
  {
    id: 'payment-1-1',
    leaseId: 'lease-1',
    amount: 5000000,
    concept: 'deposit',
    dueDate: '2026-01-01',
    paidDate: '2025-12-28',
    status: 'paid',
    method: 'pse',
    reference: 'PSE-2025122801',
    notes: 'Deposito de seguridad',
  },
  {
    id: 'payment-1-2',
    leaseId: 'lease-1',
    amount: 2680000,
    concept: 'rent',
    dueDate: '2026-01-05',
    paidDate: '2026-01-03',
    status: 'paid',
    method: 'pse',
    reference: 'PSE-2026010301',
    notes: 'Arriendo enero + administracion',
  },
  {
    id: 'payment-1-3',
    leaseId: 'lease-1',
    amount: 2680000,
    concept: 'rent',
    dueDate: '2026-02-05',
    status: 'pending',
  },

  // Lease 2 payments
  {
    id: 'payment-2-1',
    leaseId: 'lease-2',
    amount: 3600000,
    concept: 'deposit',
    dueDate: '2025-11-01',
    paidDate: '2025-10-28',
    status: 'paid',
    method: 'credit_card',
    reference: 'CC-2025102801',
  },
  {
    id: 'payment-2-2',
    leaseId: 'lease-2',
    amount: 1950000,
    concept: 'rent',
    dueDate: '2025-11-01',
    paidDate: '2025-11-01',
    status: 'paid',
    method: 'nequi',
    reference: 'NEQ-2025110101',
  },
  {
    id: 'payment-2-3',
    leaseId: 'lease-2',
    amount: 1950000,
    concept: 'rent',
    dueDate: '2025-12-01',
    paidDate: '2025-12-01',
    status: 'paid',
    method: 'nequi',
    reference: 'NEQ-2025120101',
  },
  {
    id: 'payment-2-4',
    leaseId: 'lease-2',
    amount: 1950000,
    concept: 'rent',
    dueDate: '2026-01-01',
    paidDate: '2026-01-02',
    status: 'paid',
    method: 'nequi',
    reference: 'NEQ-2026010201',
  },
  {
    id: 'payment-2-5',
    leaseId: 'lease-2',
    amount: 1950000,
    concept: 'rent',
    dueDate: '2026-02-01',
    status: 'pending',
  },

  // Lease 3 payments (ending soon)
  {
    id: 'payment-3-1',
    leaseId: 'lease-3',
    amount: 6400000,
    concept: 'deposit',
    dueDate: '2025-03-01',
    paidDate: '2025-02-25',
    status: 'paid',
    method: 'pse',
    reference: 'PSE-2025022501',
  },
  {
    id: 'payment-3-2',
    leaseId: 'lease-3',
    amount: 3450000,
    concept: 'rent',
    dueDate: '2025-03-10',
    paidDate: '2025-03-08',
    status: 'paid',
    method: 'pse',
    reference: 'PSE-2025030801',
  },
  {
    id: 'payment-3-3',
    leaseId: 'lease-3',
    amount: 3450000,
    concept: 'rent',
    dueDate: '2026-01-10',
    paidDate: '2026-01-12',
    status: 'late',
    method: 'daviplata',
    reference: 'DAV-2026011201',
    notes: 'Pagado 2 dias despues',
  },
  {
    id: 'payment-3-4',
    leaseId: 'lease-3',
    amount: 3450000,
    concept: 'rent',
    dueDate: '2026-02-10',
    status: 'pending',
  },

  // Lease 4 payments (tenant's second lease)
  {
    id: 'payment-4-1',
    leaseId: 'lease-4',
    amount: 2400000,
    concept: 'deposit',
    dueDate: '2025-06-01',
    paidDate: '2025-05-28',
    status: 'paid',
    method: 'credit_card',
    reference: 'CC-2025052801',
  },
  {
    id: 'payment-4-2',
    leaseId: 'lease-4',
    amount: 1300000,
    concept: 'rent',
    dueDate: '2026-01-15',
    paidDate: '2026-01-14',
    status: 'paid',
    method: 'nequi',
    reference: 'NEQ-2026011401',
  },
  {
    id: 'payment-4-3',
    leaseId: 'lease-4',
    amount: 1300000,
    concept: 'rent',
    dueDate: '2026-02-15',
    status: 'pending',
  },
];

/**
 * Available payment methods for Colombian market
 */
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'pse',
    name: 'PSE',
    description: 'Transferencia bancaria directa',
    icon: '🏦',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'credit_card',
    name: 'Tarjeta de credito',
    description: 'Visa, Mastercard, Amex',
    icon: '💳',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 2.5,
  },
  {
    id: 'debit_card',
    name: 'Tarjeta debito',
    description: 'Debito automatico mensual',
    icon: '💳',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'nequi',
    name: 'Nequi',
    description: 'Pago desde tu app Nequi',
    icon: '📱',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    description: 'Pago desde tu Daviplata',
    icon: '📱',
    enabled: true,
    processingTime: 'Inmediato',
    fee: 0,
  },
  {
    id: 'cash',
    name: 'Efectivo',
    description: 'Pago en punto fisico',
    icon: '💵',
    enabled: false,
    processingTime: '24-48 horas',
    fee: 0,
  },
];

/**
 * Get all leases for a landlord
 */
export function getLeasesForLandlord(landlordId: string): Lease[] {
  return MOCK_LEASES.filter((lease) => lease.landlordId === landlordId);
}

/**
 * Get all leases for a tenant
 */
export function getLeasesForTenant(tenantId: string): Lease[] {
  return MOCK_LEASES.filter((lease) => lease.tenantId === tenantId);
}

/**
 * Get active lease for tenant (most recent active one)
 */
export function getActiveLeasesForTenant(tenantId: string): Lease[] {
  return MOCK_LEASES.filter(
    (lease) =>
      lease.tenantId === tenantId &&
      (lease.status === 'active' || lease.status === 'ending_soon')
  );
}

/**
 * Get payments for a specific lease
 */
export function getPaymentsForLease(leaseId: string): Payment[] {
  return MOCK_PAYMENTS.filter((payment) => payment.leaseId === leaseId).sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );
}

/**
 * Get next pending payment for a lease
 */
export function getNextPayment(leaseId: string): Payment | undefined {
  return MOCK_PAYMENTS.find(
    (payment) => payment.leaseId === leaseId && payment.status === 'pending'
  );
}

/**
 * Calculate summary stats for landlord dashboard
 */
export function getLandlordStats(landlordId: string): LeaseSummaryStats {
  const leases = getLeasesForLandlord(landlordId);
  const activeLeases = leases.filter((l) => l.status === 'active');
  const endingSoon = leases.filter((l) => l.status === 'ending_soon');

  const activeLeaseIds = [...activeLeases, ...endingSoon].map((l) => l.id);
  const relevantPayments = MOCK_PAYMENTS.filter((p) =>
    activeLeaseIds.includes(p.leaseId)
  );

  return {
    activeLeases: activeLeases.length,
    endingSoon: endingSoon.length,
    totalMonthlyIncome: activeLeases.reduce(
      (sum, l) => sum + l.monthlyRent + l.adminFee,
      0
    ),
    pendingPayments: relevantPayments.filter((p) => p.status === 'pending')
      .length,
    latePayments: relevantPayments.filter((p) => p.status === 'late').length,
  };
}

/**
 * Get a single lease by ID
 */
export function getLeaseById(leaseId: string): Lease | undefined {
  return MOCK_LEASES.find((lease) => lease.id === leaseId);
}
