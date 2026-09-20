/**
 * Lo que se protege: que la puerta al estado de cuenta se ofrezca EXACTAMENTE
 * cuando se puede abrir.
 *
 * Los dos errores caros son simétricos. Ofrecerla sin referencia manda a una
 * URL con un segmento vacío y el back contesta 404: el usuario aprende que «el
 * estado de cuenta no funciona». No ofrecerla teniendo documento se la quita a
 * casi toda la inmobiliaria migrada, donde la enorme mayoría de los inquilinos
 * no tiene cuenta del portal.
 */
import { describe, it, expect } from 'vitest';

import { refDelInquilino, refDesdeLaClave } from './con-quien-se-abre';

describe('refDelInquilino — la cuenta manda, el documento salva', () => {
  it('con cuenta del portal usa el userId', () => {
    expect(refDelInquilino({ tenantId: 'u-1', documento: '1020' })).toBe('u-1');
  });

  it('sin cuenta usa el DOCUMENTO: es quien identifica al inquilino', () => {
    expect(refDelInquilino({ tenantId: null, documento: '1020' })).toBe('1020');
  });

  it('sin ninguno de los dos no hay puerta', () => {
    expect(refDelInquilino({ tenantId: null, documento: null })).toBeNull();
    expect(refDelInquilino({})).toBeNull();
  });

  it('un valor en blanco no es un valor (viene así de lo migrado)', () => {
    expect(refDelInquilino({ tenantId: '  ', documento: '  ' })).toBeNull();
    expect(refDelInquilino({ tenantId: '   ', documento: '1020' })).toBe('1020');
  });
});

describe('refDesdeLaClave — la clave con que la cartera agrupa', () => {
  it('`usuario:` y `documento:` abren; el valor sale sin prefijo', () => {
    expect(refDesdeLaClave('usuario:u-1')).toBe('u-1');
    expect(refDesdeLaClave('documento:1020')).toBe('1020');
  });

  it('🔴 `contrato:` NO abre: ese inquilino no tiene cómo identificarse', () => {
    expect(refDesdeLaClave('contrato:c-9')).toBeNull();
  });

  it('una clave sin prefijo o sin valor tampoco', () => {
    expect(refDesdeLaClave('u-1')).toBeNull();
    expect(refDesdeLaClave('documento:')).toBeNull();
    expect(refDesdeLaClave('documento:   ')).toBeNull();
  });

  it('un documento con dos puntos adentro conserva todo lo que sigue al primero', () => {
    expect(refDesdeLaClave('documento:CE:123')).toBe('CE:123');
  });
});
