/**
 * Los tres estados de la deuda de un cliente: al día · vencido, en plazo · en
 * cartera. Lo que se protege es que ninguno se confunda con otro: llamar
 * «cartera» a lo que está en plazo es perseguir a quien usa el plazo que la
 * inmobiliaria le dio, y llamar «al día» a lo vencido es no cobrarle a nadie.
 */
import { describe, it, expect } from 'vitest';

import { estadoDeLaDeuda } from './estado-de-la-deuda';
import type { ResumenDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

function resumen(p: Partial<ResumenDelEstadoDeCuenta> = {}): ResumenDelEstadoDeCuenta {
  return {
    restaPorPagar: 0,
    pendiente: 0,
    proximaCuota: null,
    enMora: null,
    contratos: 1,
    ...p,
  };
}

describe('estadoDeLaDeuda', () => {
  it('🔴 debe cuotas futuras y nada vencido: al día — la deuda del contrato no es mora', () => {
    expect(
      estadoDeLaDeuda(
        resumen({
          restaPorPagar: 15_000_000,
          proximaCuota: { fecha: '2026-10-05', monto: 1_250_000 },
        }),
      ),
    ).toEqual({ tipo: 'AL_DIA' });
  });

  it('vencido sin cartera: vencido, en plazo', () => {
    expect(estadoDeLaDeuda(resumen({ restaPorPagar: 5_000_000, pendiente: 1_250_000 }))).toEqual({
      tipo: 'VENCIDO_EN_PLAZO',
      vencidoCop: 1_250_000,
    });
  });

  it('con cartera: en cartera, con sus días y lo que ya pasó el plazo', () => {
    expect(
      estadoDeLaDeuda(
        resumen({
          restaPorPagar: 5_000_000,
          pendiente: 2_500_000,
          enMora: { dias: 37, monto: 1_250_000 },
        }),
      ),
    ).toEqual({ tipo: 'EN_CARTERA', vencidoCop: 2_500_000, carteraCop: 1_250_000, dias: 37 });
  });

  it('si el back dice que hay cartera, la hay, aunque lo vencido venga en cero', () => {
    const estado = estadoDeLaDeuda(resumen({ enMora: { dias: 3, monto: 900_000 } }));
    expect(estado.tipo).toBe('EN_CARTERA');
    expect(estado.tipo === 'EN_CARTERA' && estado.vencidoCop).toBe(900_000);
  });
});
