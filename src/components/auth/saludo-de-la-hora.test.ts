import { describe, expect, it } from 'vitest';

import { saludoDeLaHora } from './AuthForm';

/** La hora de Colombia (UTC−5) decide el saludo, aunque el navegador o el servidor estén en otra zona. */
const enBogota = (hora: number, minuto = 0) => new Date(Date.UTC(2026, 9, 28, hora + 5, minuto));

describe('el saludo de la entrada', () => {
  it('de 5 a. m. a 11:59 a. m. es «Buenos días.»', () => {
    expect(saludoDeLaHora(enBogota(5))).toBe('Buenos días.');
    expect(saludoDeLaHora(enBogota(11, 59))).toBe('Buenos días.');
  });
  it('de mediodía a 6:59 p. m. es «Buenas tardes.»', () => {
    expect(saludoDeLaHora(enBogota(12))).toBe('Buenas tardes.');
    expect(saludoDeLaHora(enBogota(18, 59))).toBe('Buenas tardes.');
  });
  it('de 7 p. m. a 4:59 a. m. es «Buenas noches.»', () => {
    expect(saludoDeLaHora(enBogota(19))).toBe('Buenas noches.');
    expect(saludoDeLaHora(enBogota(0, 30))).toBe('Buenas noches.');
    expect(saludoDeLaHora(enBogota(4, 59))).toBe('Buenas noches.');
  });
});
