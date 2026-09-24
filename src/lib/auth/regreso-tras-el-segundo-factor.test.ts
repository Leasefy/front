import { describe, expect, it } from 'vitest';

import {
  destinoTrasElSegundoFactor,
  rutaAlSegundoFactor,
} from './regreso-tras-el-segundo-factor';

describe('el segundo factor conserva a dónde iba la persona (QA 23-09)', () => {
  it('lleva el returnUrl a /auth/mfa-verify', () => {
    expect(rutaAlSegundoFactor('/panel/inmobiliaria/dispersiones/lotes/abc?x=1')).toBe(
      '/auth/mfa-verify?returnUrl=%2Fpanel%2Finmobiliaria%2Fdispersiones%2Flotes%2Fabc%3Fx%3D1',
    );
  });

  it('sin destino, o con uno inseguro, va a secas', () => {
    expect(rutaAlSegundoFactor('/')).toBe('/auth/mfa-verify');
    expect(rutaAlSegundoFactor(null)).toBe('/auth/mfa-verify');
    expect(rutaAlSegundoFactor('//malo.com')).toBe('/auth/mfa-verify');
    expect(rutaAlSegundoFactor('https://malo.com')).toBe('/auth/mfa-verify');
  });

  it('tras el código vuelve al destino saneado', () => {
    expect(destinoTrasElSegundoFactor('/panel/inmobiliaria/lotes/abc', 'agency')).toBe(
      '/panel/inmobiliaria/lotes/abc',
    );
  });

  it('un destino inseguro o ausente cae en el inicio del rol', () => {
    expect(destinoTrasElSegundoFactor('//malo.com', 'agency')).toBe('/panel/inmobiliaria');
    expect(destinoTrasElSegundoFactor('javascript:alert(1)', 'landlord')).toBe('/panel');
    expect(destinoTrasElSegundoFactor(null, 'tenant')).toBe('/inquilino');
    expect(destinoTrasElSegundoFactor('/auth/mfa-verify', 'agency')).toBe('/panel/inmobiliaria');
  });
});
