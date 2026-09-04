/**
 * Días contables — con fechas en la mano.
 *
 * Lo que se congela: que un día `AAAA-MM-DD` no se corre por la zona horaria
 * (el defecto clásico de `new Date('2026-02-05')`, que en Colombia es el 4) y
 * que el mes anterior cruza bien el año.
 */

import { describe, expect, it } from 'vitest';

import { diaDe, diaLegible, hoy, primerDiaDelMes, rangoDelMesAnterior, rangoInvertido } from './fechas';

describe('diaDe', () => {
  it('recorta la hora del ISO y devuelve vacío para lo que no es un día', () => {
    expect(diaDe('2026-02-05T00:00:00.000Z')).toBe('2026-02-05');
    expect(diaDe('2026-02-05')).toBe('2026-02-05');
    expect(diaDe('')).toBe('');
    expect(diaDe(null)).toBe('');
    expect(diaDe('ayer')).toBe('');
  });
});

describe('diaLegible', () => {
  it('no corre el día por la zona horaria', () => {
    // El 1.º sigue siendo el 1.º: si pasara por UTC, en Colombia (UTC-5)
    // sería el 31 del mes anterior.
    expect(diaLegible('2026-02-01T00:00:00.000Z')).toContain('1');
    expect(diaLegible('2026-02-01T00:00:00.000Z')).toContain('2026');
  });

  it('lo que no es un día vuelve crudo, no como «Invalid Date»', () => {
    expect(diaLegible('pendiente')).toBe('pendiente');
    expect(diaLegible(null)).toBe('');
  });
});

describe('rangoDelMesAnterior', () => {
  it('el mes anterior entero, del 1.º al último día', () => {
    expect(rangoDelMesAnterior(new Date(2026, 8, 3))).toEqual({
      mes: '2026-08',
      desde: '2026-08-01',
      hasta: '2026-08-31',
    });
  });

  it('en enero cruza al diciembre del año anterior', () => {
    expect(rangoDelMesAnterior(new Date(2026, 0, 15))).toEqual({
      mes: '2025-12',
      desde: '2025-12-01',
      hasta: '2025-12-31',
    });
  });

  it('febrero de un año bisiesto termina el 29', () => {
    expect(rangoDelMesAnterior(new Date(2028, 2, 10)).hasta).toBe('2028-02-29');
  });

  it('el último día del mes anterior es anterior al primero del mes en curso', () => {
    const ahora = new Date(2026, 8, 3);
    expect(rangoDelMesAnterior(ahora).hasta < primerDiaDelMes(ahora)).toBe(true);
    expect(rangoInvertido(rangoDelMesAnterior(ahora).desde, rangoDelMesAnterior(ahora).hasta)).toBe(false);
  });
});

describe('hoy', () => {
  it('es el día local, no el UTC', () => {
    expect(hoy(new Date(2026, 0, 1, 23, 30))).toBe('2026-01-01');
  });
});
