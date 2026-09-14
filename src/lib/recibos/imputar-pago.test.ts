/**
 * La previsualización de la imputación, con los MISMOS casos que el back.
 *
 * Es una copia deliberada de una regla que vive del otro lado (ver el
 * encabezado de `imputar-pago.ts`), así que las pruebas son las mismas a
 * propósito: el día que las dos dejen de coincidir, uno de los dos archivos
 * está mal y esto lo dice.
 */

import { describe, it, expect } from 'vitest';

import {
  deudasDeLaCartera,
  imputarPago,
  interesesPendientes,
  ordenarPorAntiguedad,
  type DeudaImputable,
} from './imputar-pago';
import type { CobroEnCartera } from '@/lib/api/recibos-de-caja.types';

function deuda(id: string, month: string, pendiente: number, extra: Partial<DeudaImputable> = {}) {
  return { id, month, pendiente, ...extra };
}

describe('imputarPago — a la deuda más vieja primero', () => {
  it('🔴 «Nico me debe 3 meses y entró 1 millón»: va al mes más viejo', () => {
    const plan = imputarPago(
      [
        deuda('c-ago', '2026-08', 1_000_000),
        deuda('c-jun', '2026-06', 1_000_000),
        deuda('c-jul', '2026-07', 1_000_000),
      ],
      1_000_000,
    );

    expect(plan.partes).toHaveLength(1);
    expect(plan.partes[0]).toMatchObject({ id: 'c-jun', month: '2026-06', valorCop: 1_000_000 });
    expect(plan.deudaRestante).toBe(2_000_000);
  });

  it('un pago parcial deja el más viejo a medias y los demás intactos', () => {
    const plan = imputarPago(
      [deuda('c-jun', '2026-06', 1_000_000), deuda('c-jul', '2026-07', 1_000_000)],
      400_000,
    );

    expect(plan.partes).toEqual([
      { id: 'c-jun', month: '2026-06', valorCop: 400_000, quedaPendiente: 600_000, aIntereses: 0, aCapital: 400_000 },
    ]);
    expect(plan.deudaRestante).toBe(1_600_000);
  });

  it('cubre el viejo entero y sigue con el siguiente', () => {
    const plan = imputarPago(
      [deuda('c-jun', '2026-06', 1_000_000), deuda('c-jul', '2026-07', 1_000_000)],
      1_500_000,
    );

    expect(plan.partes.map((p) => [p.id, p.valorCop])).toEqual([
      ['c-jun', 1_000_000],
      ['c-jul', 500_000],
    ]);
    expect(plan.sobrante).toBe(0);
  });

  it('un pago mayor que toda la deuda dice cuánto sobra', () => {
    const plan = imputarPago([deuda('c-jun', '2026-06', 300_000)], 500_000);
    expect(plan.sobrante).toBe(200_000);
    expect(plan.deudaRestante).toBe(0);
  });

  it('ignora los períodos sin saldo aunque sean los más viejos', () => {
    const plan = imputarPago(
      [deuda('c-may', '2026-05', 0), deuda('c-jun', '2026-06', 200_000)],
      100_000,
    );
    expect(plan.partes.map((p) => p.id)).toEqual(['c-jun']);
    expect(plan.deudaTotal).toBe(200_000);
  });

  it('dos inmuebles con el mismo mes: primero el que vence antes', () => {
    const plan = imputarPago(
      [
        deuda('c-b', '2026-06', 100_000, { dueDate: '2026-06-15' }),
        deuda('c-a', '2026-06', 100_000, { dueDate: '2026-06-05' }),
      ],
      100_000,
    );
    expect(plan.partes[0].id).toBe('c-a');
  });

  it('un monto a medio escribir no rompe la pantalla: plan vacío', () => {
    for (const monto of [0, -1, 1.5, Number.NaN]) {
      const plan = imputarPago([deuda('c-jun', '2026-06', 100_000)], monto);
      expect(plan.partes).toEqual([]);
      expect(plan.deudaRestante).toBe(100_000);
    }
  });
});

describe('dentro del período, primero los intereses (art. 1653)', () => {
  it('el pago cubre primero la mora', () => {
    const plan = imputarPago(
      [deuda('c-jun', '2026-06', 1_120_000, { interesesDeMora: 120_000 })],
      200_000,
    );
    expect(plan.partes[0]).toMatchObject({ aIntereses: 120_000, aCapital: 80_000 });
  });

  it('si un abono anterior ya cubrió la mora, lo que entra ahora es capital', () => {
    const plan = imputarPago(
      [deuda('c-jun', '2026-06', 900_000, { interesesDeMora: 120_000, yaAbonado: 220_000 })],
      100_000,
    );
    expect(plan.partes[0]).toMatchObject({ aIntereses: 0, aCapital: 100_000 });
  });

  it('un pago menor que la mora se va entero a intereses', () => {
    const plan = imputarPago(
      [deuda('c-jun', '2026-06', 1_120_000, { interesesDeMora: 120_000 })],
      50_000,
    );
    expect(plan.partes[0]).toMatchObject({ aIntereses: 50_000, aCapital: 0 });
  });

  it('los intereses pendientes nunca pasan de lo pendiente ni bajan de cero', () => {
    expect(interesesPendientes(deuda('x', '2026-06', 10_000, { interesesDeMora: 90_000 }))).toBe(10_000);
    expect(
      interesesPendientes(deuda('x', '2026-06', 10_000, { interesesDeMora: 5_000, yaAbonado: 9_000 })),
    ).toBe(0);
  });
});

describe('ordenarPorAntiguedad', () => {
  it('no muta la lista que recibe', () => {
    const lista = [deuda('b', '2026-07', 1), deuda('a', '2026-06', 1)];
    ordenarPorAntiguedad(lista);
    expect(lista.map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('deudasDeLaCartera', () => {
  it('traduce el cobro del back a lo que la regla necesita', () => {
    const cobro = {
      id: 'c1',
      month: '2026-06',
      dueDate: '2026-06-05T00:00:00.000Z',
      createdAt: '2026-06-01T00:00:00.000Z',
      consignacionId: 'm1',
      contractId: null,
      leaseId: null,
      propertyTitle: 'Apto 101',
      tenantName: 'Juan',
      totalWithFees: 1_120_000,
      paidAmount: 20_000,
      pendingAmount: 1_100_000,
      status: 'PENDING',
      daysLate: 12,
      lateFee: 120_000,
      sinRespaldo: 0,
      conceptos: [],
    } satisfies CobroEnCartera;

    expect(deudasDeLaCartera([cobro])).toEqual([
      {
        id: 'c1',
        month: '2026-06',
        dueDate: '2026-06-05T00:00:00.000Z',
        createdAt: '2026-06-01T00:00:00.000Z',
        pendiente: 1_100_000,
        interesesDeMora: 120_000,
        yaAbonado: 20_000,
      },
    ]);
  });
});
