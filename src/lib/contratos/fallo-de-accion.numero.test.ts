/**
 * El enlace al contrato que estorba se rotula con el número que la inmobiliaria
 * conoce. En un migrado, un «#1839» pelado es el consecutivo de Leasefy y en el
 * archivo de Nico ese número es otro contrato de otra persona.
 */
import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { inmuebleOcupado } from './fallo-de-accion';

describe('inmuebleOcupado — el número del contrato que estorba', () => {
  it('usa el número rotulado que manda el back', () => {
    const r = inmuebleOcupado(
      new ApiError(409, 'Ocupado', 'INMUEBLE_CON_CONTRATO_EN_CURSO', {
        contratoId: 'c-0',
        contratoNumero: '1686 (Leasefy #1839)',
      }),
    );
    expect(r?.contratoId).toBe('c-0');
    expect(r?.contratoNumero).toBe('1686 (Leasefy #1839)');
  });

  it('con un back viejo que sólo manda el código, cae a «#código»', () => {
    const r = inmuebleOcupado(new ApiError(409, 'Ocupado', undefined, { contratoId: 'c-9', contratoCode: 14 }));
    expect(r?.contratoNumero).toBe('#14');
  });

  it('sin id ni número no inventa nada', () => {
    const r = inmuebleOcupado(new ApiError(409, 'Ocupado'));
    expect(r?.contratoNumero).toBeUndefined();
  });
});
