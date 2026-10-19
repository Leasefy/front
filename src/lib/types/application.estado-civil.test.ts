import { describe, it, expect } from 'vitest';

import { MARITAL_STATUS_OPTIONS, estadoCivilEnPalabras } from './application';

// QA de agentes 18-10 (Nico «Agregar Unión libre»): en Colombia la unión
// libre es muy común y no había cómo decirla en la postulación.
describe('Estado civil de la postulación', () => {
  it('ofrece «Unión libre» además de los cuatro de siempre', () => {
    expect(MARITAL_STATUS_OPTIONS.map((o) => o.label)).toEqual([
      'Soltero/a',
      'Casado/a',
      'Unión libre',
      'Divorciado/a',
      'Viudo/a',
    ]);
  });

  it('se muestra en palabras, nunca el valor en inglés', () => {
    expect(estadoCivilEnPalabras('married')).toBe('Casado/a');
    expect(estadoCivilEnPalabras('free_union')).toBe('Unión libre');
    expect(estadoCivilEnPalabras(null)).toBeNull();
    expect(estadoCivilEnPalabras('otro')).toBe('otro');
  });
});
