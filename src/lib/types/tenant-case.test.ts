/**
 * tenant-case.test.ts — v7-06-02 (SOLI-02) Task 1 TDD spec.
 *
 * Proves the pure PQRS→case mappers added to `tenant-case.ts`:
 *   - pqrsStatusToTone: total over the 6-member PqrsEstado; capped at 'attention'
 *     (en_cotizacion); tone ∈ {neutral,info,attention} — never an alarm level.
 *   - pqrsStatusToLabel: a factual es-CO label for every estado.
 *   - pqrsToCase: pure PROJECTION — normalizes estado/timestamps, PASSES THROUGH
 *     the raw SLA/cost metadata (no SLA math), builds events from source
 *     timestamps only, maps reparacion→'mantenimiento' / everything else→'pqrs'.
 */

import { describe, it, expect } from 'vitest';

import type { PqrsEstado, SolicitudPqrs } from '@/lib/api/pqrs.types';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';
import {
  pqrsStatusToTone,
  pqrsStatusToLabel,
  pqrsToCase,
  acuerdoStatusToTone,
  acuerdoStatusToLabel,
  acuerdoToCase,
  type CaseTone,
} from './tenant-case';

const ALL_ESTADOS: PqrsEstado[] = [
  'recibida',
  'asignada',
  'en_proceso',
  'en_cotizacion',
  'resuelta',
  'cerrada',
];

function makeSolicitud(over: Partial<SolicitudPqrs> = {}): SolicitudPqrs {
  return {
    id: 'sol-1',
    radicado: 'PQRS-2026-0001',
    tipo: 'queja',
    estado: 'recibida',
    prioridad: 'media',
    canal: 'web',
    asunto: 'Fuga en el baño',
    descripcion: 'Hay una fuga bajo el lavamanos.',
    solicitanteNombre: 'Ana',
    solicitanteTipo: 'inquilino',
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
    ...over,
  };
}

// ── pqrsStatusToTone ─────────────────────────────────────────────────────────

describe('pqrsStatusToTone', () => {
  it('maps in-flight estados to info', () => {
    expect(pqrsStatusToTone('recibida')).toBe('info');
    expect(pqrsStatusToTone('asignada')).toBe('info');
    expect(pqrsStatusToTone('en_proceso')).toBe('info');
  });

  it('caps en_cotizacion at attention (tenant action may be needed)', () => {
    expect(pqrsStatusToTone('en_cotizacion')).toBe('attention');
  });

  it('settles terminal estados to neutral', () => {
    expect(pqrsStatusToTone('resuelta')).toBe('neutral');
    expect(pqrsStatusToTone('cerrada')).toBe('neutral');
  });

  it('is total over the enum and NEVER returns an alarm level', () => {
    const allowed: CaseTone[] = ['neutral', 'info', 'attention'];
    for (const e of ALL_ESTADOS) {
      expect(allowed).toContain(pqrsStatusToTone(e));
    }
  });
});

// ── pqrsStatusToLabel ────────────────────────────────────────────────────────

describe('pqrsStatusToLabel', () => {
  it('returns a factual es-CO label for every estado', () => {
    expect(pqrsStatusToLabel('recibida')).toBe('Recibida');
    expect(pqrsStatusToLabel('asignada')).toBe('Asignada');
    expect(pqrsStatusToLabel('en_proceso')).toBe('En proceso');
    expect(pqrsStatusToLabel('en_cotizacion')).toBe('En cotización');
    expect(pqrsStatusToLabel('resuelta')).toBe('Resuelta');
    expect(pqrsStatusToLabel('cerrada')).toBe('Cerrada');
  });

  it('produces a non-empty label for every enum member (no missing case)', () => {
    for (const e of ALL_ESTADOS) {
      expect(pqrsStatusToLabel(e).length).toBeGreaterThan(0);
    }
  });
});

// ── pqrsToCase ───────────────────────────────────────────────────────────────

