import { describe, it, expect } from 'vitest';
import { contar, plural } from './plural';

describe('el plural corriente del español', () => {
  it('vocal lleva -s', () => {
    expect(plural('casa')).toBe('casas');
    expect(plural('inmueble')).toBe('inmuebles');
  });

  it('consonante lleva -es', () => {
    expect(plural('mes')).toBe('meses');
    expect(plural('contrato')).toBe('contratos');
    expect(plural('avalúo')).toBe('avalúos');
  });

  it('-z se vuelve -ces', () => {
    expect(plural('vez')).toBe('veces');
  });

  it('una palabra vacía no revienta', () => {
    expect(plural('')).toBe('');
  });
});

describe('contar', () => {
  it('🔴 con UNO va en singular: «1 disponible», nunca «1 disponibles»', () => {
    expect(contar(1, 'disponible')).toBe('1 disponible');
    expect(contar(1, 'arrendada')).toBe('1 arrendada');
  });

  it('con cero va en plural, que es como se dice', () => {
    expect(contar(0, 'disponible')).toBe('0 disponibles');
  });

  it('con varios, en plural', () => {
    expect(contar(5, 'arrendada')).toBe('5 arrendadas');
  });

  it('el número lleva separador de miles: «1.944» no se lee como un año', () => {
    expect(contar(1944, 'inmueble')).toBe('1.944 inmuebles');
  });

  it('un plural irregular se pasa explícito en vez de adivinarlo', () => {
    expect(contar(2, 'lápiz', 'lápices')).toBe('2 lápices');
  });
});
