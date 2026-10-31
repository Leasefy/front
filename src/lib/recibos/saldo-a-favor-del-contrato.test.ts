import { describe, expect, it } from 'vitest';

import type { CarteraDelCliente } from '@/lib/api/recibos-de-caja.types';
import { saldoAFavorEnElRecibo } from './saldo-a-favor-del-contrato';

const cuota = (contractId: string, pendingAmount: number, vencida: boolean) =>
  ({ contractId, pendingAmount, vencida }) as CarteraDelCliente['cuotas'][number];

describe('el saldo a favor del contrato en el recibo de caja (Juan, 31-10-2026)', () => {
  it('la cuota de noviembre todavía no vence: se cobra la cuota menos los $177.419 de servicios', () => {
    const r = saldoAFavorEnElRecibo({
      cuotas: [cuota('c-1', 6_720_000, false), cuota('c-1', 6_720_000, false)],
      anticiposDelContrato: [{ contractId: 'c-1', saldoCop: 177_419 }],
    });
    expect(r).toEqual({ saldoCop: 177_419, deLoVencidoCop: 0, deTodaLaDeudaCop: 177_419 });
  });

  it('con la cuota vencida, el anticipo cubre parte de lo vencido', () => {
    const r = saldoAFavorEnElRecibo({
      cuotas: [cuota('c-1', 1_500_000, true), cuota('c-1', 1_500_000, false)],
      anticiposDelContrato: [{ contractId: 'c-1', saldoCop: 177_419 }],
    });
    expect(r.deLoVencidoCop).toBe(177_419);
  });

  it('nunca descuenta más de lo que debe ESE contrato', () => {
    const r = saldoAFavorEnElRecibo({
      cuotas: [cuota('c-1', 100_000, true), cuota('c-2', 2_000_000, true)],
      anticiposDelContrato: [{ contractId: 'c-1', saldoCop: 177_419 }],
    });
    expect(r).toEqual({ saldoCop: 177_419, deLoVencidoCop: 100_000, deTodaLaDeudaCop: 100_000 });
  });

  it('sin anticipos (o un back que no los manda) no descuenta nada', () => {
    expect(saldoAFavorEnElRecibo({ cuotas: [cuota('c-1', 1, true)] })).toEqual({ saldoCop: 0, deLoVencidoCop: 0, deTodaLaDeudaCop: 0 });
    expect(saldoAFavorEnElRecibo(null).saldoCop).toBe(0);
  });
});
