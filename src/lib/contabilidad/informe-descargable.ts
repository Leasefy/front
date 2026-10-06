/**
 * 🔴 QA-FACT-CONTA-95 r2 · CB-C-13 (main 06-10, con la recomendada; Nico la revisa):
 * los informes que el contador firma —balance de prueba, mayor, auxiliar,
 * auxiliar por tercero, estado de cuenta de un tercero, P&G y balance general—
 * no se podían bajar (hallazgo CB-R29: sólo el libro y la exógena en CSV).
 *
 * Ahora cada uno ofrece «Descargar en Excel» e «Imprimir o guardar en PDF».
 * Lo puro vive acá: el nombre del archivo (legible, con el período, sin UUID),
 * el período en palabras y las filas del Excel. Cada informe arma SUS tablas
 * con lo que ya leyó del back —TODAS las filas, no sólo la página que se ve—,
 * con las columnas como en pantalla y la plata como NÚMERO.
 */
import { diaEnFrase } from './alertas';

/** Una celda: texto, un número (la plata va como número) o vacía. */
export type CeldaDelInforme = string | number | null;

export interface TablaDelInforme {
  /** Un subtítulo, cuando el informe trae varias tablas (P&G: ingresos, gastos…). */
  titulo?: string;
  columnas: string[];
  filas: CeldaDelInforme[][];
  /** Totales, debajo de las filas. */
  pie?: CeldaDelInforme[][];
}

export interface PeriodoDelInforme {
  desde?: string | null;
  hasta?: string | null;
}

/** «balance de prueba» → `balance-de-prueba`: sin tildes, sin eñes, sin espacios. */
export function enUnaPalabra(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DIA = /^\d{4}-\d{2}-\d{2}/;

/**
 * El nombre del archivo: el informe y su período, nada más.
 * `balance-de-prueba-del-2026-10-01-al-2026-10-31.xlsx`; sólo con «hasta»,
 * `balance-general-al-2026-10-31.pdf`; sin fechas, `libro-mayor.xlsx`.
 */
export function nombreDelArchivoDelInforme(
  informe: string,
  periodo: PeriodoDelInforme,
  extension: 'xlsx' | 'pdf',
): string {
  const desde = periodo.desde && DIA.test(periodo.desde) ? periodo.desde.slice(0, 10) : null;
  const hasta = periodo.hasta && DIA.test(periodo.hasta) ? periodo.hasta.slice(0, 10) : null;
  const cuando = desde && hasta ? `-del-${desde}-al-${hasta}` : hasta ? `-al-${hasta}` : desde ? `-desde-el-${desde}` : '';
  return `${enUnaPalabra(informe)}${cuando}.${extension}`;
}

/** El período como lo lee una persona: «Del 1 de octubre de 2026 al 31 de octubre de 2026». */
export function periodoEnPalabras(periodo: PeriodoDelInforme): string {
  const desde = periodo.desde && DIA.test(periodo.desde) ? diaEnFrase(periodo.desde) : null;
  const hasta = periodo.hasta && DIA.test(periodo.hasta) ? diaEnFrase(periodo.hasta) : null;
  if (desde && hasta) return `Del ${desde} al ${hasta}`;
  if (hasta) return `Al ${hasta}`;
  if (desde) return `Desde el ${desde}`;
  return 'Todo el libro, sin fechas';
}

export interface EncabezadoDelInforme {
  inmobiliaria: string | null;
  informe: string;
  periodo: PeriodoDelInforme;
}

/**
 * Las filas del Excel: el encabezado (inmobiliaria, informe, período), una
 * línea en blanco y cada tabla con su subtítulo, sus columnas, sus filas y su
 * pie, separadas por una línea en blanco. Los números quedan números.
 */
export function filasDelExcel(
  encabezado: EncabezadoDelInforme,
  tablas: readonly TablaDelInforme[],
): CeldaDelInforme[][] {
  const filas: CeldaDelInforme[][] = [];
  if (encabezado.inmobiliaria) filas.push([encabezado.inmobiliaria]);
  filas.push([encabezado.informe]);
  filas.push([periodoEnPalabras(encabezado.periodo)]);
  for (const t of tablas) {
    filas.push([]);
    if (t.titulo) filas.push([t.titulo]);
    filas.push([...t.columnas]);
    for (const f of t.filas) filas.push(f.map(limpiar));
    for (const f of t.pie ?? []) filas.push(f.map(limpiar));
  }
  return filas;
}

/** Un número que no es número (NaN, infinito) no se escribe como 0: va vacío. */
function limpiar(c: CeldaDelInforme): CeldaDelInforme {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  return c;
}

/**
 * Baja el Excel. `xlsx` (SheetJS) se carga sólo al pedirlo. La plata lleva el
 * formato de miles; con centavos, dos decimales.
 */
export async function descargarEnExcel(
  encabezado: EncabezadoDelInforme,
  tablas: readonly TablaDelInforme[],
): Promise<string> {
  const XLSX = await import('xlsx');
  const filas = filasDelExcel(encabezado, tablas);
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  for (const direccion of Object.keys(hoja)) {
    if (direccion.startsWith('!')) continue;
    const celda = hoja[direccion] as { t?: string; v?: unknown; z?: string };
    if (celda.t === 'n' && typeof celda.v === 'number') {
      celda.z = Number.isInteger(celda.v) ? '#,##0' : '#,##0.00';
    }
  }
  const anchos = Math.max(...filas.map((f) => f.length), 1);
  hoja['!cols'] = Array.from({ length: anchos }, (_, i) => ({ wch: i === 0 ? 16 : 22 }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, encabezado.informe.slice(0, 31));
  const nombre = nombreDelArchivoDelInforme(encabezado.informe, encabezado.periodo, 'xlsx');
  XLSX.writeFile(libro, nombre);
  return nombre;
}
