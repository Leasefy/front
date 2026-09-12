/**
 * que-archivo-contable-es.test.ts — el archivo en la puerta equivocada.
 *
 * 🔴 Nico, 2026-09-12, con el export de comprobantes metido en «Subir el
 * libro diario»: «¿qué es código de cuenta? ¿y por qué no lo trae, o qué pasa
 * ahí con eso?». No lo trae porque no puede: un comprobante es una fila por
 * documento y el código de cuenta vive en cada línea del asiento.
 */

import { describe, it, expect } from 'vitest';
import {
  hayQueAvisarDeOtraPuerta,
  queArchivoContableEs,
  SENALES_PARA_AFIRMAR,
} from './que-archivo-contable-es';

/*
 * Los encabezados REALES que Nico tenía en pantalla, leídos de la captura.
 * El archivo no se copia a este repo (son datos de personas de verdad); los
 * encabezados sí son públicos y son lo único que esta función mira.
 */
const COMPROBANTES_DE_NICO = [
  'Prefijo',
  'Consecutivo',
  'Tipo Doc',
  'Fecha',
  'Concepto',
  'Debitos',
  'Creditos',
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

const LIBRO_DIARIO = ['Comprobante', 'Fecha', 'Descripcion', 'Cuenta', 'Debito', 'Credito'];

describe('queArchivoContableEs', () => {
  it('🔴 reconoce el export de comprobantes de Nico y lo dice', () => {
    const r = queArchivoContableEs(COMPROBANTES_DE_NICO);

    expect(r.forma).toBe('comprobantes');
    // Y dice CUÁLES lo delatan: un veredicto sin evidencia no se puede discutir.
    expect(r.senales).toContain('Prefijo');
    expect(r.senales).toContain('Balance');
    expect(r.senales).toContain('Anulado');
    expect(r.senales.length).toBeGreaterThanOrEqual(SENALES_PARA_AFIRMAR);
  });

  it('un libro diario de verdad es libro diario', () => {
    expect(queArchivoContableEs(LIBRO_DIARIO).forma).toBe('libro-diario');
  });

  /*
   * 🔴 El código de cuenta manda sobre todo lo demás: es la única columna que
   * dice a dónde va la plata. Un libro diario exportado con columnas de más
   * —hasta con «Anulado» y «Creado por»— sigue siendo un libro diario.
   */
  it('con código de cuenta es libro diario aunque traiga columnas de comprobante', () => {
    const r = queArchivoContableEs([...LIBRO_DIARIO, 'Anulado', 'Creado por', 'Balance']);

    expect(r.forma).toBe('libro-diario');
  });

  it('los alias del código de cuenta también cuentan: «Cta», «Codigo PUC», «Cuenta contable»', () => {
    for (const alias of ['Cta', 'Codigo PUC', 'Cuenta Contable', 'Cod Cuenta']) {
      expect(queArchivoContableEs(['Fecha', 'Concepto', alias, 'Debe', 'Haber']).forma).toBe(
        'libro-diario',
      );
    }
  });

  /*
   * 🔴 Ante la duda NO se dice nada. Mandar a alguien a la otra puerta con un
   * archivo que sí era de ésta cuesta más que quedarse callado.
   */
  it('sin evidencia suficiente no afirma nada', () => {
    // Sin código de cuenta, pero con UNA sola señal de comprobante: podría ser
    // un libro diario exportado a mano al que le falta la columna.
    expect(queArchivoContableEs(['Fecha', 'Concepto', 'Debe', 'Haber', 'Anulado']).forma).toBeNull();
  });

  it('dos señales todavía no alcanzan; la tercera sí', () => {
    const base = ['Fecha', 'Concepto', 'Anulado', 'Balance'];
    expect(queArchivoContableEs(base).forma).toBeNull();
    expect(queArchivoContableEs([...base, 'Prefijo']).forma).toBe('comprobantes');
  });

  it('un archivo vacío no dice nada y no revienta', () => {
    expect(queArchivoContableEs([])).toEqual({ forma: null, senales: [] });
  });
});

describe('hayQueAvisarDeOtraPuerta', () => {
  const sinMapear = COMPROBANTES_DE_NICO.map(() => ({ campo: null }));

  it('avisa cuando el archivo es de comprobantes y nadie señaló el código de cuenta', () => {
    expect(hayQueAvisarDeOtraPuerta(COMPROBANTES_DE_NICO, sinMapear)?.forma).toBe('comprobantes');
  });

  /*
   * 🔴 Deja de avisar en cuanto la persona señala a mano una columna como
   * código de cuenta: ahí ya contestó la pregunta —el archivo SÍ lo trae, con
   * un encabezado que no reconocimos— y seguir insistiendo sería discutirle
   * algo que ella sabe mejor.
   */
  it('deja de avisar en cuanto alguien mapea el código de cuenta a mano', () => {
    const mapeado = COMPROBANTES_DE_NICO.map((c) => ({
      campo: c === 'Concepto' ? 'codigoCuenta' : null,
    }));

    expect(hayQueAvisarDeOtraPuerta(COMPROBANTES_DE_NICO, mapeado)).toBeNull();
  });

  it('con un libro diario no avisa nada', () => {
    expect(hayQueAvisarDeOtraPuerta(LIBRO_DIARIO, LIBRO_DIARIO.map(() => ({ campo: null })))).toBeNull();
  });
});