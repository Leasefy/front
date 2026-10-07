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

/* QA-MIG-B (04-10) — comprobantes de SIIGO con el prefijo pegado al número. */
describe('QA-MIG-B — prefijo y número en la misma celda', () => {
  it('«Comprobante: FV-1-5521» sin columna de prefijo se parte en «FV-1» y 5521', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ['Comprobante', 'Fecha', 'Detalle', 'Total débito', 'Total crédito']);
    expect(mapeo.find((m) => m.columna === 'Comprobante')?.campo).toBe('consecutivo');
    const [d] = armarDocumentos([{ Comprobante: 'FV-1-5521', Fecha: '2026-09-08', Detalle: 'Factura', 'Total débito': '608910', 'Total crédito': '608910' }], mapeo);
    expect(d).toMatchObject({ prefijo: 'FV-1', consecutivo: '5521', fecha: '2026-09-08' });
  });

  it('con columna de prefijo no se toca el consecutivo', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ['Prefijo', 'Consecutivo', 'Fecha']);
    const [d] = armarDocumentos([{ Prefijo: 'CE', Consecutivo: '26,766', Fecha: '2026-09-08' }], mapeo);
    expect(d).toMatchObject({ prefijo: 'CE', consecutivo: '26,766' });
  });

  it('un consecutivo sin prefijo pegado viaja tal cual (el back dice que falta el prefijo)', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ['Consecutivo', 'Fecha']);
    const [d] = armarDocumentos([{ Consecutivo: '5521', Fecha: '2026-09-08' }], mapeo);
    expect(d).toMatchObject({ prefijo: '', consecutivo: '5521' });
  });
});

describe('QA-MIG-B — el tercero y el estado de los comprobantes', () => {
  it('🔴 «Tercero» y «Estado: Anulado» de SIIGO viajan (antes se ignoraban y el anulado entraba vigente)', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ['Comprobante', 'Fecha', 'Tercero', 'Detalle', 'Total débito', 'Total crédito', 'Estado']);
    const campo = (c: string) => mapeo.find((m) => m.columna === c)?.campo;
    expect([campo('Tercero'), campo('Estado')]).toEqual(['terceroDocumento', 'anulado']);
    const [d] = armarDocumentos(
      [{ Comprobante: 'CE-1-1202', Fecha: '2026-09-09', Tercero: '43111222 Gloria Henao', Detalle: 'Egreso', 'Total débito': '500000', 'Total crédito': '500000', Estado: 'Anulado' }],
      mapeo,
    );
    expect(d).toMatchObject({ prefijo: 'CE-1', consecutivo: '1202', terceroDocumento: '43111222 Gloria Henao', anulado: 'Anulado' });
  });

  it('el archivo de Portofino sigue mapeando igual (su «Nombre Tercero Anticipo» no es el tercero)', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, ['Prefijo', 'Consecutivo', 'Tipo Doc.', 'Fecha', 'Concepto', 'Débitos', 'Créditos', 'Balance', 'Descuadrado', 'Anulado', '¿Es anticipo?', 'Nombre Tercero Anticipo', '¿anticipo aplicado?', 'Valor Restante del Anticipo', 'Creado por', 'Fecha creación']);
    expect(mapeo.find((m) => m.columna === 'Nombre Tercero Anticipo')?.campo).toBe('terceroAnticipo');
    expect(mapeo.some((m) => m.campo === 'terceroDocumento' || m.campo === 'terceroNombre')).toBe(false);
  });
});
