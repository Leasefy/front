/**
 * Helpers del asiento — con datos en la mano.
 *
 * Lo que se congela: que los totales de la fila salen de las líneas (no de un
 * campo que el back no manda), que el sufijo de líneas va en singular cuando
 * es una sola, y que TODO origen tiene su clase — un origen nuevo sin entrada
 * pintaría una celda sin fondo y nadie lo notaría en pantalla.
 */

import { describe, expect, it } from 'vitest';

import type { MovimientoContable, OrigenDelAsiento } from '@/lib/api/contabilidad.service';
import { CLASE_DE_ORIGEN, NOMBRE_DE_ORIGEN, ORIGENES, textoDeLineas, totalesDeAsiento } from './asientos';

function linea(over: Partial<MovimientoContable> = {}): MovimientoContable {
  return {
    id: 'm',
    asientoId: 'a',
    cuentaId: 'c',
    debitoCop: 0,
    creditoCop: 0,
    terceroTipo: null,
    terceroId: null,
    descripcion: null,
    orden: 1,
    ...over,
  };
}

describe('totalesDeAsiento', () => {
  it('suma cada lado por separado', () => {
    expect(
      totalesDeAsiento({
        movimientos: [
          linea({ debitoCop: 1_000_000 }),
          linea({ debitoCop: 500_000 }),
          linea({ creditoCop: 1_500_000 }),
        ],
      }),
    ).toEqual({ debitos: 1_500_000, creditos: 1_500_000 });
  });

  it('un asiento sin líneas es cero y cero, no un NaN', () => {
    expect(totalesDeAsiento({ movimientos: [] })).toEqual({ debitos: 0, creditos: 0 });
  });
});

describe('textoDeLineas', () => {
  it('singular con una, plural con el resto', () => {
    expect(textoDeLineas(1)).toBe('1 línea');
    expect(textoDeLineas(2)).toBe('2 líneas');
    expect(textoDeLineas(0)).toBe('0 líneas');
  });
});

describe('el catálogo de orígenes', () => {
  it('cada origen tiene nombre y clase: ninguno se pinta en blanco', () => {
    for (const origen of ORIGENES) {
      expect(NOMBRE_DE_ORIGEN[origen]).toBeTruthy();
      expect(CLASE_DE_ORIGEN[origen]).toBeTruthy();
    }
  });

  it('las clases son tokens del design system, sin hex clavados', () => {
    for (const clase of Object.values(CLASE_DE_ORIGEN)) {
      expect(clase).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });

  it('la lista cubre el enum entero del back', () => {
    const delBack: OrigenDelAsiento[] = ['MANUAL', 'COBRO', 'RECIBO_DE_CAJA', 'DISPERSION', 'MIGRACION'];
    expect([...ORIGENES].sort()).toEqual(delBack.sort());
  });
});
