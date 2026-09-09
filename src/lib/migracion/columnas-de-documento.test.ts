/**
 * El archivo REAL de comprobantes: sus 16 columnas se reconocen y las celdas
 * viajan como el back las espera.
 *
 * 🔴 Los ENCABEZADOS son los reales; las FILAS son inventadas con la misma
 * forma. Los archivos con datos de personas no entran al repo.
 */

import { describe, expect, it } from 'vitest';
import { armarDocumentos, COLUMNAS_DE_DOCUMENTO } from './columnas-de-documento';
import { mapearColumnas, obligatoriasSinMapear } from './columnas-de-tercero';

/** El encabezado de «Accounting Documents.csv», en su orden. */
export const ENCABEZADO_DOCUMENTOS = [
  'Prefijo',
  'Consecutivo',
  'Tipo Doc.',
  'Fecha',
  'Concepto',
  'Débitos',
  'Créditos',
  'Balance',
  'Descuadrado',
  'Anulado',
  '¿Es anticipo?',
  'Nombre Tercero Anticipo',
  '¿anticipo aplicado?',
  'Valor Restante del Anticipo',
  'Creado por',
  'Fecha creación',
];

const FILA_INVENTADA: Record<string, unknown> = {
  Prefijo: 'CI',
  Consecutivo: '30,246',
  'Tipo Doc.': 'Comprobante de Ingreso',
  Fecha: '2026-09-08',
  Concepto: 'INGRESO - MARIA LOPEZ CANON SEPTIEMBRE REF 43090971 ONEPAY',
  'Débitos': '$2,662,000.00',
  'Créditos': '$2,662,000.00',
  Balance: '$0.00',
  Descuadrado: 'NO',
  Anulado: 'NO',
  '¿Es anticipo?': 'NO',
  'Nombre Tercero Anticipo': '',
  '¿anticipo aplicado?': 'NO',
  'Valor Restante del Anticipo': '$0.00',
  'Creado por': 'YINETH VALENTINA OBANDO PARRA',
  'Fecha creación': '2026-09-08 10:36:51',
};

describe('comprobantes: el encabezado real', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ENCABEZADO_DOCUMENTOS);
  const porColumna = Object.fromEntries(mapeo.map((m) => [m.columna, m.campo]));

  it('no deja NINGUNA de las 16 columnas sin mapear', () => {
    expect(mapeo.filter((m) => !m.campo).map((m) => m.columna)).toEqual([]);
  });

  it('cada columna cae en su campo', () => {
    expect(porColumna).toEqual({
      Prefijo: 'prefijo',
      Consecutivo: 'consecutivo',
      'Tipo Doc.': 'tipo',
      Fecha: 'fecha',
      Concepto: 'concepto',
      'Débitos': 'debitos',
      'Créditos': 'creditos',
      Balance: 'balance',
      Descuadrado: 'descuadrado',
      Anulado: 'anulado',
      '¿Es anticipo?': 'esAnticipo',
      'Nombre Tercero Anticipo': 'terceroAnticipo',
      '¿anticipo aplicado?': 'anticipoAplicado',
      'Valor Restante del Anticipo': 'valorRestanteAnticipo',
      'Creado por': 'creadoPor',
      'Fecha creación': 'fechaCreacionOrigen',
    });
  });

  it('«Fecha» y «Fecha creación» no se pelean la misma columna', () => {
    expect(porColumna['Fecha']).toBe('fecha');
    expect(porColumna['Fecha creación']).toBe('fechaCreacionOrigen');
  });

  it('no falta ninguna obligatoria', () => {
    expect(obligatoriasSinMapear(COLUMNAS_DE_DOCUMENTO, mapeo)).toEqual([]);
  });
});

describe('comprobantes: lo que viaja', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ENCABEZADO_DOCUMENTOS);

  it('manda los montos y las banderas CRUDOS: el back los normaliza y dice qué no entendió', () => {
    const [doc] = armarDocumentos([FILA_INVENTADA], mapeo);
    expect(doc).toEqual({
      prefijo: 'CI',
      consecutivo: '30,246',
      tipo: 'Comprobante de Ingreso',
      fecha: '2026-09-08',
      concepto: 'INGRESO - MARIA LOPEZ CANON SEPTIEMBRE REF 43090971 ONEPAY',
      debitos: '$2,662,000.00',
      creditos: '$2,662,000.00',
      balance: '$0.00',
      descuadrado: 'NO',
      anulado: 'NO',
      esAnticipo: 'NO',
      anticipoAplicado: 'NO',
      valorRestanteAnticipo: '$0.00',
      creadoPor: 'YINETH VALENTINA OBANDO PARRA',
      fechaCreacionOrigen: '2026-09-08 10:36:51',
    });
  });

  it('las celdas vacías no viajan como «»', () => {
    const [doc] = armarDocumentos([FILA_INVENTADA], mapeo);
    expect(doc).not.toHaveProperty('terceroAnticipo');
  });

  it('salta la fila vacía que Excel deja al final', () => {
    const vacia = Object.fromEntries(ENCABEZADO_DOCUMENTOS.map((h) => [h, '']));
    expect(armarDocumentos([vacia, FILA_INVENTADA], mapeo)).toHaveLength(1);
  });

  it('un concepto larguísimo se recorta al tope del DTO en vez de tumbar el lote', () => {
    const [doc] = armarDocumentos(
      [{ ...FILA_INVENTADA, Concepto: 'x'.repeat(5_000) }],
      mapeo,
    );
    expect(String(doc.concepto)).toHaveLength(4_000);
  });

  it('un comprobante anulado llega marcado, no se descarta', () => {
    const [doc] = armarDocumentos([{ ...FILA_INVENTADA, Anulado: 'SI' }], mapeo);
    expect(doc.anulado).toBe('SI');
  });
});
