import { describe, it, expect } from 'vitest';
import { textoLegible } from './texto-legible';

describe('textoLegible', () => {
  it('pasa a tipo oración lo que llegó todo en mayúsculas', () => {
    expect(textoLegible('JESUS DAVID RODRIGUEZ RODRIGUEZ')).toBe('Jesus David Rodriguez Rodriguez');
    expect(textoLegible('MARIA DE LOS ANGELES')).toBe('Maria de los Angeles');
    expect(textoLegible('CALLE 10 # 43-12 APTO 301')).toBe('Calle 10 # 43-12 Apto 301');
  });

  it('deja quieto lo que ya viene escrito a mano', () => {
    expect(textoLegible('Camila Restrepo')).toBe('Camila Restrepo');
    expect(textoLegible('Edificio BBVA, local 2')).toBe('Edificio BBVA, local 2');
    expect(textoLegible('')).toBe('');
    expect(textoLegible(null)).toBe('');
  });
});
