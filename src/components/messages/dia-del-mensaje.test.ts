import { describe, expect, it } from 'vitest';

import { rotuloDelDia, separadoresDeDia } from './dia-del-mensaje';

describe('el separador de días del chat', () => {
  it('dice «Hoy», «Ayer» o la fecha (con el año sólo si no es el de hoy)', () => {
    expect(rotuloDelDia('2026-10-11', '2026-10-11')).toBe('Hoy');
    expect(rotuloDelDia('2026-10-10', '2026-10-11')).toBe('Ayer');
    expect(rotuloDelDia('2026-10-04', '2026-10-11')).toBe('4 de octubre');
    expect(rotuloDelDia('2025-12-31', '2026-01-01')).toBe('Ayer');
    expect(rotuloDelDia('2025-12-30', '2026-01-01')).toBe('30 de diciembre de 2025');
  });

  it('pone un rótulo sólo cuando cambia el día de Colombia', () => {
    const hoy = '2026-10-11';
    const mensajes = [
      { createdAt: '2026-10-04T15:12:00.000Z' }, // 4 oct, 10:12 a. m.
      { createdAt: '2026-10-04T20:00:00.000Z' }, // 4 oct, 3 p. m.
      // 11:33 p. m. del 11 en Bogotá: ya es el 12 en UTC, pero es «Hoy».
      { createdAt: '2026-10-12T04:33:00.000Z' },
      { createdAt: '2026-10-12T04:40:00.000Z' },
    ];
    expect(separadoresDeDia(mensajes, hoy)).toEqual(['4 de octubre', null, 'Hoy', null]);
  });

  it('un instante que no se deja leer no pone rótulo', () => {
    expect(separadoresDeDia([{ createdAt: 'no' }], '2026-10-11')).toEqual([null]);
  });
});
