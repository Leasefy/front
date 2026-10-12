/**
 * La columna «Fotos» al terminar la carga (Nico, 10-10-2026: «decirlo en el
 * resultado»): las que no bajaron se dicen con sus filas; si llegaron todas o
 * el back no lo midió, no se dice nada.
 */
import { describe, expect, it } from 'vitest';

import { fraseDeLasFotosQueNoBajaron } from './fotosQueNoBajaron';

const base = { total: 3, creadas: 3, fallidas: 0, pendientes: 0 };

describe('fraseDeLasFotosQueNoBajaron', () => {
  it('dice cuántas no se pudieron traer y en qué filas', () => {
    expect(fraseDeLasFotosQueNoBajaron({ ...base, fotos: { pedidas: 6, traidas: 3, filas: [2, 7] } })).toBe(
      '3 de 6 fotos del archivo no se pudieron traer (filas 2 y 7): el enlace tiene que ser https y público (en Drive o Dropbox, «cualquiera con el enlace»).',
    );
    expect(fraseDeLasFotosQueNoBajaron({ ...base, fotos: { pedidas: 1, traidas: 0, filas: [4] } })).toMatch(
      /^1 de 1 foto del archivo no se pudo traer \(fila 4\)/,
    );
  });

  it('nada si llegaron todas, sin enlaces o con un back que no lo mide', () => {
    expect(fraseDeLasFotosQueNoBajaron({ ...base, fotos: { pedidas: 2, traidas: 2, filas: [] } })).toBeNull();
    expect(fraseDeLasFotosQueNoBajaron(base)).toBeNull();
    expect(fraseDeLasFotosQueNoBajaron(null)).toBeNull();
  });
});
