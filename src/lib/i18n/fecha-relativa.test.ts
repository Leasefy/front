/**
 * 🔴 Nico, 2026-09-12, en el historial de un inmueble consignado en 2022:
 * «mira que ahí habla de días y debería, si se pasa de 365, volverse en años
 * más días si es que restan».
 */

import { describe, it, expect } from 'vitest';
import { fechaRelativa } from './fecha-relativa';

const HOY = new Date('2026-09-12T00:00:00.000Z');
const haceDias = (n: number) => new Date(HOY.getTime() - n * 86_400_000);

describe('fechaRelativa', () => {
  it('🔴 el caso de Nico: 1639 días se dice en años y días', () => {
    expect(fechaRelativa(haceDias(1639), 'es', HOY).texto).toBe(
      'Hace 4 años y 179 días',
    );
  });

  it('debajo del año sigue diciéndose en días, que es lo que se lee bien', () => {
    expect(fechaRelativa(haceDias(12), 'es', HOY).texto).toBe('Hace 12 días');
    expect(fechaRelativa(haceDias(364), 'es', HOY).texto).toBe('Hace 364 días');
  });

  it('justo en 365 cambia a años, y sin días de sobra no los inventa', () => {
    expect(fechaRelativa(haceDias(365), 'es', HOY).texto).toBe('Hace 1 año');
    expect(fechaRelativa(haceDias(730), 'es', HOY).texto).toBe('Hace 2 años');
  });

  it('singulariza el día que sobra', () => {
    expect(fechaRelativa(haceDias(366), 'es', HOY).texto).toBe(
      'Hace 1 año y 1 día',
    );
  });

  it('hoy, ayer y mañana se dicen con su palabra', () => {
    expect(fechaRelativa(HOY, 'es', HOY).texto).toBe('Hoy');
    expect(fechaRelativa(haceDias(1), 'es', HOY).texto).toBe('Ayer');
    expect(fechaRelativa(haceDias(-1), 'es', HOY).texto).toBe('Mañana');
  });

  it('hacia el futuro vale lo mismo', () => {
    expect(fechaRelativa(haceDias(-1639), 'es', HOY).texto).toBe(
      'En 4 años y 179 días',
    );
    expect(fechaRelativa(haceDias(-20), 'es', HOY).texto).toBe('En 20 días');
  });

  it('en inglés también', () => {
    expect(fechaRelativa(haceDias(1639), 'en', HOY).texto).toBe(
      '4 years and 179 days ago',
    );
    expect(fechaRelativa(haceDias(365), 'en', HOY).texto).toBe('1 year ago');
    expect(fechaRelativa(haceDias(3), 'en', HOY).texto).toBe('3 days ago');
  });

  it('acepta la fecha como texto, que es como llega del back', () => {
    expect(fechaRelativa('2022-03-17T00:00:00.000Z', 'es', HOY).texto).toContain(
      'años',
    );
  });

  /* Una fecha ilegible no inventa una frase: devuelve vacío y quien la pinta
     decide qué mostrar. */
  it('una fecha que no se puede leer devuelve vacío', () => {
    expect(fechaRelativa('no-es-fecha', 'es', HOY).texto).toBe('');
  });
});
