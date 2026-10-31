import { describe, expect, it } from 'vitest';

import { cuandoEntraElConcepto, esDeUnaSolaVez, loDeUnaSolaVez } from './cuando-entra-el-concepto';

// La liquidación de servicios públicos de entrada que pagó el inquilino (Juan, 31-10-2026): $177.419 del propietario.
const ENTRADA = {
  paga: 'PROPIETARIO' as const,
  recibe: 'INQUILINO' as const,
  recurrente: false,
  planDeMeses: [{ mes: '2026-11', valorCop: 177_419 }],
  valorCop: 177_419,
};

describe('cuándo entra un concepto del contrato', () => {
  it('un plan de UN mes es de una sola vez, no «de los meses elegidos»', () => {
    expect(esDeUnaSolaVez(ENTRADA)).toBe(true);
    expect(esDeUnaSolaVez({ ...ENTRADA, planDeMeses: [{ mes: '2026-11', valorCop: 1 }, { mes: '2026-12', valorCop: 1 }] })).toBe(false);
    expect(esDeUnaSolaVez({ ...ENTRADA, planDeMeses: null, recurrente: true })).toBe(false);
    expect(esDeUnaSolaVez({ ...ENTRADA, planDeMeses: null, recurrente: false })).toBe(true);
  });

  it('lo que paga el propietario se le descuenta una vez del giro y queda a favor del inquilino', () => {
    expect(cuandoEntraElConcepto(ENTRADA)).toBe('una sola vez, de su giro de nov 2026 · a favor del inquilino');
  });

  it('lo que paga el inquilino entra en una sola cuota', () => {
    expect(cuandoEntraElConcepto({ ...ENTRADA, paga: 'INQUILINO', recibe: 'PROPIETARIO' })).toBe('una sola vez, en su cuota de nov 2026');
    expect(cuandoEntraElConcepto({ ...ENTRADA, paga: 'INQUILINO', recibe: 'PROPIETARIO', planDeMeses: null })).toBe(
      'una sola vez, en su próxima cuota sin pagar',
    );
  });

  it('un recurrente no dice nada (entra cada mes) y un plan de varios meses dice cuántos', () => {
    expect(cuandoEntraElConcepto({ ...ENTRADA, recurrente: true, planDeMeses: null })).toBe('');
    expect(
      cuandoEntraElConcepto({ ...ENTRADA, planDeMeses: [{ mes: '2026-11', valorCop: 1 }, { mes: '2026-12', valorCop: 1 }] }),
    ).toBe('en 2 meses');
  });

  it('suma lo de una sola vez por quién lo paga', () => {
    expect(
      loDeUnaSolaVez([
        ENTRADA,
        { ...ENTRADA, paga: 'INQUILINO', recibe: 'PROPIETARIO', valorCop: 72_581 },
        { ...ENTRADA, paga: 'INQUILINO', recurrente: true, planDeMeses: null, valorCop: 180_000 },
        { ...ENTRADA, paga: 'INMOBILIARIA', recibe: 'PROPIETARIO', planDeMeses: null, valorCop: 50_000 },
      ]),
    ).toEqual({ delInquilinoCop: 72_581, delPropietarioCop: 177_419, deOtrosCop: 50_000 });
  });
});
