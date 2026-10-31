import { describe, expect, it } from 'vitest';

import type { PortafolioRow } from '@/lib/types/inmobiliaria';
import { cuantosFiltrosDeEspecificaciones, cumpleLasEspecificaciones, resumenDeEspecificaciones } from './especificaciones';

const fila = (extra: Partial<PortafolioRow> = {}) =>
  ({
    kind: 'consignacion',
    listingType: 'rent',
    monthlyRent: 3_800_000,
    especificaciones: { habitaciones: 3, banos: 2, areaM2: 84, parqueaderos: 1, estrato: 4, caracteristicas: ['balcony', 'storage_private', 'furnished'] },
    ...extra,
  }) as unknown as PortafolioRow;

describe('las especificaciones en la tabla de inmuebles (Nico 31-10-2026)', () => {
  it('el resumen de la columna', () => {
    expect(resumenDeEspecificaciones(fila().especificaciones)).toBe('3 hab · 2 baños · 84 m² · 1 parq. · Estrato 4');
    expect(resumenDeEspecificaciones({ habitaciones: 1, banos: 1, areaM2: null, parqueaderos: 0, estrato: null, caracteristicas: [] })).toBe('1 hab · 1 baño');
    expect(resumenDeEspecificaciones(null)).toBe('');
  });

  it('sin filtros, todo pasa; cada filtro cuenta una vez', () => {
    expect(cumpleLasEspecificaciones(fila(), undefined)).toBe(true);
    expect(cuantosFiltrosDeEspecificaciones({ habitacionesMin: 2, parqueadero: true, amoblado: false })).toBe(2);
  });

  it('mínimos, estrato, canon, negocio y características', () => {
    expect(cumpleLasEspecificaciones(fila(), { habitacionesMin: 3, banosMin: 2, estrato: 4, areaMin: 80 })).toBe(true);
    expect(cumpleLasEspecificaciones(fila(), { habitacionesMin: 4 })).toBe(false);
    expect(cumpleLasEspecificaciones(fila(), { canonMax: 3_000_000 })).toBe(false);
    expect(cumpleLasEspecificaciones(fila(), { canonMin: 3_000_000, canonMax: 4_000_000 })).toBe(true);
    expect(cumpleLasEspecificaciones(fila(), { negocio: 'sale' })).toBe(false);
    expect(cumpleLasEspecificaciones(fila(), { parqueadero: true, cuartoUtil: true, amoblado: true, caracteristica: 'balcony' })).toBe(true);
    expect(cumpleLasEspecificaciones(fila(), { caracteristica: 'pool' })).toBe(false);
  });

  it('un dato que no está no cumple un mínimo (no se adivina)', () => {
    expect(cumpleLasEspecificaciones(fila({ especificaciones: null } as Partial<PortafolioRow>), { habitacionesMin: 1 })).toBe(false);
    expect(cumpleLasEspecificaciones(fila({ monthlyRent: null } as Partial<PortafolioRow>), { canonMax: 5_000_000 })).toBe(false);
  });
});
