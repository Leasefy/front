/**
 * columnas-de-asiento — el archivo del libro diario se vuelve un lote.
 *
 * Lo que se congela: que las filas se agrupan bien en asientos (por número,
 * o por fecha+descripción cuando no hay), que el cuerpo que sale tiene SÓLO
 * las claves de `MigrarAsientoDto` / `MigrarMovimientoDto`, y que los montos
 * viajan crudos —normalizarlos es trabajo del back, que ya lo hace bien.
 */

import { describe, it, expect } from 'vitest';

import { mapearColumnas } from './columnas-de-tercero';
import { armarAsientos, COLUMNAS_DE_ASIENTO, nombreDeLoteDeAsientos } from './columnas-de-asiento';

/** `MigrarAsientoDto` / `MigrarMovimientoDto` (back-erp/src/inmobiliaria/contabilidad/migracion/dto/index.ts). */
const DTO_ASIENTO = ['numeroOriginal', 'fecha', 'descripcion', 'movimientos'];
const DTO_MOVIMIENTO = ['codigoCuenta', 'debito', 'credito', 'descripcion', 'terceroTipo', 'terceroId'];

describe('auto-mapeo con encabezados reales', () => {
  it('un export típico de Siigo se mapea solo', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_ASIENTO, [
      'Comprobante',
      'Fecha',
      'Cuenta',
      'Descripción',
      'Débito',
      'Crédito',
    ]);
    expect(Object.fromEntries(mapeo.map((m) => [m.columna, m.campo]))).toEqual({
      Comprobante: 'numero',
      Fecha: 'fecha',
      Cuenta: 'codigoCuenta',
      Descripción: 'descripcion',
      Débito: 'debito',
      Crédito: 'credito',
    });
  });

  it('«Debe / Haber» también', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_ASIENTO, ['Código', 'Concepto', 'Debe', 'Haber']);
    expect(mapeo.map((m) => m.campo)).toEqual(['codigoCuenta', 'descripcion', 'debito', 'credito']);
  });
});

describe('armarAsientos', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_ASIENTO, [
    'Comprobante',
    'Fecha',
    'Descripción',
    'Cuenta',
    'Débito',
    'Crédito',
    'Detalle',
  ]);

  it('agrupa por número de comprobante, conservando el orden', () => {
    const asientos = armarAsientos(
      [
        { Comprobante: 'CE-1', Fecha: '15/01/2025', Descripción: 'Canon enero', Cuenta: '1105-05', Débito: '1.500.000', Crédito: '' },
        { Comprobante: 'CE-1', Fecha: '15/01/2025', Descripción: 'Canon enero', Cuenta: '413505', Débito: '', Crédito: 1500000, Detalle: 'Apto 301' },
        { Comprobante: 'CE-2', Fecha: '16/01/2025', Descripción: 'Pago propietario', Cuenta: '233595', Débito: 900000 },
        { Comprobante: 'CE-2', Fecha: '16/01/2025', Descripción: 'Pago propietario', Cuenta: '111005', Crédito: 900000 },
      ],
      mapeo,
    );

    expect(asientos).toHaveLength(2);
    expect(asientos[0]).toEqual({
      numeroOriginal: 'CE-1',
      fecha: '15/01/2025',
      descripcion: 'Canon enero',
      movimientos: [
        { codigoCuenta: '1105-05', debito: '1.500.000' },
        { codigoCuenta: '413505', credito: 1500000, descripcion: 'Apto 301' },
      ],
    });
    expect(asientos[1].numeroOriginal).toBe('CE-2');
    expect(asientos[1].movimientos).toHaveLength(2);
  });

  it('sin número agrupa por fecha + descripción, y no manda `numeroOriginal`', () => {
    const sinNumero = mapearColumnas(COLUMNAS_DE_ASIENTO, ['Fecha', 'Concepto', 'Cuenta', 'Debe', 'Haber']);
    const asientos = armarAsientos(
      [
        { Fecha: '2025-01-15', Concepto: 'Canon', Cuenta: '110505', Debe: 100 },
        { Fecha: '2025-01-15', Concepto: 'Canon', Cuenta: '413505', Haber: 100 },
        { Fecha: '2025-01-15', Concepto: 'Otro', Cuenta: '110505', Debe: 5 },
        { Fecha: '2025-01-15', Concepto: 'Otro', Cuenta: '413505', Haber: 5 },
      ],
      sinNumero,
    );
    expect(asientos).toHaveLength(2);
    expect('numeroOriginal' in asientos[0]).toBe(false);
    expect(asientos.map((a) => a.descripcion)).toEqual(['Canon', 'Otro']);
  });

  it('salta las filas sin cuenta ni monto (las que quedan al final del Excel)', () => {
    const asientos = armarAsientos(
      [
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon', Cuenta: '110505', Débito: 100 },
        { Comprobante: '', Fecha: '', Descripción: '', Cuenta: '', Débito: '', Crédito: '' },
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon', Cuenta: '413505', Crédito: 100 },
      ],
      mapeo,
    );
    expect(asientos).toHaveLength(1);
    expect(asientos[0].movimientos).toHaveLength(2);
  });

  it('🔴 sólo las claves de los DTOs — ni una más (forbidNonWhitelisted)', () => {
    const asientos = armarAsientos(
      [
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon', Cuenta: '110505', Débito: 100, Detalle: 'x', Extra: 'z' },
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon', Cuenta: '413505', Crédito: 100 },
      ],
      mapeo,
    );
    for (const a of asientos) {
      expect(Object.keys(a).filter((k) => !DTO_ASIENTO.includes(k))).toEqual([]);
      for (const m of a.movimientos) {
        expect(Object.keys(m).filter((k) => !DTO_MOVIMIENTO.includes(k))).toEqual([]);
      }
    }
  });

  it('una fecha que SheetJS ya convirtió a Date viaja como AAAA-MM-DD', () => {
    const asientos = armarAsientos(
      [
        { Comprobante: 'CE-1', Fecha: new Date(Date.UTC(2025, 0, 15)), Descripción: 'Canon', Cuenta: '110505', Débito: 100 },
        { Comprobante: 'CE-1', Fecha: new Date(Date.UTC(2025, 0, 15)), Descripción: 'Canon', Cuenta: '413505', Crédito: 100 },
      ],
      mapeo,
    );
    expect(asientos[0].fecha).toBe('2025-01-15');
  });
});

describe('nombreDeLoteDeAsientos', () => {
  it('cabe en los 60 de @MaxLength y lleva el sello de la hora', () => {
    const n = nombreDeLoteDeAsientos(new Date('2026-09-01T00:30:00Z'));
    expect(n).toBe('asientos-2026-09-01-0030');
    expect(n.length).toBeLessThanOrEqual(60);
  });
});
