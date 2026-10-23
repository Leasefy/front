import { describe, expect, it } from 'vitest';
import { sinMayusculasDeEnfasis } from './sin-mayusculas-de-enfasis';

describe('sinMayusculasDeEnfasis', () => {
  it('baja las de énfasis en medio de la frase', () => {
    expect(sinMayusculasDeEnfasis('Esa plata la inmobiliaria NO la recibió.')).toBe('Esa plata la inmobiliaria no la recibió.');
    expect(sinMayusculasDeEnfasis('Cuenta SÓLO el canon, SIN el IVA.')).toBe('Cuenta sólo el canon, sin el IVA.');
  });

  it('al empezar una frase conserva la mayúscula inicial', () => {
    expect(sinMayusculasDeEnfasis('NO se cobra. SIN póliza no hay siniestro.')).toBe('No se cobra. Sin póliza no hay siniestro.');
  });

  it('las siglas y lo que no es de la lista quedan como vienen', () => {
    expect(sinMayusculasDeEnfasis('El IVA y la retención de la DIAN; el PUC y la PQRS.')).toBe('El IVA y la retención de la DIAN; el PUC y la PQRS.');
    expect(sinMayusculasDeEnfasis('Edificio MONTEFLOR')).toBe('Edificio MONTEFLOR');
    expect(sinMayusculasDeEnfasis('Nada que cambiar')).toBe('Nada que cambiar');
  });
});
