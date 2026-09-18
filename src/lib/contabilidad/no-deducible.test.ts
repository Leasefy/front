/**
 * «No deducible» en la cuenta del PUC: lo puro.
 *
 * 🔴 Lo que este archivo clava: `null` y «la columna no existe» NO son lo
 * mismo. Si el formulario mandara `noDeducible: false` a una base sin la
 * migración 70, el back respondería 503 y se perdería la edición entera de la
 * cuenta —nombre, naturaleza, activa— por un campo que nadie tocó.
 */

import { describe, expect, it } from 'vitest';

import {
  cambiosDeLaCuenta,
  estaMarcadaNoDeducible,
  frasesDeLoNoDeducible,
  soportaNoDeducible,
} from './no-deducible';

const edicion = {
  nombre: '  Gastos de representación  ',
  naturaleza: 'DEBITO' as const,
  imputable: true,
  activa: true,
  noDeducible: true,
};

describe('soportaNoDeducible', () => {
  it('con la columna presente (aunque sea null) sí', () => {
    expect(soportaNoDeducible({ noDeducible: null })).toBe(true);
    expect(soportaNoDeducible({ noDeducible: false })).toBe(true);
    expect(soportaNoDeducible({ noDeducible: true })).toBe(true);
  });

  it('🔴 sin la clave (el back la omite) no', () => {
    expect(soportaNoDeducible({} as { noDeducible?: boolean | null })).toBe(false);
    expect(soportaNoDeducible({ noDeducible: undefined })).toBe(false);
    expect(soportaNoDeducible(null)).toBe(false);
  });
});

describe('estaMarcadaNoDeducible', () => {
  it('sólo `true` marca', () => {
    expect(estaMarcadaNoDeducible({ noDeducible: true })).toBe(true);
    expect(estaMarcadaNoDeducible({ noDeducible: null })).toBe(false);
    expect(estaMarcadaNoDeducible({ noDeducible: undefined })).toBe(false);
    expect(estaMarcadaNoDeducible(null)).toBe(false);
  });
});

describe('cambiosDeLaCuenta', () => {
  it('con la columna manda `noDeducible`', () => {
    expect(cambiosDeLaCuenta(edicion, true)).toEqual({
      nombre: 'Gastos de representación',
      naturaleza: 'DEBITO',
      imputable: true,
      activa: true,
      noDeducible: true,
    });
  });

  it('🔴 sin la columna NO manda la clave: un 503 tumbaría la edición entera', () => {
    const cuerpo = cambiosDeLaCuenta(edicion, false);
    expect('noDeducible' in cuerpo).toBe(false);
    expect(cuerpo).toEqual({
      nombre: 'Gastos de representación',
      naturaleza: 'DEBITO',
      imputable: true,
      activa: true,
    });
  });

  it('no manda ninguna clave que el ActualizarCuentaDto no declare', () => {
    expect(Object.keys(cambiosDeLaCuenta(edicion, true)).sort()).toEqual([
      'activa',
      'imputable',
      'naturaleza',
      'noDeducible',
      'nombre',
    ]);
  });
});

describe('frasesDeLoNoDeducible', () => {
  it('con la columna explica adónde va el gasto marcado', () => {
    expect(frasesDeLoNoDeducible(true).explicacion).toContain('formato 1001');
  });

  it('sin la columna no promete nada y nombra a quién espera', () => {
    const f = frasesDeLoNoDeducible(false);
    expect(f.explicacion).toContain('Víctor');
    expect(f.explicacion).toContain('todo el gasto se declara deducible');
  });
});
