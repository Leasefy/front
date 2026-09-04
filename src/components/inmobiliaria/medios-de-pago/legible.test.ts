import { describe, expect, it } from 'vitest';
import { describirMedio, enmascarar, faltanteDe, sugerencias } from './legible';

describe('faltanteDe — calca las validaciones del back', () => {
  it('transferencia incompleta dice qué falta', () => {
    expect(faltanteDe({ tipo: 'TRANSFERENCIA', banco: 'B', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '', titular: 'X' })).toMatch(
      /número de cuenta/,
    );
    expect(faltanteDe({ tipo: 'TRANSFERENCIA', banco: 'B', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '1', titular: 'X' })).toBeNull();
  });
  it('enlace de pago exige https', () => {
    expect(faltanteDe({ tipo: 'ENLACE_DE_PAGO', enlace: 'http://x' })).toMatch(/https/);
    expect(faltanteDe({ tipo: 'ENLACE_DE_PAGO', enlace: 'https://x.co/p' })).toBeNull();
  });
  it('efectivo no exige nada', () => {
    expect(faltanteDe({ tipo: 'EFECTIVO' })).toBeNull();
  });
});

describe('describirMedio y enmascarar', () => {
  it('la transferencia se lee con el número tapado', () => {
    expect(
      describirMedio({ tipo: 'TRANSFERENCIA', banco: 'Bancolombia', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '12345678901', titular: 'Portofino', enlace: null }),
    ).toBe('Bancolombia · Ahorros · •••• 8901 · Portofino');
    expect(enmascarar('1234')).toBe('1234');
  });
});

describe('sugerencias', () => {
  it('prellena titular y NIT con la agencia; el efectivo es directo', () => {
    const [transferencia, efectivo] = sugerencias({ name: 'Portofino', razonSocial: 'Portofino S.A.S.', nit: '900.1-2' });
    expect(transferencia.valores).toMatchObject({ tipo: 'TRANSFERENCIA', titular: 'Portofino S.A.S.', documentoTitular: '900.1-2' });
    expect(transferencia.directa).toBe(false);
    expect(efectivo.valores).toEqual({ tipo: 'EFECTIVO', nombre: 'Efectivo en la oficina' });
    expect(efectivo.directa).toBe(true);
  });
});
