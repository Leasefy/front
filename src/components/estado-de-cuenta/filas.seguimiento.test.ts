/**
 * 🔴 QA-CONT C-10 (SEGUIMIENTO-FRONT, 03-10-2026): el back cierra el concepto
 * con el rango EN PALABRAS («Canon. Del 1 al 31 de octubre de 2026»). La
 * pantalla y el PDF separan el título del período leyendo esa cola; sólo
 * conocían la de Nui («De 01-Oct-2026 hasta 31-Oct-2026»), así que la fila decía
 * el rango dos veces (en el concepto y debajo) o no decía el período.
 */
import { describe, expect, it } from 'vitest';

import { conceptoLimpio, periodoDeLaFila, periodoLegible } from './filas';
import { fila } from './ejemplo-de-prueba';

const sinPeriodoSuelto = { periodoDesde: undefined, periodoHasta: undefined } as const;

describe('C-10 — el rango en palabras del back nuevo', () => {
  it('🔴 «Canon. Del 1 al 31 de octubre de 2026»: el título y el período aparte', () => {
    const f = fila({ concepto: 'Canon. Del 1 al 31 de octubre de 2026', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(conceptoLimpio(f)).toBe('Canon');
    expect(periodoLegible(f)).toBe(`${'1'} oct 2026 → 31 oct 2026`);
  });

  it('🔴 con el período suelto del back, el concepto igual pierde la cola (no se dice dos veces)', () => {
    const f = fila({ concepto: 'Canon de arrendamiento. Del 21 de agosto al 20 de septiembre de 2026', periodoDesde: '2026-08-21', periodoHasta: '2026-09-20' });
    expect(conceptoLimpio(f)).toBe('Canon de arrendamiento');
  });

  it('CR-18: la cuota trimestral, un rango de 3 meses («Del 1 de octubre al 31 de diciembre de 2026»)', () => {
    const f = fila({ concepto: 'Canon. Del 1 de octubre al 31 de diciembre de 2026', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toEqual({ desde: '2026-10-01', hasta: '2026-12-31' });
    expect(conceptoLimpio(f)).toBe('Canon');
  });

  it('entre dos años', () => {
    const f = fila({ concepto: 'Canon. Del 15 de diciembre de 2026 al 14 de enero de 2027', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toEqual({ desde: '2026-12-15', hasta: '2027-01-14' });
    expect(conceptoLimpio(f)).toBe('Canon');
  });

  it('un solo día: «El 31 de octubre de 2026»', () => {
    const f = fila({ concepto: 'Penalidad por terminación. El 31 de octubre de 2026', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toEqual({ desde: '2026-10-31', hasta: '2026-10-31' });
    expect(conceptoLimpio(f)).toBe('Penalidad por terminación');
  });

  it('con la nota de anulada antes del rango, la nota se queda en el título', () => {
    const f = fila({
      concepto: 'Canon — anulada: el contrato terminó antes y lo pagado pasó al saldo a favor. Del 1 al 30 de noviembre de 2026',
      ...sinPeriodoSuelto,
    });
    expect(conceptoLimpio(f)).toBe('Canon — anulada: el contrato terminó antes y lo pagado pasó al saldo a favor');
  });

  it('la cola de Nui se sigue leyendo como antes', () => {
    const f = fila({ concepto: 'Canon De Arrendamiento. De 01-Oct-2026 hasta 31-Oct-2026', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(conceptoLimpio(f)).toBe('Canon De Arrendamiento');
  });

  it('un mes que no existe no se inventa: el concepto queda entero', () => {
    const f = fila({ concepto: 'Canon. Del 1 al 31 de octubrex de 2026', ...sinPeriodoSuelto });
    expect(periodoDeLaFila(f)).toBeNull();
    expect(conceptoLimpio(f)).toBe('Canon. Del 1 al 31 de octubrex de 2026');
  });
});

import { conceptoDeLaFila } from './estado-de-cuenta-pdf';

describe('C-10 — en el PDF', () => {
  it('🔴 el papel dice «Canon» y no repite el rango en palabras', () => {
    const f = fila({ concepto: 'Canon. Del 1 al 31 de octubre de 2026', ...sinPeriodoSuelto });
    expect(conceptoDeLaFila(f)).toBe('Canon');
  });
});
