/**
 * COLA-FRONT (04-10-2026), pendientes de QA-CONTA:
 *   · CB-R14: el balance suma el resultado de años anteriores sin asiento de
 *     cierre (`resultadoDeEjerciciosAnterioresCop`), igual que el back.
 *   · CB-18: el auxiliar por tercero dice cuánto le falta para cuadrar con el
 *     libro (`libro`), sólo cuando se puede saber desde la pantalla.
 */
import { describe, expect, it } from 'vitest';

import { loQueLeFaltaAlAuxiliar, totalDelOtroLado } from './estados-financieros';
import type { BalanceGeneral } from '@/lib/api/estados-financieros.service';

const lado = (totalCop: number) => ({ totalCop }) as BalanceGeneral['activo'];

describe('balance con resultado de años anteriores', () => {
  it('🔴 el otro lado de la igualdad lo incluye', () => {
    const balance = {
      activo: lado(1_000),
      pasivo: lado(500),
      patrimonio: lado(200),
      resultadoDelEjercicioCop: 100,
      resultadoDeEjerciciosAnterioresCop: 200,
    } as BalanceGeneral;
    expect(totalDelOtroLado(balance)).toBe(1_000);
  });

  it('un back anterior (sin el campo) suma como antes', () => {
    const balance = {
      activo: lado(1_000),
      pasivo: lado(500),
      patrimonio: lado(200),
      resultadoDelEjercicioCop: 100,
    } as BalanceGeneral;
    expect(totalDelOtroLado(balance)).toBe(800);
  });
});

describe('lo que le falta al auxiliar por tercero', () => {
  const auxiliar = {
    total: 2,
    desplazamiento: 0,
    terceros: [
      { debitosCop: 100, creditosCop: 40 },
      { debitosCop: 50, creditosCop: 10 },
    ],
    sinTercero: { debitosCop: 5, creditosCop: 0 },
    libro: { debitosCop: 175, creditosCop: 50 },
  };

  it('🔴 con todos los terceros a la vista, cuánto falta', () => {
    expect(loQueLeFaltaAlAuxiliar(auxiliar, false)).toEqual({ debitosCop: 20, creditosCop: 0 });
  });

  it('con «sólo con saldo», con otra página o sin `libro`: no se puede saber', () => {
    expect(loQueLeFaltaAlAuxiliar(auxiliar, true)).toBeNull();
    expect(loQueLeFaltaAlAuxiliar({ ...auxiliar, total: 3 }, false)).toBeNull();
    expect(loQueLeFaltaAlAuxiliar({ ...auxiliar, libro: undefined }, false)).toBeNull();
  });
});
