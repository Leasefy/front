import { describe, it, expect } from 'vitest';
import { numeroDelContrato, tituloDelContrato } from './numero-del-contrato';

/**
 * 🔴 Nico, 2026-09-12: «estás tergiversando los números de contrato». El
 * #1839 que vio es nuestro consecutivo; el suyo es 1686. La pantalla tiene
 * que leer el suyo y decir que el nuestro es el nuestro.
 */
describe('numeroDelContrato', () => {
  it('un contrato migrado con número de la inmobiliaria: el suyo grande, el nuestro rotulado', () => {
    expect(numeroDelContrato({ code: 1839, externalId: '1686' })).toEqual({
      principal: '1686',
      secundario: 'Leasefy #1839',
      esDeLaInmobiliaria: true,
    });
  });

  it('un contrato nativo: sólo el nuestro, con numeral', () => {
    expect(numeroDelContrato({ code: 14, externalId: null })).toEqual({
      principal: '#14',
      secundario: null,
      esDeLaInmobiliaria: false,
    });
  });

  it('un migrado que vino sin número se lee como nativo', () => {
    expect(numeroDelContrato({ code: 20, externalId: '   ' }).principal).toBe('#20');
    expect(numeroDelContrato({ code: 20, externalId: undefined }).principal).toBe('#20');
  });

  it('sin ninguno de los dos no hay nada que dibujar — nunca «#0» ni «—»', () => {
    expect(numeroDelContrato({ code: undefined, externalId: null })).toEqual({
      principal: null,
      secundario: null,
      esDeLaInmobiliaria: false,
    });
  });

  it('con el número de la inmobiliaria y sin el nuestro (back viejo), no inventa el secundario', () => {
    expect(numeroDelContrato({ code: undefined, externalId: '1686' })).toEqual({
      principal: '1686',
      secundario: null,
      esDeLaInmobiliaria: true,
    });
  });
});

describe('tituloDelContrato', () => {
  it('es «Contrato 1686» para el migrado y «Contrato #14» para el nativo', () => {
    expect(tituloDelContrato({ code: 1839, externalId: '1686' })).toBe('Contrato 1686');
    expect(tituloDelContrato({ code: 14, externalId: null })).toBe('Contrato #14');
  });

  it('cae al genérico sin número', () => {
    expect(tituloDelContrato({ code: undefined, externalId: null })).toBe('Contrato de arrendamiento');
  });
});
