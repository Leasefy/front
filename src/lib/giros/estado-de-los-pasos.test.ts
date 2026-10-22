import { describe, it, expect } from 'vitest';
import { estadoDeLosPasos } from './estado-de-los-pasos';

const lote = (month: string, estado: Parameters<typeof estadoDeLosPasos>[0][number]['estado']) => ({ month, estado });

describe('Giros a propietarios — en qué va cada paso del mes', () => {
  it('sin lotes del mes no marca nada (no lo sabemos)', () => {
    expect(estadoDeLosPasos([], '2026-10')).toEqual({});
    expect(estadoDeLosPasos([lote('2026-09', 'PAGADO')], '2026-10')).toEqual({});
  });

  it('un lote anulado no cuenta', () => {
    expect(estadoDeLosPasos([lote('2026-10', 'ANULADO')], '2026-10')).toEqual({});
  });

  it('lote en borrador: liquidar y revisar hechos, el archivo del banco en curso', () => {
    expect(estadoDeLosPasos([lote('2026-10', 'BORRADOR')], '2026-10')).toEqual({
      liquidar: 'hecho',
      revisar: 'hecho',
      banco: 'en_curso',
    });
  });

  it('archivo generado o en Wompi: el banco hecho y marcar pagado en curso', () => {
    for (const estado of ['ARCHIVO_GENERADO', 'EN_WOMPI'] as const) {
      expect(estadoDeLosPasos([lote('2026-10', estado)], '2026-10')).toEqual({
        liquidar: 'hecho',
        revisar: 'hecho',
        banco: 'hecho',
        pagado: 'en_curso',
      });
    }
  });

  it('todo pagado: los cuatro hechos', () => {
    expect(estadoDeLosPasos([lote('2026-10', 'PAGADO'), lote('2026-10', 'ANULADO')], '2026-10')).toEqual({
      liquidar: 'hecho',
      revisar: 'hecho',
      banco: 'hecho',
      pagado: 'hecho',
    });
  });

  it('un lote pagado y otro todavía esperando aprobación: el banco sigue en curso', () => {
    expect(estadoDeLosPasos([lote('2026-10', 'PAGADO'), lote('2026-10', 'ESPERANDO_APROBACION')], '2026-10')).toEqual({
      liquidar: 'hecho',
      revisar: 'hecho',
      banco: 'en_curso',
    });
  });
});
