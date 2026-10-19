import { describe, expect, it } from 'vitest';

import { resumenDeLaCuenta } from './cuenta-del-dueno';

const ERIKA = { nombre: 'Erika Andrea Agudelo Atehortua', documento: '43710006' };
const cuenta = (parcial: Record<string, unknown> = {}) => ({
  bankName: 'Bancolombia',
  bankAccountType: 'Ahorros',
  bankAccountNumber: '10060231153',
  bankAccountHolder: null,
  bankAccountHolderDocument: null,
  bankAccountHolderDocumentType: null,
  porcentaje: 100,
  ...parcial,
});

describe('resumenDeLaCuenta (la cuenta del dueño en el contrato)', () => {
  it('su propia cuenta: banco, tipo y los últimos cuatro, sin repetir su nombre', () => {
    expect(resumenDeLaCuenta([cuenta()], ERIKA)).toEqual({ cuenta: 'Bancolombia Ahorros •••• 1153', aNombreDe: null });
    expect(resumenDeLaCuenta([cuenta({ bankAccountHolderDocument: '43.710.006' })], ERIKA)?.aNombreDe).toBeNull();
  });

  it('🔴 cuenta de otra persona sin nombre: lo dice con su documento (PROP-3)', () => {
    expect(
      resumenDeLaCuenta([cuenta({ bankAccountHolderDocument: '21436689', bankAccountHolderDocumentType: 'CC' })], ERIKA),
    ).toEqual({ cuenta: 'Bancolombia Ahorros •••• 1153', aNombreDe: 'otra persona (CC 21436689)' });
  });

  it('cuenta de otra persona con nombre', () => {
    expect(
      resumenDeLaCuenta(
        [cuenta({ bankAccountHolder: 'Marleny Atehortua', bankAccountHolderDocument: '21436689', bankAccountHolderDocumentType: 'CC' })],
        ERIKA,
      )?.aNombreDe,
    ).toBe('otra persona: Marleny Atehortua · CC 21436689');
  });

  it('varias cuentas: cuántas y el reparto; sin cuenta: null', () => {
    expect(resumenDeLaCuenta([cuenta({ porcentaje: 60 }), cuenta({ porcentaje: 40, bankAccountNumber: '999' })], ERIKA)?.cuenta).toBe(
      'Recibe en 2 cuentas (60 % · 40 %)',
    );
    expect(resumenDeLaCuenta([], ERIKA)).toBeNull();
    expect(resumenDeLaCuenta([cuenta({ bankAccountNumber: null })], ERIKA)).toBeNull();
  });
});
