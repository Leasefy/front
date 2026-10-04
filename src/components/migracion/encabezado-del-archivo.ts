/**
 * ¿En qué hoja y en qué fila empieza la tabla de verdad?
 *
 * 🔴 QA-MIG-B (04-10). Los exports contables de SIIGO, World Office o Helisa
 * NO empiezan en la fila 1: traen arriba el nombre de la empresa, el NIT, el
 * nombre del informe y el rango de fechas, y recién en la fila 5 o 6 los
 * encabezados. Leído desde la fila 1, el plan de cuentas salía con columnas
 * «INMOBILIARIA… / __EMPTY / __EMPTY (1)» y CERO cuentas — un archivo bueno
 * frenado entero sin decir por qué. Lo mismo un libro de Excel cuya primera
 * hoja es «Instrucciones» o «Resumen».
 *
 * Se mira cada hoja, sus primeras filas, y se elige la (hoja, fila) cuyos
 * encabezados reconoce el MISMO auto-mapeo de la pantalla (`mapearColumnas`):
 * la que más columnas obligatorias encuentra y, a igualdad, la que más
 * columnas reconoce. Ante ninguna evidencia se queda donde estaba (hoja 1,
 * fila 1): no se adivina una tabla que no se reconoce.
 *
 * Sin React y sin estado: la pantalla llama `elegirHojaYEncabezado` y le pasa
 * el resultado a `parseSpreadsheetFile(archivo, hoja, { filaDeEncabezado })`.
 */

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import { mapearColumnas } from '@/lib/migracion/columnas-de-tercero';

/** Cuántas filas de arriba se miran por hoja buscando los encabezados. */
export const FILAS_A_MIRAR = 30;

export interface HojaYEncabezado {
  /** La hoja elegida (su nombre). */
  hoja: string;
  /** Fila (0-based) de los encabezados dentro de esa hoja. */
  filaDeEncabezado: number;
  /** Todas las hojas del libro, para ofrecer otra. */
  hojas: string[];
  /** Columnas obligatorias que se reconocieron en esa fila. */
  obligatorias: number;
}

/**
 * Puntaje de una fila como encabezado: cuántas obligatorias y cuántas
 * columnas en total reconoce el auto-mapeo.
 */
export function puntajeDeEncabezado(
  celdas: readonly unknown[],
  columnas: readonly ColumnaDePlantilla[],
): { obligatorias: number; reconocidas: number } {
  const textos = celdas
    .map((c) => (c === null || c === undefined ? '' : String(c).replace(/\s+/g, ' ').trim()))
    .filter((t) => t !== '');
  // Una fila de título suele tener UNA celda llena; una tabla, varias.
  if (textos.length < 2) return { obligatorias: 0, reconocidas: 0 };
  const mapeo = mapearColumnas(columnas, textos);
  const camposObligatorios = new Set(columnas.filter((c) => c.obligatoria).map((c) => c.campo));
  const reconocidas = mapeo.filter((m) => m.campo !== null);
  return {
    obligatorias: reconocidas.filter((m) => camposObligatorios.has(m.campo as string)).length,
    reconocidas: reconocidas.length,
  };
}

/**
 * La mejor (hoja, fila) entre las primeras filas de cada hoja.
 * `filasPorHoja`: nombre de hoja → primeras filas como matrices de celdas.
 */
export function mejorHojaYEncabezado(
  filasPorHoja: ReadonlyArray<{ hoja: string; filas: readonly (readonly unknown[])[] }>,
  columnas: readonly ColumnaDePlantilla[],
): HojaYEncabezado {
  const hojas = filasPorHoja.map((h) => h.hoja);
  let mejor: HojaYEncabezado & { reconocidas: number } = {
    hoja: hojas[0] ?? '',
    filaDeEncabezado: 0,
    hojas,
    obligatorias: 0,
    reconocidas: 0,
  };
  for (const { hoja, filas } of filasPorHoja) {
    filas.slice(0, FILAS_A_MIRAR).forEach((celdas, i) => {
      const p = puntajeDeEncabezado(celdas, columnas);
      if (
        p.obligatorias > mejor.obligatorias ||
        (p.obligatorias === mejor.obligatorias && p.reconocidas > mejor.reconocidas)
      ) {
        mejor = { hoja, filaDeEncabezado: i, hojas, ...p };
      }
    });
  }
  const { reconocidas: _r, ...salida } = mejor;
  void _r;
  return salida;
}

const EXTENSIONES_DE_TEXTO = ['csv', 'txt', 'tsv'];

