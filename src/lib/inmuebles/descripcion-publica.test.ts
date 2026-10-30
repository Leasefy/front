import { describe, expect, it } from 'vitest';
import { descripcionPublica } from './descripcion-publica';

describe('descripcionPublica (Nico 30-10)', () => {
  it('quita lo interno de la importación y deja lo demás', () => {
    expect(descripcionPublica('Lindo apartamento.\nUrbanización: Los Almendros · Llaves en: otro · Precio de venta según el archivo: $1.500.000.000')).toBe('Lindo apartamento.\nUrbanización: Los Almendros');
    expect(descripcionPublica('Llaves en: otro · Precio de venta según el archivo: $1.500.000.000')).toBe('');
    expect(descripcionPublica('Casa · 3 alcobas\n\nEntrega de llaves al firmar.')).toBe('Casa · 3 alcobas\n\nEntrega de llaves al firmar.');
  });
});
