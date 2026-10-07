/**
 * QA-INQ-95 (04-10-2026) · El estado de cuenta de Iván (portal y panel) decía
 * «Pagadas 11 de 20 cuotas · 9 del sistema anterior» de un contrato de 12
 * cuotas: contaba FILAS, y una cuota pagada con varios recibos se parte en una
 * fila por recibo (agosto en 4, septiembre en 3, octubre en 4). La cuenta es
 * por CUOTA (`cuotaId`); la plata sigue sumándose fila por fila.
 */
import { describe, it, expect } from 'vitest';

import { amortizacionDe } from './resumen';
import { contrato, fila } from './ejemplo-de-prueba';

const anterior = (mes: string) =>
  fila({ estado: 'ANTERIOR', valorNeto: 2_350_000, documentoDePago: null, cuotaId: `anterior:c3:${mes}` });
const abono = (cuotaId: string, valorNeto: number) => fila({ estado: 'CANCELADA', valorNeto, parcial: true, cuotaId });

describe('la amortización cuenta cuotas, no filas', () => {
  it('el contrato de Iván: 12 cuotas, 3 pagadas acá con varios recibos y 9 del sistema anterior', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          ...['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map(anterior),
          abono('ago', 1_000_000), abono('ago', 98_765), abono('ago', 951_235), abono('ago', 300_000),
          abono('sep', 460_431), abono('sep', 839_569), abono('sep', 1_050_000),
          abono('oct', 123_457), abono('oct', 90_000), abono('oct', 366_431), abono('oct', 1_770_112),
        ],
        otrosConceptos: [],
      },
    });
    const a = amortizacionDe(c);
    expect(a.total).toBe(12);
    expect(a.pagadas).toBe(3);
    expect(a.anteriores).toBe(9);
    expect(a.cubiertas).toBe(3);
    expect(a.anterioresSinComprobante).toBe(9);
    expect(a.pagadoCop).toBe(7_050_000);
    expect(a.pactadoCop).toBe(28_200_000);
    expect(a.porcentaje).toBe(25);
    expect(a.porcentajeAnterior).toBe(75);
  });

  it('una cuota abonada a medias (una fila pagada y el saldo pendiente) no cuenta como pagada', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          abono('ago', 1_000_000),
          fila({ estado: 'PENDIENTE', valorNeto: 1_350_000, parcial: true, cuotaId: 'ago' }),
          fila({ estado: 'PENDIENTE', valorNeto: 2_350_000, cuotaId: 'sep' }),
        ],
        otrosConceptos: [],
      },
    });
    const a = amortizacionDe(c);
    expect(a.total).toBe(2);
    expect(a.pagadas).toBe(0);
    expect(a.pagadoCop).toBe(1_000_000);
    expect(a.pactadoCop).toBe(4_700_000);
  });
});
