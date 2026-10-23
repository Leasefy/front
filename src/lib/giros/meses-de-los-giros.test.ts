import { describe, it, expect } from 'vitest';
import { conElMes, esMesDeLosGiros, mesesDeLosGiros } from './meses-de-los-giros';

describe('Giros a propietarios — un mes para los cuatro pasos', () => {
  const hoy = new Date(2026, 9, 22); // 22 de octubre de 2026

  it('PG-R18 (Nico, 03-10): hasta el mes en curso + 3 y doce hacia atrás, del más nuevo al más viejo', () => {
    const meses = mesesDeLosGiros(hoy).map((m) => m.value);
    expect(meses).toHaveLength(15);
    expect(meses[0]).toBe('2027-01');
    expect(meses).toContain('2026-10');
    expect(meses.at(-1)).toBe('2025-11');
  });

  it('el mes viaja en el enlace de cada paso', () => {
    expect(conElMes('/panel/inmobiliaria/pagos/liquidaciones', '2026-09')).toBe('/panel/inmobiliaria/pagos/liquidaciones?mes=2026-09');
    expect(conElMes('/panel/inmobiliaria/pagos/dispersiones/lotes?paso=pagado', '2026-09')).toBe(
      '/panel/inmobiliaria/pagos/dispersiones/lotes?paso=pagado&mes=2026-09',
    );
    expect(conElMes('/x')).toBe('/x');
  });

  it('sólo se acepta un mes que el selector ofrece', () => {
    expect(esMesDeLosGiros('2026-09', hoy)).toBe(true);
    expect(esMesDeLosGiros('2024-01', hoy)).toBe(false);
    expect(esMesDeLosGiros('hola', hoy)).toBe(false);
    expect(esMesDeLosGiros(null, hoy)).toBe(false);
  });
});
