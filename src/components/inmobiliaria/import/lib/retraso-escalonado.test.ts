import { describe, expect, it } from 'vitest';
import { retrasoEscalonado } from './retraso-escalonado';

describe('retrasoEscalonado', () => {
  it('usa el paso del sistema (40 ms) entre un ítem y el siguiente', () => {
    expect(retrasoEscalonado(0)).toBe('0ms');
    expect(retrasoEscalonado(1)).toBe('40ms');
    expect(retrasoEscalonado(3)).toBe('120ms');
  });

  it('nunca pasa del techo de 320 ms, por larga que sea la lista', () => {
    expect(retrasoEscalonado(8)).toBe('320ms');
    expect(retrasoEscalonado(200)).toBe('320ms');
  });
});
