/**
 * El lector de CSV grandes: separador, BOM, comillas con saltos de línea y
 * lotes.
 *
 * Los casos vienen del archivo real de comprobantes (`;`, comillas, saltos
 * dentro de una celda), con datos inventados.
 */

import { describe, expect, it } from 'vitest';
import {
  consumir,
  estadoInicial,
  leerCsvEnTrozos,
  limpiarEncabezados,
  separadorDeLinea,
  ultimaFila,
} from './csv-en-trozos';

/** Un `Blob` de texto: es lo que le llega a la función desde un `<input type=file>`. */
function archivo(texto: string): Blob {
  return new Blob([texto], { type: 'text/csv' });
}

async function leerTodo(texto: string, tamanoDeLote = 5_000) {
  const filas: Array<Record<string, string>> = [];
  const lotes: number[] = [];
  const r = await leerCsvEnTrozos(archivo(texto), {
    tamanoDeLote,
    onLote: (l) => {
      lotes.push(l.length);
      filas.push(...l);
    },
  });
  return { ...r, todas: filas, lotes };
}

describe('separadorDeLinea', () => {
  it('elige el punto y coma del export en español', () => {
    expect(separadorDeLinea('"Prefijo";"Consecutivo";"Tipo Doc."')).toBe(';');
  });

  it('las comas de adentro de una celda no cuentan', () => {
    expect(separadorDeLinea('"ALFA S.A.S, BIC";"1";"2"')).toBe(';');
  });

  it('un CSV de comas de verdad sigue siendo de comas', () => {
    expect(separadorDeLinea('a,b,c')).toBe(',');
  });

  it('una sola columna cae a la coma sin inventar nada', () => {
    expect(separadorDeLinea('Nombre')).toBe(',');
  });
});

describe('consumir', () => {
  it('un campo citado puede traer el separador adentro', () => {
    const filas = consumir('"a;b";c\n', ';', estadoInicial());
    expect(filas).toEqual([['a;b', 'c']]);
  });

  it('un campo citado puede traer saltos de línea adentro', () => {
    const filas = consumir('"linea 1\r\nlinea 2";x\n', ';', estadoInicial());
    expect(filas).toEqual([['linea 1\r\nlinea 2', 'x']]);
  });

  it('las comillas escapadas quedan como una sola', () => {
    const filas = consumir('"dijo ""hola""";b\n', ';', estadoInicial());
    expect(filas).toEqual([['dijo "hola"', 'b']]);
  });

  it('«\\r\\n» es UN fin de línea, no dos filas', () => {
    const filas = consumir('a;b\r\nc;d\r\n', ';', estadoInicial());
    expect(filas).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('una fila partida entre dos pedazos se arma igual', () => {
    const estado = estadoInicial();
    expect(consumir('a;"parte 1', ';', estado)).toEqual([]);
    expect(consumir(' parte 2";c\n', ';', estado)).toEqual([['a', 'parte 1 parte 2', 'c']]);
  });

  it('el último campo del archivo no se pierde aunque venga vacío', () => {
    const estado = estadoInicial();
    consumir('a;b;', ';', estado);
    expect(ultimaFila(estado)).toEqual(['a', 'b', '']);
  });
});

describe('limpiarEncabezados', () => {
  it('colapsa espacios y numera los repetidos', () => {
    expect(limpiarEncabezados(['  Fecha  ', 'Fecha', 'Tipo\nDoc.'])).toEqual([
      'Fecha',
      'Fecha (2)',
      'Tipo Doc.',
    ]);
  });

  it('una columna sin nombre se puede seguir señalando', () => {
    expect(limpiarEncabezados(['a', ''])).toEqual(['a', '(columna 2)']);
  });
});

describe('leerCsvEnTrozos', () => {
  it('lee el encabezado y las filas con el separador del archivo', async () => {
    const r = await leerTodo('"Prefijo";"Consecutivo"\n"CE";26,766\n"FAC";57,521\n');
    expect(r.separador).toBe(';');
    expect(r.encabezados).toEqual(['Prefijo', 'Consecutivo']);
    expect(r.filas).toBe(2);
    expect(r.todas).toEqual([
      { Prefijo: 'CE', Consecutivo: '26,766' },
      { Prefijo: 'FAC', Consecutivo: '57,521' },
    ]);
  });

  it('le saca el BOM al primer encabezado', async () => {
    const r = await leerTodo('﻿"Prefijo";"Fecha"\n"CE";"2026-09-08"\n');
    expect(r.encabezados).toEqual(['Prefijo', 'Fecha']);
    expect(r.todas[0]).toEqual({ Prefijo: 'CE', Fecha: '2026-09-08' });
  });

  it('una celda con salto de línea no parte la fila', async () => {
    const r = await leerTodo(
      '"Consecutivo";"Observaciones";"Uso"\n"1";"Abril: 5%.\nOctubre: 5%.";"Vivienda"\n',
    );
    expect(r.filas).toBe(1);
    expect(r.todas[0].Observaciones).toBe('Abril: 5%.\nOctubre: 5%.');
    expect(r.todas[0].Uso).toBe('Vivienda');
  });

  it('la última fila sin salto de línea final también entra', async () => {
    const r = await leerTodo('a;b\n1;2');
    expect(r.todas).toEqual([{ a: '1', b: '2' }]);
  });

  it('descarta las filas vacías que Excel deja al final', async () => {
    const r = await leerTodo('a;b\n1;2\n;\n\n');
    expect(r.filas).toBe(1);
  });

  /*
   * 🔴 El tope de lote es un TOPE. Un pedazo de 1 MB del archivo real trae
   * ~6.500 filas: si el corte fuera al terminar el pedazo, el lote saldría de
   * 6.559 y el back —que topa en 5.000— devolvería 400 para todo el lote.
   */
  it('ningún lote pasa del tamaño pedido, aunque el pedazo traiga más filas', async () => {
    const filas = Array.from({ length: 7 }, (_, i) => `${i};x`).join('\n');
    const r = await leerTodo(`a;b\n${filas}\n`, 3);
    expect(r.filas).toBe(7);
    expect(r.lotes).toEqual([3, 3, 1]);
    expect(r.lotes.reduce((s, n) => s + n, 0)).toBe(7);
  });

  it('se puede cancelar y dice que se canceló', async () => {
    const r = await leerCsvEnTrozos(archivo('a;b\n1;2\n'), {
      onLote: () => {},
      cancelado: () => true,
    });
    expect(r.cancelado).toBe(true);
    expect(r.filas).toBe(0);
  });

  it('una fila con menos columnas que el encabezado no corre las demás', async () => {
    const r = await leerTodo('a;b;c\n1;2\n');
    expect(r.todas[0]).toEqual({ a: '1', b: '2', c: '' });
  });
});
