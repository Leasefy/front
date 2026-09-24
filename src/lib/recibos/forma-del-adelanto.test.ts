import { describe, expect, it } from 'vitest';

import type { CarteraDelCliente, PeriodoEnDeuda } from '@/lib/api/recibos-de-caja.types';
import { deudasDeLaCartera, imputarPago } from './imputar-pago';
import {
  esAdelantableComoAnticipo,
  mesesQueSeAdelantan,
  seOfreceElegirLaForma,
} from './forma-del-adelanto';

/*
 * La copia de la regla del back para el diálogo: qué parte del pago se puede
 * dejar como anticipo del contrato (Juan Camilo, 2026-09-16).
 */

const periodo = (month: string, vencida: boolean, extra: Partial<PeriodoEnDeuda> = {}): PeriodoEnDeuda =>
  ({
    id: `cuota-${month}`,
    cuotaId: `cuota-${month}`,
    cobroId: null,
    contractId: 'contrato-1',
    month,
    dueDate: `${month}-05T00:00:00.000Z`,
    createdAt: `${month}-01T00:00:00.000Z`,
    propertyTitle: 'Apto 101',
    tenantName: 'Ana Pérez',
    totalWithFees: 1_000_000,
    paidAmount: 0,
    pendingAmount: 1_000_000,
    status: null,
    daysLate: 0,
    lateFee: 0,
    vencida,
    sinRespaldo: 0,
    conceptos: [],
    ...extra,
  }) as unknown as PeriodoEnDeuda;

const cartera = (cuotas: PeriodoEnDeuda[], extra: Partial<CarteraDelCliente> = {}): CarteraDelCliente =>
  ({
    tenantId: 'ana',
    nombre: 'Ana Pérez',
    inmuebles: 1,
    total: cuotas.reduce((s, c) => s + c.pendingAmount, 0),
    cuotas,
    anticipoDelContratoDisponible: true,
    ...extra,
  }) as unknown as CarteraDelCliente;

const plan = (c: CarteraDelCliente, monto: number) => imputarPago(deudasDeLaCartera(c.cuotas), monto);

describe('forma del adelanto', () => {
  const cuatro = cartera([
    periodo('2026-09', true),
    periodo('2026-10', false),
    periodo('2026-11', false),
    periodo('2026-12', false),
  ]);

  it('sólo lo futuro de una cuota de contrato es adelantable', () => {
    expect(esAdelantableComoAnticipo(periodo('2026-10', false))).toBe(true);
    expect(esAdelantableComoAnticipo(periodo('2026-09', true))).toBe(false);
    expect(esAdelantableComoAnticipo(periodo('2026-10', false, { cuotaId: null }))).toBe(false);
    expect(esAdelantableComoAnticipo(periodo('2026-10', false, { contractId: null }))).toBe(false);
  });

  it('cuenta los meses futuros que el pago alcanza, con el último parcial', () => {
    expect(mesesQueSeAdelantan(cuatro, plan(cuatro, 3_500_000))).toEqual({
      meses: [
        { month: '2026-10', valorCop: 1_000_000, completo: true },
        { month: '2026-11', valorCop: 1_000_000, completo: true },
        { month: '2026-12', valorCop: 500_000, completo: false },
      ],
      valorCop: 2_500_000,
    });
  });

  it('sólo lo vencido: no hay nada que elegir', () => {
    expect(mesesQueSeAdelantan(cuatro, plan(cuatro, 1_000_000)).meses).toEqual([]);
    expect(seOfreceElegirLaForma(cuatro, plan(cuatro, 1_000_000))).toBe(false);
  });

  it('se ofrece elegir sólo si el back puede guardar el anticipo', () => {
    expect(seOfreceElegirLaForma(cuatro, plan(cuatro, 2_000_000))).toBe(true);
    const sinMigracion = { ...cuatro, anticipoDelContratoDisponible: false };
    expect(seOfreceElegirLaForma(sinMigracion, plan(sinMigracion, 2_000_000))).toBe(false);
    const backViejo = { ...cuatro, anticipoDelContratoDisponible: undefined };
    expect(seOfreceElegirLaForma(backViejo, plan(backViejo, 2_000_000))).toBe(false);
  });
});
