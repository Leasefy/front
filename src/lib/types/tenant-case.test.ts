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
import {
  pqrsStatusToTone,
  pqrsStatusToLabel,
  pqrsToCase,
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