describe('pqrsToCase — type mapping', () => {
  it('maps tipo reparacion to a mantenimiento case', () => {
    expect(pqrsToCase(makeSolicitud({ tipo: 'reparacion' })).type).toBe('mantenimiento');
  });

  it('maps every other tipo to a pqrs case', () => {
    for (const tipo of ['peticion', 'queja', 'reclamo', 'sugerencia', 'solicitud'] as const) {
      expect(pqrsToCase(makeSolicitud({ tipo })).type).toBe('pqrs');
    }
  });
});

describe('pqrsToCase — projected fields', () => {
  it('projects titulo/estado/tone/responsable/updatedAt/links from the source', () => {
    const s = makeSolicitud({
      id: 'a b/c',
      asunto: 'Ruido excesivo',
      estado: 'asignada',
      updatedAt: '2026-07-12T09:00:00.000Z',
    });
    const c = pqrsToCase(s);
    expect(c.id).toBe('a b/c');
    expect(c.titulo).toBe('Ruido excesivo');
    expect(c.estadoLabel).toBe('Asignada');
    expect(c.tone).toBe('info');
    expect(c.responsable).toBe('Inmobiliaria');
    expect(c.updatedAt).toBe('2026-07-12T09:00:00.000Z');
    expect(c.detailLink).toBe(`/inquilino/casos/${encodeURIComponent('a b/c')}`);
    expect(c.sourceLink).toBe('/inquilino/solicitudes');
  });
});

describe('pqrsToCase — events from source timestamps only', () => {
  it('emits a single Recibida event when nothing else has happened', () => {
    const c = pqrsToCase(makeSolicitud({ estado: 'recibida' }));
    expect(c.events).toHaveLength(1);
    expect(c.events[0].label).toBe('Recibida');
    expect(c.events[0].timestamp).toBe('2026-07-10T10:00:00.000Z');
  });

  it('adds En cotización only when estado is en_cotizacion AND updatedAt moved', () => {
    const moved = pqrsToCase(
      makeSolicitud({
        estado: 'en_cotizacion',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-11T10:00:00.000Z',
      }),
    );
    expect(moved.events).toHaveLength(2);
    expect(moved.events[1].label).toBe('En cotización');
    expect(moved.events[1].timestamp).toBe('2026-07-11T10:00:00.000Z');
  });

  it('does NOT add En cotización when updatedAt equals createdAt', () => {
    const same = pqrsToCase(
      makeSolicitud({
        estado: 'en_cotizacion',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      }),
    );
    expect(same.events).toHaveLength(1);
    expect(same.events.every((e) => e.label !== 'En cotización')).toBe(true);
  });

  it('appends Resuelta when resueltaAt is present', () => {
    const c = pqrsToCase(
      makeSolicitud({
        estado: 'resuelta',
        resueltaAt: '2026-07-15T18:00:00.000Z',
      }),
    );
    const resuelta = c.events.find((e) => e.label === 'Resuelta');
    expect(resuelta).toBeDefined();
    expect(resuelta!.timestamp).toBe('2026-07-15T18:00:00.000Z');
  });

  it('does not synthesize milestones from absent timestamps', () => {
    const c = pqrsToCase(makeSolicitud({ estado: 'en_proceso' }));
    // Only Recibida — no padded "asignada"/"en proceso" steps invented.
    expect(c.events).toHaveLength(1);
  });
});

describe('pqrsToCase — solicitud metadata pass-through (no SLA math)', () => {
  it('carries the raw estado/timestamps/cost/quote fields verbatim', () => {
    const s = makeSolicitud({
      estado: 'en_cotizacion',
      createdAt: '2026-07-10T10:00:00.000Z',
      slaVenceAt: '2026-07-31T10:00:00.000Z',
      costoResponsable: 'inquilino',
      cotizacionMonto: 350000,
      cotizacionId: 'cot-9',
      cotizacionAprobadaAt: '2026-07-20T10:00:00.000Z',
    });
    const c = pqrsToCase(s);
    expect(c.solicitud).toEqual({
      estado: 'en_cotizacion',
      createdAt: '2026-07-10T10:00:00.000Z',
      slaVenceAt: '2026-07-31T10:00:00.000Z',
      costoResponsable: 'inquilino',
      cotizacionMonto: 350000,
      cotizacionId: 'cot-9',
      cotizacionAprobadaAt: '2026-07-20T10:00:00.000Z',
    });
  });

  it('omits the optional cost/quote fields when absent (no invented SLA)', () => {
    const c = pqrsToCase(makeSolicitud({ estado: 'recibida' }));
    expect(c.solicitud).toBeDefined();
    expect(c.solicitud!.estado).toBe('recibida');
    expect(c.solicitud!.createdAt).toBe('2026-07-10T10:00:00.000Z');
    expect(c.solicitud!.slaVenceAt).toBeUndefined();
    expect(c.solicitud!.costoResponsable).toBeUndefined();
    expect(c.solicitud!.cotizacionMonto).toBeUndefined();
  });
});

