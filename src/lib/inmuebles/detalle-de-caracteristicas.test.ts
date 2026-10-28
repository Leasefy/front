import { describe, expect, it } from 'vitest';

import { conElDetalle, esCaracteristica, esDetalleDeCaracteristica, nombreDeLaCaracteristica, sinLaCaracteristica } from './caracteristicas';

describe('Parqueadero y cuarto útil: privado o comunal (Nico, 28-10-2026)', () => {
  it('uno solo a la vez y se nombra', () => {
    const v = conElDetalle(['parking'], 'parking', 'parking_private');
    expect(conElDetalle(v, 'parking', 'parking_communal')).toEqual(['parking', 'parking_communal']);
    expect(conElDetalle(v, 'parking', null)).toEqual(['parking']);
    expect(nombreDeLaCaracteristica('storage_communal')).toBe('Cuarto útil comunal');
    expect(esCaracteristica('parking_private') && esDetalleDeCaracteristica('parking_private')).toBe(true);
  });

  it('quitar la característica quita su detalle, y no toca la otra', () => {
    expect(sinLaCaracteristica(['parking', 'parking_private', 'storage', 'storage_private'], 'parking')).toEqual(['storage', 'storage_private']);
  });
});
