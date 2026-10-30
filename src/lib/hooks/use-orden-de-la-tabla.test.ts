/**
 * El orden de las tablas (Nico, 28-10-2026: «que todas las tablas tengan lo de ordenamiento general y por columnas»).
 */
import { describe, expect, it } from 'vitest';

import { ordenarFilas } from './use-orden-de-la-tabla';

type Fila = { nombre: string | null; canon: number | null; desde: string | null };
const FILAS: Fila[] = [
  { nombre: 'Álvaro', canon: 2_500_000, desde: '2026-03-01' },
  { nombre: 'apto 10', canon: null, desde: '2025-12-15' },
  { nombre: 'Apto 2', canon: 900_000, desde: null },
  { nombre: null, canon: 1_200_000, desde: '2026-10-01' },
];
const COLUMNAS = { nombre: (f: Fila) => f.nombre, canon: (f: Fila) => f.canon, desde: (f: Fila) => f.desde };

describe('ordenarFilas', () => {
  it('texto en español: sin tildes ni mayúsculas, «Apto 2» antes que «apto 10», lo vacío al final', () => {
    expect(ordenarFilas(FILAS, { campo: 'nombre', sentido: 'asc' }, COLUMNAS).map((f) => f.nombre)).toEqual([
      'Álvaro',
      'Apto 2',
      'apto 10',
      null,
    ]);
    // Al revés, lo vacío sigue al final.
    expect(ordenarFilas(FILAS, { campo: 'nombre', sentido: 'desc' }, COLUMNAS).map((f) => f.nombre)).toEqual([
      'apto 10',
      'Apto 2',
      'Álvaro',
      null,
    ]);
  });

  it('números y fechas de menor a mayor (y al revés)', () => {
    expect(ordenarFilas(FILAS, { campo: 'canon', sentido: 'desc' }, COLUMNAS).map((f) => f.canon)).toEqual([
      2_500_000,
      1_200_000,
      900_000,
      null,
    ]);
    expect(ordenarFilas(FILAS, { campo: 'desde', sentido: 'asc' }, COLUMNAS).map((f) => f.desde)).toEqual([
      '2025-12-15',
      '2026-03-01',
      '2026-10-01',
      null,
    ]);
  });

  it('sin orden, la lista como venía (y nunca la modifica)', () => {
    const copia = [...FILAS];
    expect(ordenarFilas(FILAS, null, COLUMNAS)).toEqual(FILAS);
    ordenarFilas(FILAS, { campo: 'canon', sentido: 'asc' }, COLUMNAS);
    expect(FILAS).toEqual(copia);
  });
});
