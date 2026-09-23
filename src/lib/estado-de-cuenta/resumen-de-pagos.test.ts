/**
 * «Pagos» del portal del inquilino dice lo mismo que su estado de cuenta.
 *
 * El caso del QA 22-09: alguien que debe cuotas vencidas veía «Pendiente $0» y
 * «Vence en NaN días». Estas pruebas fijan que los números salen del estado de
 * cuenta y que un arriendo sin día de pago no produce un NaN.
 */

import { describe, expect, it } from 'vitest';

import { contrato, estadoDeCuenta, fila } from '@/components/estado-de-cuenta/ejemplo-de-prueba';
import { diasHastaElDiaDePago, resumenDePagos } from './resumen-de-pagos';

const HOY = '2026-09-22';

describe('resumenDePagos', () => {
  const doc = estadoDeCuenta({
    contratos: [
      contrato({
        secciones: {
          arriendos: [
            fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-07-01', valorNeto: 4_150_000, cajon: 'CARTERA', diasDeMora: 73 }),
            fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-08-01', valorNeto: 4_150_000, cajon: 'CARTERA', diasDeMora: 42 }),
            fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-10-01', valorNeto: 4_150_000, cajon: 'POR_VENCER' }),
            fila({ estado: 'CANCELADA', fechaVencimiento: '2026-06-01', valorNeto: 4_150_000 }),
          ],
          otrosConceptos: [],
        },
      }),
    ],
  });

  it('lo vencido es la suma de las cuotas vencidas, no las solicitudes de pago', () => {
    const r = resumenDePagos(doc, HOY);
    expect(r.vencidoCop).toBe(8_300_000);
    expect(r.cuotasVencidas).toBe(2);
    expect(r.enMora).toBe(true);
  });

  it('«resta por pagar» es el total del documento, el mismo de «Mi estado de cuenta»', () => {
    expect(resumenDePagos(doc, HOY).restaPorPagar).toBe(doc.totales.restaPorPagar);
  });

  it('la próxima cuota es la primera que no ha vencido, con los días que faltan', () => {
    expect(resumenDePagos(doc, HOY).proxima).toEqual({ valor: 4_150_000, fecha: '2026-10-01', diasQueFaltan: 9 });
  });

  it('si todo lo pendiente ya venció, no hay próxima (y ningún número inventado)', () => {
    const vencido = estadoDeCuenta({
      contratos: [
        contrato({
          secciones: {
            arriendos: [fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-01-01', cajon: 'CARTERA', diasDeMora: 200 })],
            otrosConceptos: [],
          },
        }),
      ],
    });
    expect(resumenDePagos(vencido, HOY).proxima).toBeNull();
  });
});

describe('diasHastaElDiaDePago', () => {
  const hoy = new Date(2026, 8, 22);

  it('sin día de pago (arriendo migrado) no hay vencimiento: null, nunca NaN', () => {
    expect(diasHastaElDiaDePago(undefined, hoy)).toBeNull();
    expect(diasHastaElDiaDePago(null, hoy)).toBeNull();
    expect(diasHastaElDiaDePago(Number.NaN, hoy)).toBeNull();
    expect(diasHastaElDiaDePago(0, hoy)).toBeNull();
  });

  it('cuenta hasta el día de este mes o, si ya pasó, del siguiente', () => {
    expect(diasHastaElDiaDePago(25, hoy)).toBe(3);
    expect(diasHastaElDiaDePago(22, hoy)).toBe(0);
    expect(diasHastaElDiaDePago(5, hoy)).toBe(13);
  });
});
