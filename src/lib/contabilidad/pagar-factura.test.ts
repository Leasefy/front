import { describe, expect, it } from 'vitest';
import { egresoDeLaFacturaEnPalabras, estadoDePago, sePuedePagar } from './pagar-factura';

const egreso = (estado: 'PENDIENTE' | 'EN_LOTE' | 'PAGADO', numero: number | null = null) => ({
  id: 'e-1',
  numero,
  estado,
  loteId: null,
});

describe('🔴 CB-R21 · pagar una factura de Gastos', () => {
  it('sólo se paga lo causado sin egreso', () => {
    expect(sePuedePagar({ estado: 'CAUSADA', egreso: null })).toBe(true);
    expect(sePuedePagar({ estado: 'CAUSADA' })).toBe(true);
    expect(sePuedePagar({ estado: 'BORRADOR', egreso: null })).toBe(false);
    expect(sePuedePagar({ estado: 'PAGADA', egreso: null })).toBe(false);
    expect(sePuedePagar({ estado: 'ANULADA', egreso: null })).toBe(false);
    expect(sePuedePagar({ estado: 'CAUSADA', egreso: egreso('PENDIENTE') })).toBe(false);
  });

  it('dice en qué va el pago', () => {
    expect(egresoDeLaFacturaEnPalabras(egreso('PENDIENTE'))).toBe('En Egresos: falta armar el lote');
    expect(egresoDeLaFacturaEnPalabras(egreso('EN_LOTE'))).toMatch(/lote de egresos/);
    expect(egresoDeLaFacturaEnPalabras(egreso('PAGADO', 14))).toBe('Pagada con el egreso CE-14');
  });

  it('estado de la cuenta por pagar: vencida sólo sin egreso y con la fecha pasada', () => {
    const hoy = '2026-10-04';
    expect(estadoDePago({ estado: 'CAUSADA', egreso: null, fechaDeVencimiento: '2026-10-01' }, hoy)).toBe('vencida');
    expect(estadoDePago({ estado: 'CAUSADA', egreso: null, fechaDeVencimiento: '2026-10-04' }, hoy)).toBe('por-pagar');
    expect(estadoDePago({ estado: 'CAUSADA', egreso: null, fechaDeVencimiento: null }, hoy)).toBe('por-pagar');
    expect(
      estadoDePago({ estado: 'CAUSADA', egreso: egreso('EN_LOTE'), fechaDeVencimiento: '2026-09-01' }, hoy),
    ).toBe('en-pago');
    expect(estadoDePago({ estado: 'PAGADA', egreso: null, fechaDeVencimiento: null }, hoy)).toBe('pagada');
    expect(estadoDePago({ estado: 'BORRADOR', egreso: null, fechaDeVencimiento: null }, hoy)).toBeNull();
  });
});
