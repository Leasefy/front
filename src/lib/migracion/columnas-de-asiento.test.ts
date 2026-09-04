/**
 * columnas-de-asiento — el archivo del libro diario se vuelve un lote.
 *
 * Lo que se congela: que las filas se agrupan bien en asientos (por número,
 * o por fecha+descripción cuando no hay), que el cuerpo que sale tiene SÓLO
 * las claves de `MigrarAsientoDto` / `MigrarMovimientoDto`, y que los montos
 * viajan crudos —normalizarlos es trabajo del back, que ya lo hace bien.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { mapearColumnas } from './columnas-de-tercero';
import { armarAsientos, COLUMNAS_DE_ASIENTO, nombreDeLoteDeAsientos, type CampoDeAsiento } from './columnas-de-asiento';

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

// ── La batería adversarial (P5) ─────────────────────────────────────────────

describe('encabezados del mundo real, uno por uno', () => {
  const CASOS: [string, CampoDeAsiento][] = [
    ['\uFEFFNúmero del comprobante', 'numero'], // el BOM del CSV pegado al primer encabezado
    ['N° comprobante', 'numero'],
    ['Doc', 'numero'],
    ['Nro Comprobante', 'numero'],
    ['FECHA', 'fecha'],
    ['Fecha documento', 'fecha'],
    ['Cod. Cta', 'codigoCuenta'],
    ['Código de cuenta', 'codigoCuenta'],
    ['CTA', 'codigoCuenta'],
    ['Cta contable', 'codigoCuenta'],
    ['DEBITO', 'debito'],
    ['Débitos', 'debito'],
    ['Valor Debe', 'debito'],
    ['Db', 'debito'],
    ['Créditos', 'credito'],
    ['HABER', 'credito'],
    ['Valor Haber', 'credito'],
    ['Cr', 'credito'],
    ['Observaciones', 'descripcion'],
    ['Glosa', 'descripcion'],
  ];
  it.each(CASOS)('«%s» → %s', (encabezado, campo) => {
    const m = mapearColumnas(COLUMNAS_DE_ASIENTO, [encabezado]);
    expect(m[0].campo).toBe(campo);
  });

  it('«Fecha comprobante» es la fecha, no el comprobante: el empate exacto le gana a la contención', () => {
    const m = mapearColumnas(COLUMNAS_DE_ASIENTO, ['Fecha comprobante', 'Comprobante']);
    expect(m.map((x) => x.campo)).toEqual(['fecha', 'numero']);
  });
});

describe('los topes del DTO y los datos rotos', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_ASIENTO, ['Comprobante', 'Fecha', 'Descripción', 'Cuenta', 'Débito', 'Crédito', 'Detalle']);

  it('🔴 recorta a los MaxLength del DTO: una celda gigante no puede tumbar el lote entero con un 400', () => {
    const asientos = armarAsientos(
      [
        {
          Comprobante: 'X'.repeat(100),
          Fecha: '2025-01-15' + ' '.repeat(40),
          Descripción: 'D'.repeat(1500),
          Cuenta: '9'.repeat(60),
          Débito: 100,
          Detalle: 'd'.repeat(1500),
        },
      ],
      mapeo,
    );
    expect(asientos[0].numeroOriginal!.length).toBe(60);
    expect(asientos[0].fecha.length).toBeLessThanOrEqual(30);
    expect(asientos[0].descripcion.length).toBe(1000);
    expect(asientos[0].movimientos[0].codigoCuenta.length).toBe(40);
    expect(asientos[0].movimientos[0].descripcion!.length).toBe(1000);
  });

  it('una fecha que SheetJS dejó inválida viaja vacía en vez de reventar la pantalla', () => {
    const asientos = armarAsientos(
      [{ Comprobante: 'CE-1', Fecha: new Date(NaN), Descripción: 'Canon', Cuenta: '110505', Débito: 100 }],
      mapeo,
    );
    expect(asientos[0].fecha).toBe('');
  });

  it('🔴 el mismo número en DOS fechas son DOS asientos: el consecutivo reiniciado por mes no se funde', () => {
    const asientos = armarAsientos(
      [
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon enero', Cuenta: '110505', Débito: 100 },
        { Comprobante: 'CE-1', Fecha: '2025-01-15', Descripción: 'Canon enero', Cuenta: '413505', Crédito: 100 },
        { Comprobante: 'CE-1', Fecha: '2025-02-15', Descripción: 'Canon febrero', Cuenta: '110505', Débito: 200 },
        { Comprobante: 'CE-1', Fecha: '2025-02-15', Descripción: 'Canon febrero', Cuenta: '413505', Crédito: 200 },
      ],
      mapeo,
    );
    expect(asientos).toHaveLength(2);
    expect(asientos.map((a) => a.descripcion)).toEqual(['Canon enero', 'Canon febrero']);
  });
});

describe('regresión: la muestra real entera pasa por el mapeo y el armado', () => {
  it('2.839 filas → 1.043 asientos, todos cuadrados, débitos $2.141.126.351', () => {
    let crudo = readFileSync(resolve(process.cwd(), 'claudedocs/erp-financiero/muestras/05-asientos-historicos.csv'), 'utf8');
    if (crudo.charCodeAt(0) === 0xfeff) crudo = crudo.slice(1);
    const lineas = crudo.split('\n').filter((l) => l.trim() !== '');
    // La muestra no trae comas ni comillas dentro de las celdas: split directo.
    const encabezados = lineas[0].split(',');
    const filas = lineas.slice(1).map((l) => {
      const celdas = l.replace(/\r$/, '').split(',');
      return Object.fromEntries(encabezados.map((h, i) => [h, celdas[i] ?? '']));
    });
    expect(filas).toHaveLength(2839);

    const mapeoReal = mapearColumnas(COLUMNAS_DE_ASIENTO, encabezados);
    expect(mapeoReal.filter((m) => m.campo).map((m) => m.campo).sort()).toEqual(
      ['codigoCuenta', 'credito', 'debito', 'descripcion', 'detalle', 'fecha', 'numero'].sort(),
    );

    const asientos = armarAsientos(filas, mapeoReal);
    expect(asientos).toHaveLength(1043);

    let totalDebitos = 0;
    for (const a of asientos) {
      let d = 0;
      let c = 0;
      for (const m of a.movimientos) {
        d += Number(m.debito ?? 0);
        c += Number(m.credito ?? 0);
      }
      expect(d, a.numeroOriginal).toBe(c);
      totalDebitos += d;
    }
    expect(totalDebitos).toBe(2_141_126_351);
  });
});
