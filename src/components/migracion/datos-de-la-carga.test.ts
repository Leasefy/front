/**
 * QA-MIGRACION-95 (06-10-2026): la migración salió del centro de procesos y
 * cada paso dice SUS cargas: quién, cuándo y cuánto tardó.
 */
import { describe, it, expect } from 'vitest';
import { lineaDeLaCarga } from './datos-de-la-carga';

describe('lineaDeLaCarga', () => {
  it('quién, cuándo (hora de Bogotá) y cuánto tardó una carga terminada', () => {
    expect(
      lineaDeLaCarga({ subidoPor: 'Mariana Admin', creadoEn: '2026-10-06T13:31:00Z', actualizadoEn: '2026-10-06T13:33:10Z', terminada: true }),
    ).toBe('Subida por Mariana Admin · el 6 de octubre, 8:31 a. m. · tardó 2 minutos');
  });
  it('una que corre dice cuánto lleva (contra ahora); horas y minutos en palabras', () => {
    expect(
      lineaDeLaCarga({ creadoEn: '2026-10-06T13:00:00Z', actualizadoEn: '2026-10-06T13:00:10Z', enCurso: true, ahora: new Date('2026-10-06T14:05:00Z') }),
    ).toBe('Subida el 6 de octubre, 8:00 a. m. · lleva 1 hora y 5 minutos');
  });
  it('una que espera a la persona (por revisar o por crear) no lleva reloj', () => {
    expect(lineaDeLaCarga({ subidoPor: 'Mariana', creadoEn: '2026-10-06T13:35:00Z', actualizadoEn: '2026-10-06T13:35:20Z' })).toBe(
      'Subida por Mariana · el 6 de octubre, 8:35 a. m.',
    );
  });
  it('sin datos (back viejo) no inventa nada', () => {
    expect(lineaDeLaCarga({})).toBe('');
    expect(lineaDeLaCarga({ subidoPor: null, creadoEn: 'x' })).toBe('');
  });
  it('si la hora de la carga no mide el trabajo (inmuebles), dice cuándo terminó y no «tardó»', () => {
    expect(
      lineaDeLaCarga({ subidoPor: 'Mariana', creadoEn: '2026-10-06T17:27:00Z', actualizadoEn: '2026-10-06T17:32:00Z', terminada: true, duracionConfiable: false }),
    ).toBe('Subida por Mariana · el 6 de octubre, 12:27 p. m. · terminó el 6 de octubre, 12:32 p. m.');
  });
});
