import { afterEach, describe, expect, it, vi } from 'vitest';
import { alCambiarLasRecientes, escribirRecientes, guardarReciente, leerRecientes, sinLaBusqueda } from './busquedas-recientes';

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

describe('Borrar búsquedas (Nico, 27-10-2026)', () => {
  it('se borra una y quedan las demás, en su orden', () => {
    guardarReciente('q=a', 'A');
    guardarReciente('q=b', 'B');
    guardarReciente('q=c', 'C');
    escribirRecientes(sinLaBusqueda(leerRecientes(), 'q=b'));
    expect(leerRecientes().map((r) => r.qs)).toEqual(['q=c', 'q=a']);
  });

  it('borrar todas deja la lista vacía, y «Deshacer» las devuelve tal cual', () => {
    guardarReciente('q=a', 'A');
    guardarReciente('q=b', 'B');
    const antes = leerRecientes();
    escribirRecientes([]);
    expect(leerRecientes()).toEqual([]);
    escribirRecientes(antes);
    expect(leerRecientes()).toEqual(antes);
  });

  it('avisa a quien muestra la lista, con la lista que quedó', () => {
    guardarReciente('q=a', 'A');
    guardarReciente('q=b', 'B');
    const oidas: string[][] = [];
    const dejar = alCambiarLasRecientes((l) => oidas.push(l.map((r) => r.qs)));
    escribirRecientes(sinLaBusqueda(leerRecientes(), 'q=a'));
    dejar();
    escribirRecientes([]);
    expect(oidas).toEqual([['q=b']]);
  });

  it('sin almacenamiento igual avisa: se borra en la página', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const oidas: number[] = [];
    const dejar = alCambiarLasRecientes((l) => oidas.push(l.length));
    const lista = [{ qs: 'q=a', titulo: 'A', cuando: 1 }];
    expect(escribirRecientes(lista)).toEqual(lista);
    dejar();
    expect(oidas).toEqual([1]);
  });
});