// ── acuerdo fixtures (v7-07, ACUE-01) ────────────────────────────────────────

function makeAcuerdo(over: Partial<AcuerdoDetail> = {}): AcuerdoDetail {
  return {
    planId: 'plan-1',
    tenantId: 't-1',
    debtorId: 'd-1',
    stage: 'S2',
    status: 'offered',
    paymentProvider: 'wompi',
    paymentUrl: null,
    totalDueCop: 1_500_000,
    initialAmountCop: 500_000,
    discountAppliedPct: 0,
    discountKind: 'none',
    offeredAt: '2026-07-10T10:00:00.000Z',
    acceptedAt: null,
    defaultedAt: null,
    installments: [
      { number: 1, dueDate: '2026-08-05', amountCop: 500_000, status: 'pending', paidAt: null },
      { number: 2, dueDate: '2026-09-05', amountCop: 500_000, status: 'pending', paidAt: null },
      { number: 3, dueDate: '2026-10-05', amountCop: 500_000, status: 'pending', paidAt: null },
    ],
    ...over,
  };
}

// ── acuerdoStatusToTone ──────────────────────────────────────────────────────

describe('acuerdoStatusToTone', () => {
  it('caps offered at attention (tenant may need to accept the plan)', () => {
    expect(acuerdoStatusToTone('offered')).toBe('attention');
  });

  it('maps active to info', () => {
    expect(acuerdoStatusToTone('active')).toBe('info');
  });

  it('settles completed/cancelled to neutral', () => {
    expect(acuerdoStatusToTone('completed')).toBe('neutral');
    expect(acuerdoStatusToTone('cancelled')).toBe('neutral');
  });

  it('degrades an unknown status to info (total, safe default)', () => {
    expect(acuerdoStatusToTone('some_future_status')).toBe('info');
    expect(acuerdoStatusToTone('')).toBe('info');
  });

  it('NEVER returns an alarm level — tone stays within neutral/info/attention', () => {
    const allowed: CaseTone[] = ['neutral', 'info', 'attention'];
    for (const status of ['offered', 'active', 'completed', 'cancelled', 'defaulted', 'weird', '']) {
      expect(allowed).toContain(acuerdoStatusToTone(status));
    }
  });
});

// ── acuerdoStatusToLabel ─────────────────────────────────────────────────────

describe('acuerdoStatusToLabel', () => {
  it('returns a factual es-CO label for every known status', () => {
    expect(acuerdoStatusToLabel('offered')).toBe('Propuesto');
    expect(acuerdoStatusToLabel('active')).toBe('Activo');
    expect(acuerdoStatusToLabel('completed')).toBe('Completado');
    expect(acuerdoStatusToLabel('cancelled')).toBe('Cancelado');
  });

  it('produces a safe non-empty generic label for an unknown status', () => {
    expect(acuerdoStatusToLabel('mystery').length).toBeGreaterThan(0);
    expect(acuerdoStatusToLabel('')).toBe('Acuerdo de pago');
  });
});

// ── acuerdoToCase ────────────────────────────────────────────────────────────

