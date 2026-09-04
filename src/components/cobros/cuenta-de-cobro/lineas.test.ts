/**
 * lineas.test.ts — la aritmética de la cuenta de cobro.
 *
 * 🔴 Lo que hay que blindar es `resta`: `valorCop` viene SIEMPRE positivo y
 * la bandera decide el signo. Una retención sumada en vez de restada infla el
 * total y nadie lo nota, porque las cifras siguen siendo plausibles.
 */

import { describe, it, expect } from 'vitest';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type { ConceptoDelCobro } from '@/lib/api/recibos-de-caja.types';
import { fechaEnPalabras, lineasDeLaCuenta, periodoEnPalabras } from './lineas';

const COBRO: Cobro = {
  id: 'c1',
  leaseId: 'l1',
  consignacionId: 'cons1',
  propertyId: 'p1',
  propietarioId: 'own1',
  tenantId: 't1',
  agenteId: 'ag1',
  propertyTitle: 'Local 2',
  propertyAddress: 'Carrera 63 # 90-29',
  tenantName: 'Esteban López',
  tenantEmail: null,
  tenantPhone: null,
  month: '2026-09',
  rentAmount: 3_750_000,
  adminAmount: 180_000,
  totalAmount: 3_930_000,
  lateFee: 0,
  totalWithFees: 3_930_000,
  status: 'pending',
  dueDate: '2026-09-04',
  paidAmount: 0,
  pendingAmount: 3_930_000,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
};

function concepto(
  p: Partial<ConceptoDelCobro> & Pick<ConceptoDelCobro, 'id' | 'tipo' | 'valorCop'>,
): ConceptoDelCobro {
  return { nombre: '', resta: false, reglaId: null, orden: 0, ...p };
}

describe('lineasDeLaCuenta con el desglose del back', () => {
  it('pone el signo en el valor: las que restan salen negativas y el total baja', () => {
    const cuenta = lineasDeLaCuenta(
      { ...COBRO, totalWithFees: 4_305_750, pendingAmount: 4_305_750 },
      [
        concepto({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 3_750_000, orden: 1 }),
        concepto({ id: 'x2', tipo: 'CONCEPTO_DEL_CONTRATO', nombre: 'Administración PH', valorCop: 180_000, orden: 2 }),
        concepto({ id: 'x3', tipo: 'IVA', nombre: 'IVA 19 %', valorCop: 712_500, orden: 3 }),
        concepto({ id: 'x4', tipo: 'RETEFUENTE', nombre: 'Retefuente 3,5 %', valorCop: 131_250, resta: true, orden: 4 }),
        concepto({ id: 'x5', tipo: 'RETEIVA', nombre: 'ReteIVA 15 %', valorCop: 106_875, resta: true, orden: 5 }),
        concepto({ id: 'x6', tipo: 'RETEICA', nombre: 'ReteICA', valorCop: 98_625, resta: true, orden: 6 }),
      ],
    );

    expect(cuenta.detallada).toBe(true);
    expect(cuenta.lineas.map((l) => l.valorCop)).toEqual([
      3_750_000, 180_000, 712_500, -131_250, -106_875, -98_625,
    ]);
    expect(cuenta.subtotalCop).toBe(4_642_500);
    expect(cuenta.descuentosCop).toBe(336_750);
    // 4.642.500 − 336.750. Si las retenciones se sumaran daría 4.979.250.
    expect(cuenta.totalCop).toBe(4_305_750);
    expect(cuenta.descuadra).toBe(false);
  });

  it('respeta el `orden` del back y marca las líneas de mora', () => {
    const cuenta = lineasDeLaCuenta(
      { ...COBRO, totalWithFees: 4_175_000, pendingAmount: 4_175_000, lateFee: 425_000 },
      [
        concepto({ id: 'g', tipo: 'GASTO_ADMINISTRATIVO', nombre: 'Honorario de cobranza', valorCop: 375_000, orden: 3 }),
        concepto({ id: 'c', tipo: 'CANON', nombre: 'Canon', valorCop: 3_750_000, orden: 1 }),
        concepto({ id: 'i', tipo: 'INTERES_DE_MORA', nombre: 'Intereses de mora', valorCop: 50_000, orden: 2 }),
      ],
    );

    expect(cuenta.lineas.map((l) => l.id)).toEqual(['c', 'i', 'g']);
    expect(cuenta.lineas.map((l) => l.esDeMora)).toEqual([false, true, true]);
    expect(cuenta.totalCop).toBe(4_175_000);
  });

  it('avisa cuando las líneas no cuadran con el total del cobro', () => {
    const cuenta = lineasDeLaCuenta(COBRO, [
      concepto({ id: 'c', tipo: 'CANON', nombre: 'Canon', valorCop: 3_750_000, orden: 1 }),
    ]);
    // 3.750.000 contra 3.930.000 del cobro.
    expect(cuenta.descuadra).toBe(true);
    expect(cuenta.totalCop).toBe(3_750_000);
  });

  it('tolera un peso de redondeo', () => {
    const cuenta = lineasDeLaCuenta({ ...COBRO, totalWithFees: 3_930_001 }, [
      concepto({ id: 'c', tipo: 'CANON', valorCop: 3_750_000, orden: 1 }),
      concepto({ id: 'a', tipo: 'ADMINISTRACION', valorCop: 180_000, orden: 2 }),
    ]);
    expect(cuenta.descuadra).toBe(false);
  });

  it('el abonado y el saldo salen del cobro, no de sumar líneas', () => {
    const cuenta = lineasDeLaCuenta(
      { ...COBRO, status: 'partial', paidAmount: 1_000_000, pendingAmount: 2_930_000 },
      [concepto({ id: 'c', tipo: 'CANON', valorCop: 3_930_000, orden: 1 })],
    );
    expect(cuenta.abonadoCop).toBe(1_000_000);
    expect(cuenta.saldoCop).toBe(2_930_000);
  });
});

