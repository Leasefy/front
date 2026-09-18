/**
 * Los meses que faltan son la cifra que importa: son los meses en los que el
 * interés de mora sale SIN techo legal.
 */

import { describe, it, expect } from 'vitest';

import { avisoDeMesesQueFaltan, mesesAtras, mesesQueFaltan, rangoDeMeses } from './usura';

describe('rango de meses', () => {
  it('va del más viejo al más nuevo, inclusive', () => {
    expect(rangoDeMeses('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('un rango al revés o mal escrito no devuelve nada (no se inventa)', () => {
    expect(rangoDeMeses('2027-02', '2026-11')).toEqual([]);
    expect(rangoDeMeses('2026-13', '2027-01')).toEqual([]);
    expect(rangoDeMeses('', '2027-01')).toEqual([]);
  });

  it('nunca pasa de 120 meses: una fecha corrupta no dibuja diez mil filas', () => {
    expect(rangoDeMeses('1900-01', '2100-01')).toHaveLength(120);
  });

  it('`mesesAtras` cruza el año sin correrse', () => {
    expect(mesesAtras('2026-02', 3)).toBe('2025-11');
    expect(mesesAtras('2026-01', 1)).toBe('2025-12');
  });
});

describe('meses sin tasa', () => {
  it('son los del rango que nadie cargó', () => {
    expect(
      mesesQueFaltan('2026-07', '2026-09', [{ mes: '2026-08' }]),
    ).toEqual(['2026-07', '2026-09']);
  });

  it('con todo cargado, ninguno', () => {
    expect(mesesQueFaltan('2026-08', '2026-08', [{ mes: '2026-08' }])).toEqual([]);
  });
});

describe('el aviso', () => {
  it('sin meses faltantes no hay aviso: una alarma falsa enseña a ignorarlas', () => {
    expect(avisoDeMesesQueFaltan([])).toBeNull();
  });

  it('nombra los meses y dice qué pasa con ellos', () => {
    const aviso = avisoDeMesesQueFaltan(['2026-07', '2026-08'])!;
    expect(aviso).toContain('2026-07');
    expect(aviso).toContain('2026-08');
    expect(aviso).toContain('SIN topear');
    expect(aviso).toContain('884');
  });

  it('con muchos meses nombra seis y cuenta el resto (no una lista infinita)', () => {
    const meses = rangoDeMeses('2025-01', '2025-12');
    const aviso = avisoDeMesesQueFaltan(meses)!;
    expect(aviso).toContain('12 meses sin tasa');
    expect(aviso).toContain('2025-06');
    expect(aviso).toContain('y 6 más');
    expect(aviso).not.toContain('2025-07');
  });
});
