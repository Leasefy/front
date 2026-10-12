import { describe, expect, it } from 'vitest';
import {
  nombreCortoLibre,
  normalizarNombreCorto,
  problemaDelNombreCorto,
  raizDelNombreCorto,
} from './nombre-corto';

/**
 * Espejo del back (`src/marketplace/nombre-corto.ts` y su prueba en
 * `reglas-del-marketplace.spec.ts`): los MISMOS casos dan lo MISMO.
 */

describe('raizDelNombreCorto (la misma regla que la migración)', () => {
  it.each([
    ['Nogal Inmobiliaria', 'nogal-inmobiliaria'],
    ['Inmobiliaria Peñalisa S.A.S.', 'inmobiliaria-penalisa-s-a-s'],
    ['  Árbol & Ceiba  ', 'arbol-ceiba'],
    ['***', 'inmobiliaria'],
    ['', 'inmobiliaria'],
  ])('%s → %s', (nombre, raiz) => {
    expect(raizDelNombreCorto(nombre)).toBe(raiz);
  });

  it('se queda en 50 sin guion al final', () => {
    const raiz = raizDelNombreCorto(`${'a'.repeat(49)} b`);
    expect(raiz.length).toBeLessThanOrEqual(50);
    expect(raiz.endsWith('-')).toBe(false);
  });
});

describe('normalizarNombreCorto (lo que escribe la persona)', () => {
  it('lleva espacios, puntos y mayúsculas a la forma', () => {
    expect(normalizarNombreCorto(' Nogal Inmobiliaria ')).toBe('nogal-inmobiliaria');
    expect(normalizarNombreCorto('Ceiba.Arriendos')).toBe('ceiba-arriendos');
    expect(normalizarNombreCorto('Peñalisa')).toBe('penalisa');
  });

  it('vacío es «sin nombre corto» (null); lo que no es texto pasa igual', () => {
    expect(normalizarNombreCorto('   ')).toBeNull();
    expect(normalizarNombreCorto(5)).toBe(5);
  });
});

describe('problemaDelNombreCorto', () => {
  it('sirve: minúsculas, números y guiones entre 3 y 50', () => {
    expect(problemaDelNombreCorto('nogal')).toBeNull();
    expect(problemaDelNombreCorto('nogal-2')).toBeNull();
  });

  it.each(['no', 'Nogal', 'nogal--x', '-nogal', 'nogal_x', 'a'.repeat(51)])('%s no tiene la forma', (v) => {
    expect(problemaDelNombreCorto(v)).toBe('forma');
  });

  it('las palabras reservadas no se pueden tomar', () => {
    expect(problemaDelNombreCorto('panel')).toBe('reservado');
    expect(problemaDelNombreCorto('leasefy')).toBe('reservado');
  });
});

describe('nombreCortoLibre', () => {
  it('la raíz si nadie la tiene; si no, con 6 letras del id', async () => {
    expect(await nombreCortoLibre('Nogal', 'ab12-cd34-ef56', async () => false)).toBe('nogal');
    expect(await nombreCortoLibre('Nogal', 'ab12-cd34-ef56', async () => true)).toBe('nogal-ab12cd');
  });

  it('una raíz reservada nunca se usa sola', async () => {
    expect(await nombreCortoLibre('Panel', 'ffff0000', async () => false)).toBe('panel-ffff00');
  });
});

describe('los mismos casos de la prueba del back', () => {
  it('dan lo mismo acá', async () => {
    expect(raizDelNombreCorto('Inmobiliaria Nogal S.A.S.')).toBe('inmobiliaria-nogal-s-a-s');
    expect(raizDelNombreCorto('  Ñuñoa & Cía  ')).toBe('nunoa-cia');
    expect(raizDelNombreCorto('Árbol Bienes Raíces')).toBe('arbol-bienes-raices');
    expect(raizDelNombreCorto('a'.repeat(80)).length).toBe(50);
    expect(normalizarNombreCorto('Belén_Arriendos')).toBe('belen-arriendos');
    expect(problemaDelNombreCorto('admin')).toBe('reservado');
    expect(problemaDelNombreCorto(42)).toBe('forma');
    expect(await nombreCortoLibre('Admin', '1a2b3c4d-0000', async () => false)).toBe('admin-1a2b3c');
  });
});