describe('lineasDeLaCuenta sin desglose (agencia sin motor v2)', () => {
  it('separa canon, administración y mora desde los enteros y NO inventa más', () => {
    const cuenta = lineasDeLaCuenta({ ...COBRO, lateFee: 50_000, totalWithFees: 3_980_000 }, []);

    expect(cuenta.detallada).toBe(false);
    expect(cuenta.lineas.map((l) => [l.tipo, l.valorCop])).toEqual([
      ['CANON', 3_750_000],
      ['ADMINISTRACION', 180_000],
      ['INTERES_DE_MORA', 50_000],
    ]);
    expect(cuenta.lineas[2].esDeMora).toBe(true);
    // El total ES el del cobro: no hay contra qué descuadrar.
    expect(cuenta.totalCop).toBe(3_980_000);
    expect(cuenta.descuentosCop).toBe(0);
    expect(cuenta.descuadra).toBe(false);
  });

  it('omite administración y mora cuando valen cero', () => {
    const cuenta = lineasDeLaCuenta({ ...COBRO, adminAmount: 0, lateFee: 0 }, undefined);
    expect(cuenta.lineas.map((l) => l.tipo)).toEqual(['CANON']);
  });
});

describe('fechas en palabras', () => {
  it('el período sale con el mes en palabras sin pasar por Date (nada de UTC)', () => {
    expect(periodoEnPalabras('2026-09')).toBe('Septiembre de 2026');
    expect(periodoEnPalabras('2026-01', 'en')).toBe('January 2026');
    expect(periodoEnPalabras('raro')).toBe('raro');
  });

  it('la fecha lee las partes tal cual, con o sin hora', () => {
    expect(fechaEnPalabras('2026-09-04')).toBe('4 de septiembre de 2026');
    expect(fechaEnPalabras('2026-09-04T00:00:00.000Z')).toBe('4 de septiembre de 2026');
    expect(fechaEnPalabras('2026-12-25', 'en')).toBe('December 25, 2026');
  });
});
