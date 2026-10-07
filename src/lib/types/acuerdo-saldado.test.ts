/**
 * QA-INQ-95 (04-10-2026) · El acuerdo de Iván seguía «Activo» con dos cuotas por
 * $2.823.334 cuando él ya no debía nada vencido: «Casos» lo contaba abierto y el
 * portal ofrecía pagar sus cuotas. El back marca `deudaSaldada`.
 */
import { describe, it, expect } from 'vitest';

import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';
import {
  acuerdoNoSeCobra,
  acuerdoToCase,
  casoAbierto,
  etiquetaDelAcuerdo,
  tonoDelAcuerdo,
} from './tenant-case';

const PLAN: AcuerdoDetail = {
  planId: 'dfa80dbc-0169-4e36-8b21-7707c34d04ee',
  tenantId: 'agencia',
  debtorId: 'deudor',
  stage: 'S2',
  status: 'active',
  paymentProvider: 'wompi',
  paymentUrl: null,
  totalDueCop: 6_050_000,
  initialAmountCop: 1_815_000,
  discountAppliedPct: 0,
  discountKind: 'none',
  offeredAt: '2026-10-03T10:18:43.828Z',
  acceptedAt: '2026-10-03T10:21:55.454Z',
  defaultedAt: null,
  installments: [
    { number: 1, dueDate: '2026-11-03', amountCop: 1_411_666, status: 'paid', paidAt: '2026-10-03T10:29:11.599Z' },
    { number: 2, dueDate: '2026-12-03', amountCop: 1_411_666, status: 'pending', paidAt: null },
    { number: 3, dueDate: '2027-01-03', amountCop: 1_411_668, status: 'pending', paidAt: null },
  ],
};

describe('acuerdo con la deuda saldada', () => {
  it('no se cobra, se lee «Saldado» y el caso queda cerrado', () => {
    const saldado = { ...PLAN, deudaSaldada: true };
    expect(acuerdoNoSeCobra(saldado)).toBe(true);
    expect(etiquetaDelAcuerdo(saldado)).toBe('Saldado');
    expect(tonoDelAcuerdo(saldado)).toBe('neutral');
    const caso = acuerdoToCase(saldado);
    expect(caso.estadoLabel).toBe('Saldado');
    expect(casoAbierto(caso)).toBe(false);
  });

  it('sin la marca (o en false) es el acuerdo de siempre', () => {
    for (const p of [PLAN, { ...PLAN, deudaSaldada: false }]) {
      expect(acuerdoNoSeCobra(p)).toBe(false);
      expect(etiquetaDelAcuerdo(p)).toBe('Activo');
      expect(casoAbierto(acuerdoToCase(p))).toBe(true);
    }
  });

  it('un acuerdo cerrado no se cobra aunque el back no mande la marca', () => {
    expect(acuerdoNoSeCobra({ ...PLAN, status: 'completed' })).toBe(true);
    expect(acuerdoNoSeCobra({ ...PLAN, status: 'defaulted' })).toBe(true);
  });
});