/** El mismo criterio del lector de la casa: UTF-8 (con o sin BOM) y si no, Windows-1252. */
function decodificar(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Lee las primeras filas de cada hoja del archivo y elige dónde empieza la
 * tabla. Si el archivo no se puede leer, devuelve la hoja 1 y la fila 1: el
 * lector de siempre dirá qué le pasa al archivo con su propio mensaje.
 */
export async function elegirHojaYEncabezado(
  archivo: File,
  columnas: readonly ColumnaDePlantilla[],
  /** Sólo esta hoja (la persona eligió otra en la pantalla). */
  soloHoja?: string,
): Promise<HojaYEncabezado> {
  try {
    const XLSX = await import('xlsx');
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    const buffer = await archivo.arrayBuffer();
    const libro = EXTENSIONES_DE_TEXTO.includes(ext)
      ? XLSX.read(decodificar(buffer), { type: 'string', sheetRows: FILAS_A_MIRAR + 1 })
      : XLSX.read(buffer, { type: 'array', sheetRows: FILAS_A_MIRAR + 1 });
    const filasPorHoja = libro.SheetNames.filter((hoja) => !soloHoja || hoja === soloHoja).map((hoja) => ({
      hoja,
      filas: libro.Sheets[hoja]
        ? XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[hoja], { header: 1, raw: false, defval: '' })
        : [],
    }));
    return { ...mejorHojaYEncabezado(filasPorHoja, columnas), hojas: libro.SheetNames };
  } catch {
    return { hoja: '', filaDeEncabezado: 0, hojas: [], obligatorias: 0 };
  }
}

/**
 * La frase que dice de dónde se leyó, sólo cuando NO fue lo obvio (primera
 * hoja, primera fila). `null` = nada que decir.
 */
export function fraseDeDondeSeLeyo(h: HojaYEncabezado): string | null {
  const otraHoja = h.hojas.length > 1 && h.hoja !== h.hojas[0];
  const otraFila = h.filaDeEncabezado > 0;
  const titulos = 'lo de arriba son títulos del informe';
  if (otraHoja && otraFila) {
    return `Leímos la hoja «${h.hoja}» desde la fila ${h.filaDeEncabezado + 1}, donde están los encabezados; ${titulos}.`;
  }
  if (otraHoja) {
    return `Leímos la hoja «${h.hoja}»: la primera («${h.hojas[0]}») no trae una tabla que reconozcamos.`;
  }
  if (otraFila) {
    return `Leímos desde la fila ${h.filaDeEncabezado + 1}, donde están los encabezados; ${titulos}.`;
  }
  return null;
}

export interface TablaDelArchivo {
  rows: Record<string, unknown>[];
  headers: string[];
  donde: HojaYEncabezado;
  /** De dónde se leyó, cuando no fue lo obvio. */
  frase: string | null;
  /** `archivo` = no trae nada; `encabezados` = sólo la fila de títulos. */
  vacio: 'archivo' | 'encabezados' | null;
}

/**
 * Lee el archivo desde la tabla de verdad: elige hoja y fila de encabezados
 * y se lo pasa al lector de la casa. Los errores del lector suben tal cual
 * (ya traen su frase).
 */
export async function leerTablaDelArchivo(
  archivo: File,
  columnas: readonly ColumnaDePlantilla[],
  soloHoja?: string,
): Promise<TablaDelArchivo> {
  const donde = await elegirHojaYEncabezado(archivo, columnas, soloHoja);
  const r = await parseSpreadsheetFile(archivo, donde.hoja || undefined, {
    filaDeEncabezado: donde.filaDeEncabezado,
  });
  const hojas = donde.hojas.length ? donde.hojas : r.sheetNames;
  const elegida = { ...donde, hoja: donde.hoja || r.sheetNames[0] || '', hojas };
  return {
    rows: r.rows as Record<string, unknown>[],
    headers: r.headers,
    donde: elegida,
    frase: fraseDeDondeSeLeyo(elegida),
    vacio: r.rows.length > 0 ? null : r.headers.length > 0 ? 'encabezados' : 'archivo',
  };
}

/** La frase de un archivo sin filas, con el nombre de lo que se esperaba. */
export function fraseDelArchivoVacio(
  nombre: string,
  vacio: 'archivo' | 'encabezados',
  queSeEsperaba: string,
): string {
  return vacio === 'archivo'
    ? `«${nombre}» está vacío: no trae ninguna fila. Expórtalo de nuevo desde tu sistema y vuelve a subirlo.`
    : `«${nombre}» sólo trae los encabezados: no hay ${queSeEsperaba} que leer. Revisa que exportaste con datos.`;
}
