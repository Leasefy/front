import { describe, expect, it } from 'vitest';
import { diasDeCalendarioDesde } from './dias-de-calendario';

describe('diasDeCalendarioDesde', () => {
  it('lo reportado hace unos minutos es de hoy (antes decía «Hace 1 día»)', () => {
    const ahora = new Date(2026, 9, 21, 23, 4);
    expect(diasDeCalendarioDesde(new Date(2026, 9, 21, 22, 59), ahora)).toBe(0);
  });

  it('lo de anoche es de ayer aunque no hayan pasado 24 horas', () => {
    const ahora = new Date(2026, 9, 22, 8, 0);
    expect(diasDeCalendarioDesde(new Date(2026, 9, 21, 22, 59), ahora)).toBe(1);
  });

  it('cuenta días de calendario hacia atrás', () => {
    const ahora = new Date(2026, 9, 21, 9, 0);
    expect(diasDeCalendarioDesde(new Date(2026, 9, 4, 18, 0), ahora)).toBe(17);
  });

  it('una fecha ilegible o futura no da días negativos', () => {
    const ahora = new Date(2026, 9, 21, 9, 0);
    expect(diasDeCalendarioDesde('no es fecha', ahora)).toBe(0);
    expect(diasDeCalendarioDesde(new Date(2026, 9, 25), ahora)).toBe(0);
  });
});
