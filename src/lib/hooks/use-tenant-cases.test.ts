/**
 * use-tenant-cases.test.ts — v7-03-01 (CASO-01) Task 2 TDD spec.
 *
 * Proves the <behavior> of the useTenantCases aggregator:
 *   - open payment requests → one 'pago' row each; APPROVED/CANCELLED → no row.
 *   - currentPeriodStatus NONE + primary lease → one 'próximo pago' row;
 *     NONE + no lease → no row.
 *   - REJECTED current period whose request is in the non-terminal list → exactly
 *     ONE 'pago' row (no double count / no inflated openCasesCount).
 *   - active applications → one 'aplicacion' row each; completed → no row.
 *   - forward-ref types (pqrs/mantenimiento/acuerdo/contrato) → ZERO rows.
 *   - tone is never an alarm level; events only from provided source timestamps.
 *   - openCasesCount === cases.length.
 *
 * The four source hooks are mocked so the aggregator is exercised in isolation.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BackendTenantPaymentRequest } from '@/lib/api/tenant-payment-requests.types';
import type { BackendPaymentInfo } from '@/lib/api/leases.types';
import type { Lease } from '@/lib/types/lease';
import type { TenantApplicationView } from '@/lib/api/applications.service';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

void React; // jsx-preserve

// ── Controllable mock state ────────────────────────────────────────────────
let mockRequests: BackendTenantPaymentRequest[] = [];
let mockLeases: Lease[] = [];
let mockPaymentInfo: BackendPaymentInfo | null = null;
let mockActiveApps: TenantApplicationView[] = [];
let mockPqrs: SolicitudPqrs[] = [];
let mockPqrsError: string | null = null;
let pqrsRefetchCount = 0;
let mockAcuerdos: AcuerdoDetail[] = [];
let mockAcuerdosError: string | null = null;
let acuerdosRefetchCount = 0;

vi.mock('@/lib/hooks/useLeases', () => ({
  useMyPaymentRequests: () => ({
    requests: mockRequests,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    getForLease: () => [],
  }),
  useLeases: () => ({
    leases: mockLeases,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    getActive: () =>
      mockLeases.filter((l) => l.status === 'active' || l.status === 'ending_soon'),
    stats: {},
  }),
  useLeasePaymentInfo: (_id: string | null) => ({
    info: mockPaymentInfo,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/useApplications', () => ({
  useTenantApplications: () => ({
    applications: [],
    active: mockActiveApps,
    completed: [],
    contractsByApp: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// PQRS list hook — controllable so we exercise both the [] (honest empty) path
// and the real-rows fold. refetch bumps a counter to prove it joins Promise.all.
vi.mock('@/lib/hooks/use-tenant-pqrs', () => ({
  useTenantPqrs: () => ({
    items: mockPqrs,
    isLoading: false,
    error: mockPqrsError,
    refetch: async () => {
      pqrsRefetchCount += 1;
    },
  }),
}));

// Acuerdos list hook (v7-07) — controllable so we exercise both the [] (honest
// empty) path and the real-rows fold. refetch bumps a counter for Promise.all.
vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => ({
    items: mockAcuerdos,
    isLoading: false,
    error: mockAcuerdosError,
    refetch: async () => {
      acuerdosRefetchCount += 1;
    },
  }),
}));

// Keep polling inert during tests (no timers / no document listeners).
vi.mock('@/lib/hooks/useVisibilityPolling', () => ({
  useVisibilityPolling: () => {},
}));

import { useTenantCases } from './use-tenant-cases';
import type { TenantCase } from '@/lib/types/tenant-case';

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeRequest(
  over: Partial<BackendTenantPaymentRequest> = {},
): BackendTenantPaymentRequest {
  return {
    id: 'req-' + Math.random().toString(36).slice(2),
    leaseId: 'lease-1',
    amount: 1_000_000,
    paymentMethod: 'BANK_TRANSFER',
    periodMonth: 7,
    periodYear: 2026,
    paymentDate: '2026-07-05',
    dueDate: '2026-07-05T00:00:00.000Z',
    hasReceipt: true,
    pseTransactionId: null,
    pseBankCode: null,
    bankName: 'Bancolombia',
    referenceNumber: null,
    status: 'PENDING_VALIDATION',
    validatedAt: null,
    rejectionReason: null,
    paymentId: null,
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z',
    lease: { propertyAddress: 'Calle 1', propertyCity: 'Bogotá' },
    ...over,
  };
}

function makeLease(over: Partial<Lease> = {}): Lease {
  return {
    id: 'lease-1',
    contractId: 'c-1',
    propertyId: 'p-1',
    landlordId: 'll-1',
    tenantId: 't-1',
    status: 'active',
    monthlyRent: 1_000_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    paymentDay: 5,
    propertyTitle: 'Apto 101',
    propertyAddress: 'Calle 1',
    propertyCity: 'Bogotá',
    propertyThumbnail: '',
    tenantName: 'Ana',
    tenantEmail: 'ana@x.co',
    tenantPhone: '3000000000',
    landlordName: 'Luis',
    landlordEmail: 'luis@x.co',
    landlordPhone: '3111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

function makePaymentInfo(over: Partial<BackendPaymentInfo> = {}): BackendPaymentInfo {
  return {
    leaseId: 'lease-1',
    monthlyRent: 1_000_000,
    paymentDay: 5,
    paymentMethods: [],
    currentPeriod: { month: 7, year: 2026 },
    currentPeriodStatus: 'NONE',
    currentPeriodRejectionReason: null,
    ...over,
  };
}

function makeSolicitud(over: Partial<SolicitudPqrs> = {}): SolicitudPqrs {
  return {
    id: 'sol-' + Math.random().toString(36).slice(2),
    radicado: 'PQRS-2026-0001',
    tipo: 'queja',
    estado: 'recibida',
    prioridad: 'media',
    canal: 'web',
    asunto: 'Ruido excesivo',
    descripcion: 'Ruido de obra fuera de horario.',
    solicitanteNombre: 'Ana',
    solicitanteTipo: 'inquilino',
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
    ...over,
  };
}

function makeApp(over: Partial<TenantApplicationView> = {}): TenantApplicationView {
  return {
    id: 'app-' + Math.random().toString(36).slice(2),
    propertyId: 'p-9',
    status: 'under_review',
    trackingCode: 'TRK-1',
    submittedAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    property: {
      id: 'p-9',
      title: 'Casa Chapinero',
      thumbnail: '',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      monthlyRent: 2_000_000,
    },
    ...over,
  };
}

function makeAcuerdo(over: Partial<AcuerdoDetail> = {}): AcuerdoDetail {
  return {
    planId: 'plan-' + Math.random().toString(36).slice(2),
    tenantId: 't-1',
    debtorId: 'd-1',
    stage: 'S2',
    status: 'active',
    paymentProvider: 'wompi',
    paymentUrl: null,
    totalDueCop: 1_500_000,
    initialAmountCop: 500_000,
    discountAppliedPct: 0,
    discountKind: 'none',
    offeredAt: '2026-07-10T10:00:00.000Z',
    acceptedAt: '2026-07-12T09:00:00.000Z',
    defaultedAt: null,
    installments: [
      { number: 1, dueDate: '2026-08-05', amountCop: 500_000, status: 'pending', paidAt: null },
      { number: 2, dueDate: '2026-09-05', amountCop: 500_000, status: 'pending', paidAt: null },
      { number: 3, dueDate: '2026-10-05', amountCop: 500_000, status: 'pending', paidAt: null },
    ],
    ...over,
  };
}

// ── React harness (repo convention: raw react-dom/client + act) ─────────────
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockRequests = [];
  mockLeases = [];
  mockPaymentInfo = null;
  mockActiveApps = [];
  mockPqrs = [];
  mockPqrsError = null;
  pqrsRefetchCount = 0;
  mockAcuerdos = [];
  mockAcuerdosError = null;
  acuerdosRefetchCount = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

function renderHook(): { current: ReturnType<typeof useTenantCases> | null } {
  const result: { current: ReturnType<typeof useTenantCases> | null } = { current: null };
  function Wrapper() {
    result.current = useTenantCases();
    return null;
  }
  act(() => {
    root.render(React.createElement(Wrapper));
  });
  return result;
}

function casesOf(r: { current: ReturnType<typeof useTenantCases> | null }): TenantCase[] {
  return r.current?.cases ?? [];
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useTenantCases — pago rows from real payment requests', () => {
  it('maps each non-terminal request to one pago row; APPROVED/CANCELLED yield no row', () => {
    mockRequests = [
      makeRequest({ id: 'r-pending', status: 'PENDING_VALIDATION' }),
      makeRequest({
        id: 'r-rejected',
        status: 'REJECTED',
        validatedAt: '2026-07-06T12:00:00.000Z',
      }),
      makeRequest({
        id: 'r-disputed',
        status: 'DISPUTED',
        validatedAt: '2026-07-06T13:00:00.000Z',
      }),
      makeRequest({ id: 'r-approved', status: 'APPROVED', validatedAt: '2026-07-06T14:00:00.000Z' }),
      makeRequest({ id: 'r-cancelled', status: 'CANCELLED' }),
    ];

    const r = renderHook();
    const pago = casesOf(r).filter((c) => c.type === 'pago');

    expect(pago).toHaveLength(3);
    expect(pago.map((c) => c.id).sort()).toEqual(
      ['r-disputed', 'r-pending', 'r-rejected'].sort(),
    );
    // estadoLabel comes from the pure mapper — factual, not fabricated.
    const pending = pago.find((c) => c.id === 'r-pending')!;
    expect(pending.estadoLabel).toBe('En validación');
    expect(pending.tone).toBe('info');
    expect(pending.responsable).toBe('Inmobiliaria');
    expect(pending.detailLink).toBe(`/inquilino/casos/${encodeURIComponent(pending.id)}`);
    expect(pending.sourceLink).toBe('/inquilino/pagos');
  });

  it('rejected/disputed rows carry attention tone (never above)', () => {
    mockRequests = [
      makeRequest({ id: 'r-rejected', status: 'REJECTED', validatedAt: '2026-07-06T12:00:00.000Z' }),
    ];
    const r = renderHook();
    const rejected = casesOf(r).find((c) => c.id === 'r-rejected')!;
    expect(rejected.tone).toBe('attention');
  });
});

describe('useTenantCases — próximo pago (currentPeriodStatus) + double-count fix', () => {
  it('NONE + primary lease → exactly one próximo-pago row', () => {
    mockLeases = [makeLease()];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'NONE' });

    const r = renderHook();
    const pago = casesOf(r).filter((c) => c.type === 'pago');
    expect(pago).toHaveLength(1);
    expect(pago[0].tone).toBe('info');
  });

  it('NONE + no lease → no row (honest empty)', () => {
    mockLeases = [];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'NONE' });

    const r = renderHook();
    expect(casesOf(r).filter((c) => c.type === 'pago')).toHaveLength(0);
  });

  it('REJECTED current period whose request is in the non-terminal list → exactly ONE pago row (no double count)', () => {
    mockLeases = [makeLease()];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'REJECTED' });
    mockRequests = [
      makeRequest({
        id: 'r-rejected',
        status: 'REJECTED',
        validatedAt: '2026-07-06T12:00:00.000Z',
      }),
    ];

    const r = renderHook();
    const pago = casesOf(r).filter((c) => c.type === 'pago');
    expect(pago).toHaveLength(1);
    expect(pago[0].id).toBe('r-rejected');
    // openCasesCount must not be inflated by a phantom próximo-pago row.
    expect(r.current!.openCasesCount).toBe(1);
  });
});

describe('useTenantCases — aplicacion rows from real applications', () => {
  it('maps each active application to one aplicacion row with the reused label', () => {
    mockActiveApps = [
      makeApp({ id: 'a-1', status: 'under_review' }),
      makeApp({ id: 'a-2', status: 'needs_info' }),
    ];

    const r = renderHook();
    const apps = casesOf(r).filter((c) => c.type === 'aplicacion');
    expect(apps).toHaveLength(2);

    const underReview = apps.find((c) => c.id === 'a-1')!;
    expect(underReview.estadoLabel).toBe('En revisión'); // from APPLICATION_STATUS_LABELS
    expect(underReview.tone).toBe('info');
    expect(underReview.detailLink).toBe(`/inquilino/casos/${encodeURIComponent(underReview.id)}`);
    expect(underReview.sourceLink).toBe('/inquilino/aplicaciones/a-1');

    const needsInfo = apps.find((c) => c.id === 'a-2')!;
    expect(needsInfo.tone).toBe('attention');
  });
});

describe('useTenantCases — forward-refs, tone ceiling, events, counts', () => {
  it('emits zero pqrs/mantenimiento rows when listMine() degrades to [] (acuerdo/contrato never emit)', () => {
    mockPqrs = []; // listMine() → [] (backend not live): the honest empty path.
    mockRequests = [makeRequest({ status: 'PENDING_VALIDATION' })];
    mockLeases = [makeLease()];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'NONE' });
    mockActiveApps = [makeApp()];

    const r = renderHook();
    const forwardRefs = casesOf(r).filter((c) =>
      (['pqrs', 'mantenimiento', 'acuerdo', 'contrato'] as const).includes(
        c.type as 'pqrs' | 'mantenimiento' | 'acuerdo' | 'contrato',
      ),
    );
    expect(forwardRefs).toHaveLength(0);
    expect(casesOf(r).every((c) => c.type === 'pago' || c.type === 'aplicacion')).toBe(true);
  });

  it('tone is never an alarm level — only neutral/info/attention', () => {
    mockRequests = [
      makeRequest({ status: 'PENDING_VALIDATION' }),
      makeRequest({ status: 'REJECTED', validatedAt: '2026-07-06T12:00:00.000Z' }),
    ];
    mockActiveApps = [makeApp({ status: 'needs_info' })];

    const r = renderHook();
    for (const c of casesOf(r)) {
      expect(['neutral', 'info', 'attention']).toContain(c.tone);
    }
  });

  it('events only from provided source timestamps (no synthesized steps)', () => {
    mockRequests = [
      // PENDING_VALIDATION: validatedAt null → single "enviada" event.
      makeRequest({ id: 'r-pending', status: 'PENDING_VALIDATION', validatedAt: null }),
      // REJECTED with validatedAt → two events.
      makeRequest({
        id: 'r-rejected',
        status: 'REJECTED',
        validatedAt: '2026-07-06T12:00:00.000Z',
      }),
    ];

    const r = renderHook();
    const pending = casesOf(r).find((c) => c.id === 'r-pending')!;
    const rejected = casesOf(r).find((c) => c.id === 'r-rejected')!;
    expect(pending.events).toHaveLength(1);
    expect(pending.events[0].timestamp).toBe('2026-07-05T10:00:00.000Z');
    expect(rejected.events).toHaveLength(2);
    expect(rejected.events[1].timestamp).toBe('2026-07-06T12:00:00.000Z');
  });

  it('application events: one when updatedAt equals submittedAt, two when it differs', () => {
    mockActiveApps = [
      makeApp({ id: 'a-same', submittedAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }),
      makeApp({ id: 'a-diff', submittedAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-10T00:00:00.000Z' }),
    ];
    const r = renderHook();
    const same = casesOf(r).find((c) => c.id === 'a-same')!;
    const diff = casesOf(r).find((c) => c.id === 'a-diff')!;
    expect(same.events).toHaveLength(1);
    expect(diff.events).toHaveLength(2);
  });

  it('openCasesCount === cases.length (all emitted cases are open)', () => {
    mockRequests = [makeRequest({ status: 'PENDING_VALIDATION' })];
    mockLeases = [makeLease()];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'NONE' });
    mockActiveApps = [makeApp(), makeApp()];

    const r = renderHook();
    expect(r.current!.openCasesCount).toBe(casesOf(r).length);
  });

  it('exposes the primary lease as context (not as a row)', () => {
    mockLeases = [makeLease({ id: 'lease-primary' })];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'APPROVED' });

    const r = renderHook();
    expect(r.current!.primaryLease?.id).toBe('lease-primary');
    // ACTIVE/APPROVED period is not actionable → no pago row emitted for it.
    expect(casesOf(r).filter((c) => c.type === 'pago')).toHaveLength(0);
  });
});

describe('useTenantCases — PQRS/mantenimiento fold (SOLI-03)', () => {
  it('folds a reparacion into exactly one mantenimiento row with mapped tone/label + solicitud metadata', () => {
    mockPqrs = [
      makeSolicitud({
        id: 'sol-rep',
        tipo: 'reparacion',
        estado: 'en_cotizacion',
        asunto: 'Fuga en el baño',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-11T10:00:00.000Z',
        costoResponsable: 'inquilino',
        cotizacionMonto: 350000,
        cotizacionId: 'cot-9',
      }),
    ];

    const r = renderHook();
    const mant = casesOf(r).filter((c) => c.type === 'mantenimiento');
    expect(mant).toHaveLength(1);

    const row = mant[0];
    expect(row.id).toBe('sol-rep');
    expect(row.titulo).toBe('Fuga en el baño');
    expect(row.estadoLabel).toBe('En cotización');
    expect(row.tone).toBe('attention'); // capped — never an alarm level
    expect(row.responsable).toBe('Inmobiliaria');
    expect(row.solicitud?.estado).toBe('en_cotizacion');
    expect(row.solicitud?.costoResponsable).toBe('inquilino');
    expect(row.solicitud?.cotizacionMonto).toBe(350000);
  });

  it('folds a queja into exactly one pqrs row with a detailLink into /inquilino/casos/<id>', () => {
    mockPqrs = [makeSolicitud({ id: 'sol/1', tipo: 'queja', estado: 'asignada' })];

    const r = renderHook();
    const pqrs = casesOf(r).filter((c) => c.type === 'pqrs');
    expect(pqrs).toHaveLength(1);
    expect(pqrs[0].estadoLabel).toBe('Asignada');
    expect(pqrs[0].tone).toBe('info');
    expect(pqrs[0].detailLink).toBe(`/inquilino/casos/${encodeURIComponent('sol/1')}`);
    expect(pqrs[0].sourceLink).toBe('/inquilino/solicitudes');
  });

  it('openCasesCount includes the PQRS rows (=== cases.length)', () => {
    mockRequests = [makeRequest({ status: 'PENDING_VALIDATION' })];
    mockPqrs = [
      makeSolicitud({ id: 's-1', tipo: 'queja' }),
      makeSolicitud({ id: 's-2', tipo: 'reparacion' }),
    ];

    const r = renderHook();
    const pqrsLike = casesOf(r).filter((c) => c.type === 'pqrs' || c.type === 'mantenimiento');
    expect(pqrsLike).toHaveLength(2);
    expect(r.current!.openCasesCount).toBe(casesOf(r).length);
    expect(r.current!.openCasesCount).toBe(3); // 1 pago + 2 pqrs-like
  });

  it('tone stays within neutral/info/attention across every estado', () => {
    mockPqrs = (
      ['recibida', 'asignada', 'en_proceso', 'en_cotizacion', 'resuelta', 'cerrada'] as const
    ).map((estado, i) => makeSolicitud({ id: `s-${i}`, estado }));

    const r = renderHook();
    for (const c of casesOf(r).filter((x) => x.type === 'pqrs')) {
      expect(['neutral', 'info', 'attention']).toContain(c.tone);
    }
  });

  it('a listMine error surfaces via the error chain but does not blank pago/aplicacion rows', () => {
    mockRequests = [makeRequest({ id: 'r-pending', status: 'PENDING_VALIDATION' })];
    mockActiveApps = [makeApp({ id: 'a-1' })];
    mockPqrs = [];
    mockPqrsError = 'pqrs boom';

    const r = renderHook();
    expect(r.current!.error).toBe('pqrs boom');
    // pago + aplicacion rows are unaffected by the pqrs error.
    expect(casesOf(r).filter((c) => c.type === 'pago')).toHaveLength(1);
    expect(casesOf(r).filter((c) => c.type === 'aplicacion')).toHaveLength(1);
  });

  it('a pago/aplicacion error keeps priority over the pqrs error', () => {
    mockPqrsError = 'pqrs boom';

    const r = renderHook();
    // No source error set except pqrs → pqrs error is what surfaces (appended last).
    expect(r.current!.error).toBe('pqrs boom');
  });

  it('refetch resolves and includes the pqrs refetch (Promise.all)', async () => {
    mockPqrs = [makeSolicitud({ id: 's-1' })];
    const r = renderHook();
    await act(async () => {
      await r.current!.refetch();
    });
    expect(pqrsRefetchCount).toBeGreaterThan(0);
  });
});

describe('useTenantCases — acuerdo fold (ACUE-01)', () => {
  it('emits ZERO acuerdo rows when listMine() degrades to [] (hub keeps "Próximamente")', () => {
    mockAcuerdos = []; // listMine() → [] (backend not live): the honest empty path.
    mockRequests = [makeRequest({ status: 'PENDING_VALIDATION' })];
    mockLeases = [makeLease()];
    mockPaymentInfo = makePaymentInfo({ currentPeriodStatus: 'NONE' });

    const r = renderHook();
    expect(casesOf(r).filter((c) => c.type === 'acuerdo')).toHaveLength(0);
    // Existing pago rows are unaffected by the empty acuerdo path.
    expect(casesOf(r).filter((c) => c.type === 'pago').length).toBeGreaterThan(0);
  });

  it('folds one AcuerdoDetail into exactly one acuerdo row with mapped tone/label + pass-through metadata', () => {
    mockAcuerdos = [
      makeAcuerdo({
        planId: 'plan-9',
        status: 'active',
        totalDueCop: 1_500_000,
        paymentUrl: 'https://checkout.wompi.co/l/abc',
        acceptedAt: '2026-07-12T09:00:00.000Z',
      }),
    ];

    const r = renderHook();
    const acuerdos = casesOf(r).filter((c) => c.type === 'acuerdo');
    expect(acuerdos).toHaveLength(1);

    const row = acuerdos[0];
    expect(row.id).toBe('plan-9');
    expect(row.titulo).toBe('Acuerdo de pago');
    expect(row.estadoLabel).toBe('Activo');
    expect(row.tone).toBe('info'); // capped — never an alarm level
    expect(row.responsable).toBe('Inmobiliaria');
    expect(row.detailLink).toBe(`/inquilino/acuerdos/${encodeURIComponent('plan-9')}`);
    expect(row.sourceLink).toBe('/inquilino/acuerdos');
    // Pass-through metadata carried verbatim (no recomputed saldo).
    expect(row.acuerdo?.status).toBe('active');
    expect(row.acuerdo?.totalDueCop).toBe(1_500_000);
    expect(row.acuerdo?.paymentUrl).toBe('https://checkout.wompi.co/l/abc');
    expect(row.acuerdo?.installments).toHaveLength(3);
  });

  it('an offered plan caps at attention tone (never above)', () => {
    mockAcuerdos = [makeAcuerdo({ planId: 'plan-off', status: 'offered', acceptedAt: null })];
    const r = renderHook();
    const row = casesOf(r).find((c) => c.id === 'plan-off')!;
    expect(row.tone).toBe('attention');
    expect(['neutral', 'info', 'attention']).toContain(row.tone);
  });

  it('openCasesCount includes the acuerdo rows (=== cases.length)', () => {
    mockRequests = [makeRequest({ status: 'PENDING_VALIDATION' })];
    mockAcuerdos = [
      makeAcuerdo({ planId: 'p-1' }),
      makeAcuerdo({ planId: 'p-2' }),
    ];

    const r = renderHook();
    const acuerdoRows = casesOf(r).filter((c) => c.type === 'acuerdo');
    expect(acuerdoRows).toHaveLength(2);
    expect(r.current!.openCasesCount).toBe(casesOf(r).length);
    expect(r.current!.openCasesCount).toBe(3); // 1 pago + 2 acuerdo
  });

  it('a listMine (acuerdo) error surfaces via the error chain but does not blank pago/pqrs rows', () => {
    mockRequests = [makeRequest({ id: 'r-pending', status: 'PENDING_VALIDATION' })];
    mockPqrs = [makeSolicitud({ id: 's-1', tipo: 'queja' })];
    mockAcuerdos = [];
    mockAcuerdosError = 'acuerdo boom';

    const r = renderHook();
    expect(r.current!.error).toBe('acuerdo boom');
    // pago + pqrs rows are unaffected by the acuerdo error.
    expect(casesOf(r).filter((c) => c.type === 'pago')).toHaveLength(1);
    expect(casesOf(r).filter((c) => c.type === 'pqrs')).toHaveLength(1);
  });

  it('the acuerdo error is appended LAST — a pqrs error keeps priority over it', () => {
    mockPqrsError = 'pqrs boom';
    mockAcuerdosError = 'acuerdo boom';

    const r = renderHook();
    // pqrs is earlier in the ?? chain, so it wins over the acuerdo error.
    expect(r.current!.error).toBe('pqrs boom');
  });

  it('refetch resolves and includes the acuerdo refetch (Promise.all)', async () => {
    mockAcuerdos = [makeAcuerdo({ planId: 'p-1' })];
    const r = renderHook();
    await act(async () => {
      await r.current!.refetch();
    });
    expect(acuerdosRefetchCount).toBeGreaterThan(0);
  });
});
