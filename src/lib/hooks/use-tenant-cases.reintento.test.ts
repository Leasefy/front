/**
 * QA-INQ-95 (04-10-2026) · «Mis casos» de Iván listaba «Pago de octubre —
 * Rechazado, reintentar» aunque el intento siguiente de octubre salió aprobado,
 * y «Pago de noviembre — Rechazado, reintentar» con otro intento de noviembre
 * en validación. Un rechazo sólo es caso si es el último intento de ese
 * arriendo y ese período.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BackendTenantPaymentRequest } from '@/lib/api/tenant-payment-requests.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockRequests: BackendTenantPaymentRequest[] = [];

vi.mock('@/lib/hooks/useLeases', () => ({
  useMyPaymentRequests: () => ({ requests: mockRequests, isLoading: false, error: null, refetch: vi.fn(), getForLease: () => [] }),
  useLeases: () => ({ leases: [], isLoading: false, error: null, refetch: vi.fn(), getActive: () => [], stats: {} }),
  useLeasePaymentInfo: () => ({ info: null, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/hooks/useApplications', () => ({
  useTenantApplications: () => ({ applications: [], active: [], completed: [], contractsByApp: {}, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-tenant-pqrs', () => ({
  useTenantPqrs: () => ({ items: [], isLoading: false, error: null, refetch: async () => {} }),
}));
vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => ({ items: [], isLoading: false, error: null, refetch: async () => {} }),
}));
vi.mock('@/lib/hooks/useVisibilityPolling', () => ({ useVisibilityPolling: () => {} }));

import { useTenantCases } from './use-tenant-cases';
import { solicitudesQueSonCaso } from '@/lib/casos/solicitudes-que-son-caso';

function solicitud(id: string, status: BackendTenantPaymentRequest['status'], mes: number, createdAt: string): BackendTenantPaymentRequest {
  return {
    id,
    leaseId: 'lease-ivan',
    amount: 1_817_112,
    paymentMethod: 'PSE',
    periodMonth: mes,
    periodYear: 2026,
    paymentDate: createdAt.slice(0, 10),
    dueDate: `2026-${String(mes).padStart(2, '0')}-05T05:00:00.000Z`,
    hasReceipt: false,
    pseTransactionId: null,
    pseBankCode: null,
    bankName: null,
    referenceNumber: null,
    status,
    validatedAt: null,
    rejectionReason: status === 'REJECTED' ? 'Pago rechazado por la pasarela PSE' : null,
    paymentId: null,
    createdAt,
    updatedAt: createdAt,
    lease: { propertyAddress: 'Calle 45 # 70-12 Apto 301', propertyCity: 'Medellín' },
  };
}

/** Las 7 solicitudes de Iván en el laboratorio (`GET /tenant-payments/requests/mine`). */
const DE_IVAN = [
  solicitud('aprobado-vencido', 'APPROVED', 10, '2026-10-04T17:12:14.693Z'),
  solicitud('rechazado-vencido', 'REJECTED', 10, '2026-10-04T16:49:47.104Z'),
  solicitud('nov-en-validacion', 'PENDING_VALIDATION', 11, '2026-10-03T10:38:02.753Z'),
  solicitud('nov-rechazado', 'REJECTED', 11, '2026-10-03T10:37:59.492Z'),
  solicitud('oct-aprobado', 'APPROVED', 10, '2026-10-03T10:37:17.402Z'),
  solicitud('jun', 'APPROVED', 6, '2026-10-03T09:29:09.182Z'),
  solicitud('jul', 'APPROVED', 7, '2026-10-03T09:28:48.995Z'),
];

let host: HTMLDivElement;
let root: Root;
let visto: ReturnType<typeof useTenantCases> | null = null;
function Sonda() {
  visto = useTenantCases();
  return null;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  visto = null;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('un rechazo que ya se reintentó no es un caso abierto', () => {
  it('Iván: sólo queda el intento de noviembre en validación', async () => {
    mockRequests = DE_IVAN;
    await act(async () => {
      root.render(React.createElement(Sonda));
    });
    const pagos = (visto?.cases ?? []).filter((c) => c.type === 'pago').map((c) => c.id);
    expect(pagos).toEqual(['nov-en-validacion']);
  });

  it('el último intento rechazado de un período sí es un caso', () => {
    const solo = [solicitud('r1', 'REJECTED', 9, '2026-09-02T10:00:00.000Z'), solicitud('r2', 'REJECTED', 9, '2026-09-03T10:00:00.000Z')];
    expect(solicitudesQueSonCaso(solo).map((s) => s.id)).toEqual(['r2']);
  });
});
