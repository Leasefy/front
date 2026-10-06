import { describe, expect, it } from 'vitest';
import { esFilaDeTotales, fraseDeFilasDeTotales, separarFilasDeTotales } from './fila-de-totales';

describe('fila de totales al final del archivo (MIG-C, 04-10)', () => {
  it('🔴 C08: «TOTALES» con la suma de cánones no es un contrato: se aparta y se dice', () => {
    const filas = [
      { _rowIndex: 1, Inmueble: '9001', Arrendatario: 'Valentina', Renta: '$2.500.000' },
      { _rowIndex: 7, Inmueble: '9006', Arrendatario: 'John Smith', Renta: '$1.100.000' },
      { _rowIndex: 8, Inmueble: 'TOTALES', Arrendatario: '', Renta: '$15.050.000' },
    ];
    const r = separarFilasDeTotales(filas);
    expect(r.filas).toHaveLength(2);
    expect(r.totales).toEqual([{ fila: 9, texto: 'TOTALES' }]);
    expect(fraseDeFilasDeTotales(r.totales)).toBe(
      'La fila 9, «TOTALES», es la de totales del archivo: no se cuenta como dato.',
    );
  });

  it('I04: «TOTAL» en la columna de la ciudad, con lo de antes vacío', () => {
    expect(esFilaDeTotales({ _rowIndex: 9, Código: '', Tipo: '', Dirección: '', Ciudad: 'TOTAL', Canon: '15050000' })).toBe(true);
  });

  it('no se traga un dato: «Total» en medio, o como barrio de una fila con código, sigue siendo dato', () => {
    const filas = [
      { _rowIndex: 1, Código: '9001', Barrio: 'Total' },
      { _rowIndex: 2, Código: 'TOTAL', Canon: '1' },
      { _rowIndex: 3, Código: '9002', Barrio: 'Laureles' },
    ];
    expect(separarFilasDeTotales(filas).filas).toHaveLength(3);
    expect(esFilaDeTotales({ Código: '9001', Barrio: 'Total' })).toBe(false);
    expect(esFilaDeTotales({ Nombre: 'Totalmente Nuevo S.A.S.' })).toBe(false);
  });

  it('«Subtotal», «IVA»… sólo las del final, hasta tres', () => {
    const filas = [
      { _rowIndex: 1, a: 'x' },
      { _rowIndex: 2, a: 'Subtotal', b: '10' },
      { _rowIndex: 3, a: 'Total general', b: '10' },
    ];
    const r = separarFilasDeTotales(filas);
    expect(r.filas).toHaveLength(1);
    expect(fraseDeFilasDeTotales(r.totales)).toBe(
      'Las filas 3 y 4 son de totales del archivo: no se cuentan como datos.',
    );
  });

  it('un archivo sin totales no cambia', () => {
    const filas = [{ _rowIndex: 1, a: 'x' }];
    expect(separarFilasDeTotales(filas)).toEqual({ filas, totales: [] });
    expect(fraseDeFilasDeTotales([])).toBeNull();
  });
});
