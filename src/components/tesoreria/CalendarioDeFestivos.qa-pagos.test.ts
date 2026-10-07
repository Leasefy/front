import { describe, expect, it } from 'vitest';

import { cuantosFestivos } from './CalendarioDeFestivos';

/** PG-13 (QA de Pagos, 03-10-2026): «18 festivo(s) en 18 día(s)» no es español. */
describe('cuántos festivos, con su plural', () => {
  it('dice el plural de verdad', () => {
    expect(cuantosFestivos(18, 18)).toBe('18 festivos en 18 días distintos');
    expect(cuantosFestivos(1, 1)).toBe('1 festivo en 1 día distinto');
    expect(cuantosFestivos(18, 17)).not.toContain('(s)');
  });
});