describe('acuerdoToCase — projected fields', () => {
  it('projects id/type/titulo/estado/tone/responsable/updatedAt/links from the plan', () => {
    const p = makeAcuerdo({ planId: 'plan a/b', status: 'active', acceptedAt: '2026-07-12T09:00:00.000Z' });
    const c = acuerdoToCase(p);
    expect(c.id).toBe('plan a/b');
    expect(c.type).toBe('acuerdo');
    expect(c.titulo).toBe('Acuerdo de pago');
    expect(c.estadoLabel).toBe('Activo');
    expect(c.tone).toBe('info');
    expect(c.responsable).toBe('Inmobiliaria');
    // updatedAt = acceptedAt when present.
    expect(c.updatedAt).toBe('2026-07-12T09:00:00.000Z');
    expect(c.detailLink).toBe(`/inquilino/acuerdos/${encodeURIComponent('plan a/b')}`);
    expect(c.sourceLink).toBe('/inquilino/acuerdos');
  });

  it('updatedAt falls back to offeredAt when acceptedAt is absent', () => {
    const c = acuerdoToCase(makeAcuerdo({ acceptedAt: null, offeredAt: '2026-07-01T00:00:00.000Z' }));
    expect(c.updatedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('detailLink points at the dedicated interactive acuerdo detail (not the casos hub)', () => {
    const c = acuerdoToCase(makeAcuerdo({ planId: 'p-9' }));
    expect(c.detailLink).toBe('/inquilino/acuerdos/p-9');
  });
});

describe('acuerdoToCase — events from source timestamps only', () => {
  it('emits a single Propuesto event when the plan has not been accepted', () => {
    const c = acuerdoToCase(makeAcuerdo({ status: 'offered', acceptedAt: null }));
    expect(c.events).toHaveLength(1);
    expect(c.events[0].label).toBe('Propuesto');
    expect(c.events[0].timestamp).toBe('2026-07-10T10:00:00.000Z');
  });

  it('appends Aceptado only when acceptedAt is present', () => {
    const c = acuerdoToCase(
      makeAcuerdo({ status: 'active', acceptedAt: '2026-07-12T09:00:00.000Z' }),
    );
    expect(c.events).toHaveLength(2);
    expect(c.events[1].label).toBe('Aceptado');
    expect(c.events[1].timestamp).toBe('2026-07-12T09:00:00.000Z');
  });

  it('does not synthesize milestones from absent timestamps', () => {
    const c = acuerdoToCase(makeAcuerdo({ acceptedAt: null }));
    expect(c.events).toHaveLength(1);
  });
});

describe('acuerdoToCase — pass-through metadata (no saldo compute, PITFALLS 9)', () => {
  it('carries status/totalDueCop/paymentUrl/acceptedAt verbatim', () => {
    const p = makeAcuerdo({
      status: 'active',
      totalDueCop: 1_500_000,
      paymentUrl: 'https://checkout.wompi.co/l/abc',
      acceptedAt: '2026-07-12T09:00:00.000Z',
    });
    const c = acuerdoToCase(p);
    expect(c.acuerdo).toBeDefined();
    expect(c.acuerdo!.status).toBe('active');
    expect(c.acuerdo!.totalDueCop).toBe(1_500_000);
    expect(c.acuerdo!.paymentUrl).toBe('https://checkout.wompi.co/l/abc');
    expect(c.acuerdo!.acceptedAt).toBe('2026-07-12T09:00:00.000Z');
  });

  it('passes installments through BY REFERENCE (no derived saldo field)', () => {
    const p = makeAcuerdo();
    const c = acuerdoToCase(p);
    // Same array reference — no copy, no reduce/sum over cuota amounts.
    expect(c.acuerdo!.installments).toBe(p.installments);
    expect(c.acuerdo!.installments).toHaveLength(3);
    // The projection carries no computed saldo/restante field.
    expect(c.acuerdo).not.toHaveProperty('saldo');
    expect(c.acuerdo).not.toHaveProperty('restante');
    expect(c).not.toHaveProperty('saldo');
  });

  it('renders totalDueCop verbatim (not the sum of installments)', () => {
    // totalDueCop deliberately differs from Σ installments — the record wins.
    const p = makeAcuerdo({
      totalDueCop: 999_999,
      installments: [
        { number: 1, dueDate: '2026-08-05', amountCop: 100, status: 'pending', paidAt: null },
      ],
    });
    const c = acuerdoToCase(p);
    expect(c.acuerdo!.totalDueCop).toBe(999_999);
  });
});
