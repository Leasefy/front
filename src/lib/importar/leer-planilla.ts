/**
 * Leer una planilla CUALQUIERA y decir dónde está cada campo.
 *
 * Sobre `parseSpreadsheetFile` (xlsx, xls, csv con `,` `;` o tab, ods; las
 * codificaciones; las fechas de Excel; las filas de totales) agrega lo que una
 * planilla «como venga» necesita:
 *
 *   · la HOJA: la que más campos nombra, no la primera (un libro con
 *     «Instrucciones» o «Resumen» adelante);
 *   · la FILA de los encabezados: la que más campos nombra entre las primeras
 *     40 (un reporte con logo, nombre de la inmobiliaria y fecha de corte);
 *   · un archivo SIN títulos: las columnas se llaman «Columna A, B…» y se
 *     reconocen por sus valores;
 *   · el mapeo campo → columna, por nombre y por valores
 *     (`reconocer-columnas.ts`).
 *
 * Nada se decide a ciegas: quien la usa muestra el mapeo y lo deja cambiar.
 */

import {
  leerPrimerasFilasDeCadaHoja,
  parseSpreadsheetFile,
} from '@/components/inmobiliaria/import/lib/parseFile';
import type { ParsedRow } from '@/components/inmobiliaria/import/lib/importTypes';
import {
  celdasQueNombranCampos,
  detectarFilaDeEncabezado,
  nombreDeColumnaSinTitulo,
  primeraFilaSonDatos,
  reconocerColumnas,
  type CampoReconocible,
  type Mapeo,
} from './reconocer-columnas';

export interface PlanillaLeida<C extends string> {
  archivo: string;
  hoja: string;
  hojas: string[];
  /** Fila (base 0) de los encabezados; `null` si el archivo no los trae. */
  filaDeEncabezado: number | null;
  sinEncabezados: boolean;
  encabezados: string[];
  filas: ParsedRow[];
  /** Filas de TOTALES que se apartaron (no son datos). */
  filasDeTotales: number;
  mapeo: Mapeo<C>;
  puntajes: Partial<Record<C, number>>;
}

const FILAS_PARA_BUSCAR = 40;

export async function leerPlanilla<C extends string>(
  archivo: File,
  campos: readonly CampoReconocible<C>[],
): Promise<PlanillaLeida<C>> {
  const hojas = await leerPrimerasFilasDeCadaHoja(archivo, FILAS_PARA_BUSCAR);

  // La hoja y la fila que más campos nombran.
  let elegida: { hoja: string; fila: number; n: number } | null = null;
  for (const h of hojas) {
    const fila = detectarFilaDeEncabezado(h.filas, campos, FILAS_PARA_BUSCAR);
    if (fila === null) continue;
    const n = celdasQueNombranCampos(h.filas[fila] ?? [], campos);
    if (!elegida || n > elegida.n) elegida = { hoja: h.hoja, fila, n };
  }

  if (elegida) {
    const r = await parseSpreadsheetFile(archivo, elegida.hoja, { filaDeEncabezado: elegida.fila });
    const { mapeo, puntajes } = reconocerColumnas(r.headers, r.rows, campos);
    return {
      archivo: archivo.name,
      hoja: elegida.hoja,
      hojas: r.sheetNames,
      filaDeEncabezado: elegida.fila,
      sinEncabezados: false,
      encabezados: r.headers,
      filas: r.rows,
      filasDeTotales: r.filasDeTotales?.length ?? 0,
      mapeo,
      puntajes,
    };
  }

  // Ninguna fila nombra dos campos. ¿Es un archivo sin títulos?
  const conDatos = hojas.find((h) => h.filas.some((f) => f.some((c) => c.trim() !== '')));
  const primera = conDatos?.filas.find((f) => f.some((c) => c.trim() !== ''));
  if (conDatos && primera && primeraFilaSonDatos(primera, campos)) {
    const todas =
      (await leerPrimerasFilasDeCadaHoja(archivo, Number.MAX_SAFE_INTEGER)).find((h) => h.hoja === conDatos.hoja)
        ?.filas ?? [];
    const ancho = todas.reduce((m, f) => Math.max(m, f.length), 0);
    const encabezados = Array.from({ length: ancho }, (_, i) => nombreDeColumnaSinTitulo(i));
    const filas: ParsedRow[] = [];
    todas.forEach((f, i) => {
      if (!f.some((c) => c.trim() !== '')) return;
      const fila: ParsedRow = { _rowIndex: i };
      encabezados.forEach((e, j) => {
        fila[e] = f[j] ?? '';
      });
      filas.push(fila);
    });
    const { mapeo, puntajes } = reconocerColumnas(encabezados, filas, campos, { sinEncabezados: true });
    return {
      archivo: archivo.name,
      hoja: conDatos.hoja,
      hojas: hojas.map((h) => h.hoja),
      filaDeEncabezado: null,
      sinEncabezados: true,
      encabezados,
      filas,
      filasDeTotales: 0,
      mapeo,
      puntajes,
    };
  }

  // Lo de siempre: la primera fila de la primera hoja. La persona elige las
  // columnas en la vista previa.
  const r = await parseSpreadsheetFile(archivo);
  const { mapeo, puntajes } = reconocerColumnas(r.headers, r.rows, campos);
  return {
    archivo: archivo.name,
    hoja: r.sheetNames[0] ?? '',
    hojas: r.sheetNames,
    filaDeEncabezado: 0,
    sinEncabezados: false,
    encabezados: r.headers,
    filas: r.rows,
    filasDeTotales: r.filasDeTotales?.length ?? 0,
    mapeo,
    puntajes,
  };
}
