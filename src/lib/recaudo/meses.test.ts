import { describe, expect, it } from 'vitest';

import { esFuturo, esMesValido, mesActual, mesCorto, nombreDelMes, sumarMeses } from './meses';

describe('meses del recaudo', () => {
  it('el mes de hoy es el de Bogotá, no el de UTC', () => {
    expect(mesActual(new Date('2026-09-01T03:00:00.000Z'))).toBe('2026-08');
    expect(mesActual(new Date('2026-09-01T12:00:00.000Z'))).toBe('2026-09');
  });

  it('suma meses cruzando el año', () => {
    expect(sumarMeses('2026-12', 1)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
  });

  it('nombra el mes en español', () => {
    expect(nombreDelMes('2026-09')).toBe('septiembre de 2026');
    expect(mesCorto('2026-09')).toBe('sep 26');
  });

  it('un mes posterior al actual es futuro', () => {
    expect(esFuturo('2026-10', '2026-09')).toBe(true);
    expect(esFuturo('2026-09', '2026-09')).toBe(false);
  });

  it('valida el formato', () => {
    expect(esMesValido('2026-09')).toBe(true);
    expect(esMesValido('2026-13')).toBe(false);
  });
});
