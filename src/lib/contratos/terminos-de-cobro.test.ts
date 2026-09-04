import { describe, it, expect } from 'vitest';
import {
  MAX_DIAS_DE_PLAZO,
  diasDePlazoComoTexto,
  terminosDeCobro,
  validarDiasDePlazo,
} from './terminos-de-cobro';

describe('validarDiasDePlazo', () => {
  it('vacío es válido: hereda los de la inmobiliaria', () => {
    expect(validarDiasDePlazo('')).toBeUndefined();
    expect(validarDiasDePlazo('   ')).toBeUndefined();
  });

  it('acepta 0 y el techo', () => {
    expect(validarDiasDePlazo('0')).toBeUndefined();
    expect(validarDiasDePlazo(String(MAX_DIAS_DE_PLAZO))).toBeUndefined();
  });

  it('rechaza decimales, negativos y texto', () => {
    expect(validarDiasDePlazo('2.5')).toBe('Sólo días enteros');
    expect(validarDiasDePlazo('-1')).toBe('Sólo días enteros');
    expect(validarDiasDePlazo('tres')).toBe('Sólo días enteros');
  });

  it('rechaza por encima del techo del back (@Max(60))', () => {
    expect(validarDiasDePlazo('61')).toBe('Máximo 60 días');
  });
});

describe('terminosDeCobro — el payload exacto', () => {
  it('manda number, no string, y null cuando el campo está vacío', () => {
    expect(terminosDeCobro({ prorratearPrimerMes: true, diasDePlazo: '3' })).toEqual({
      prorratearPrimerMes: true,
      diasDePlazo: 3,
    });
    expect(terminosDeCobro({ prorratearPrimerMes: false, diasDePlazo: '' })).toEqual({
      prorratearPrimerMes: false,
      diasDePlazo: null,
    });
  });

  it('0 días es un valor real, no «vacío»', () => {
    expect(terminosDeCobro({ prorratearPrimerMes: false, diasDePlazo: '0' }).diasDePlazo).toBe(0);
  });

  it('no agrega ninguna clave que el DTO del back no conozca', () => {
    const claves = Object.keys(terminosDeCobro({ prorratearPrimerMes: false, diasDePlazo: '' }));
    expect(claves.sort()).toEqual(['diasDePlazo', 'prorratearPrimerMes']);
  });
});

describe('diasDePlazoComoTexto — precarga de «editar»', () => {
  it('null y ausente → vacío; 0 → "0"', () => {
    expect(diasDePlazoComoTexto(null)).toBe('');
    expect(diasDePlazoComoTexto(undefined)).toBe('');
    expect(diasDePlazoComoTexto(0)).toBe('0');
    expect(diasDePlazoComoTexto(5)).toBe('5');
  });
});
