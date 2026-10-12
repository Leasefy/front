import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarReciente, leerRecientes } from './busquedas-recientes';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('Tus búsquedas', () => {
  it('la última va primero y una repetida no se duplica', () => {
    guardarReciente('q=a', 'A');
    guardarReciente('q=b', 'B');
    guardarReciente('q=a', 'A otra vez');
    expect(leerRecientes().map((r) => [r.qs, r.titulo])).toEqual([
      ['q=a', 'A otra vez'],
      ['q=b', 'B'],
    ]);
  });

  it('afinar la misma conversación no agrega otra: se actualiza su dirección', () => {
    guardarReciente('q=apto', 'Apto en Laureles');
    guardarReciente('q=apto&comodidades=balcon', 'Apto en Laureles');
    expect(leerRecientes()).toEqual([expect.objectContaining({ qs: 'q=apto&comodidades=balcon', titulo: 'Apto en Laureles' })]);
  });

  it('guarda como mucho 8', () => {
    for (let i = 0; i < 12; i++) guardarReciente(`q=${i}`, `B${i}`);
    expect(leerRecientes()).toHaveLength(8);
    expect(leerRecientes()[0].qs).toBe('q=11');
  });

  it('lo que no se entiende se ignora', () => {
    window.localStorage.setItem('leasefy-marketplace-busquedas', '{"no":"es una lista"}');
    expect(leerRecientes()).toEqual([]);
    window.localStorage.setItem('leasefy-marketplace-busquedas', 'esto no es json');
    expect(leerRecientes()).toEqual([]);
  });

  it('sin almacenamiento no rompe: no hay lista', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(leerRecientes()).toEqual([]);
    expect(() => guardarReciente('q=a', 'A')).not.toThrow();
  });
});
