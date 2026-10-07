import { describe, expect, it } from 'vitest';

import { conceptoSinElRango, diaEnColombia, fechaCorta, fechaLarga, hoyEnColombia } from './fecha-de-la-casa';

/**
 * PG-13 / PG-R11 (QA de Pagos, 03-10-2026): en Pagos se veían fechas crudas
 * («Vence el 2026-11-01», «Leído contra el 2026-10-03», «De 01-Sep-2026 hasta
 * 30-Sep-2026»). Estas pruebas fijan la forma de la casa.
 */
describe('las fechas de la casa', () => {
  it('«1 nov 2026» en corto y «1 de noviembre de 2026» en una frase, sin correr el día', () => {
    expect(fechaCorta('2026-11-01')).toBe('1 nov 2026');
    expect(fechaCorta('2026-11-01T00:00:00.000Z')).toBe('1 nov 2026');
    expect(fechaLarga('2026-10-03')).toBe('3 de octubre de 2026');
  });

  it('nunca inventa: lo vacío es «—» y lo que no es fecha queda igual', () => {
    expect(fechaCorta(null)).toBe('—');
    expect(fechaLarga('')).toBe('—');
    expect(fechaCorta('mañana')).toBe('mañana');
  });

  it('hoy es el día de Colombia, no el de UTC (a las 7 p. m. de Bogotá UTC ya va en mañana)', () => {
    // 3 de octubre, 19:30 en Bogotá = 4 de octubre, 00:30 UTC.
    expect(hoyEnColombia(new Date('2026-10-04T00:30:00.000Z'))).toBe('2026-10-03');
  });

  it('el día de un instante del back es el de Colombia; un día suelto queda igual', () => {
    expect(diaEnColombia('2026-10-04T00:30:00.000Z')).toBe('2026-10-03');
    expect(diaEnColombia('2026-10-03')).toBe('2026-10-03');
    expect(diaEnColombia('')).toBeNull();
    expect(diaEnColombia('no es fecha')).toBeNull();
  });
});

describe('el concepto de una cuota, sin el rango crudo de Nui', () => {
  it('el mes entero sobra: el renglón ya dice el mes', () => {
    expect(conceptoSinElRango('Canon de arrendamiento. De 01-Sep-2026 hasta 30-Sep-2026')).toBe(
      'Canon de arrendamiento',
    );
    expect(conceptoSinElRango('Canon de arrendamiento. De 2026-02-01 hasta 2026-02-28')).toBe(
      'Canon de arrendamiento',
    );
  });

  it('un mes partido conserva el rango, en la forma de la casa', () => {
    expect(conceptoSinElRango('Canon de arrendamiento. De 07-Jun-2026 hasta 30-Jun-2026')).toBe(
      'Canon de arrendamiento (7 jun 2026 → 30 jun 2026)',
    );
  });

  it('sin cola, o con una cola que no se deja leer, el texto queda entero', () => {
    expect(conceptoSinElRango('Administración')).toBe('Administración');
    expect(conceptoSinElRango('Canon. De ayer hasta hoy')).toBe('Canon. De ayer hasta hoy');
  });
});
