/**
 * El libro en CSV, para el contador.
 *
 * El back no exporta el libro (`AsientosController` sólo lista), así que el
 * archivo se arma acá con lo que devuelve `GET /asientos`: una línea por
 * MOVIMIENTO, no por asiento, porque eso es lo que el contador pega en su
 * software —cada línea con su cuenta y su lado—. Un asiento de tres líneas son
 * tres filas con el mismo número.
 *
 * Separador `;` y BOM UTF-8: es lo que Excel en español abre bien de un clic
 * (con `,` mete todo en una columna). Los montos van en pesos enteros, sin
 * separador de miles, para que el software del contador los lea como número.
 */

import type { AsientoContable, FiltrosDeAsientos, PaginaDeAsientos } from '@/lib/api/contabilidad.service';
import { MAX_LIMITE_DE_ASIENTOS } from '@/lib/api/contabilidad.service';
import { NOMBRE_DE_ORIGEN } from './asientos';
import { diaDe } from './fechas';

export const COLUMNAS_DEL_CSV = [
  'Número',
  'Fecha',
  'Descripción',
  'Origen',
  'Estado',
  'Código de cuenta',
  'Cuenta',
  'Débito',
  'Crédito',
  'Tipo de tercero',
  'Id del tercero',
  'Detalle de la línea',
] as const;

export const SEPARADOR = ';';
const BOM = '﻿';

/** Tope de asientos que se bajan en un archivo: más que esto son >50 pedidos al back. */
export const MAX_ASIENTOS_POR_CSV = 10_000;

/** Un campo, entre comillas sólo si hace falta (separador, comillas o salto de línea). */
export function campoCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (texto === '') return '';
  const necesitaComillas = /[";\r\n]/.test(texto);
  return necesitaComillas ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Una fila por movimiento, en el orden de `COLUMNAS_DEL_CSV`. */
export function filasDelCsv(asientos: readonly AsientoContable[]): string[][] {
  const filas: string[][] = [];
  for (const a of asientos) {
    for (const m of a.movimientos) {
      filas.push([
        String(a.numero),
        diaDe(a.fecha) || a.fecha,
        a.descripcion,
        NOMBRE_DE_ORIGEN[a.origen] ?? a.origen,
        a.cerrado ? 'Cerrado' : 'Abierto',
        m.cuenta?.codigo ?? '',
        m.cuenta?.nombre ?? m.cuentaId,
        m.debitoCop ? String(m.debitoCop) : '',
        m.creditoCop ? String(m.creditoCop) : '',
        m.terceroTipo ?? '',
        m.terceroId ?? '',
        m.descripcion ?? '',
      ]);
    }
  }
  return filas;
}

/** El archivo entero: encabezado + filas, `\r\n`, con BOM. */
export function csvDeAsientos(asientos: readonly AsientoContable[]): string {
  const lineas = [COLUMNAS_DEL_CSV.map(campoCsv).join(SEPARADOR)];
  for (const fila of filasDelCsv(asientos)) {
    lineas.push(fila.map(campoCsv).join(SEPARADOR));
  }
  return BOM + lineas.join('\r\n') + '\r\n';
}

/** `asientos-2026-08-01-a-2026-08-31.csv`; sin rango, `asientos-completo-<hoy>.csv`. */
export function nombreDelCsv(desde: string, hasta: string, hoy: string): string {
  if (desde && hasta) return `asientos-${desde}-a-${hasta}.csv`;
  if (desde) return `asientos-desde-${desde}.csv`;
  if (hasta) return `asientos-hasta-${hasta}.csv`;
  return `asientos-completo-${hoy}.csv`;
}

export class LibroDemasiadoGrande extends Error {
  constructor(public readonly total: number) {
    super(
      `El rango tiene ${total.toLocaleString('es-CO')} asientos y el archivo admite hasta ${MAX_ASIENTOS_POR_CSV.toLocaleString('es-CO')}. Achicá el rango.`,
    );
    this.name = 'LibroDemasiadoGrande';
  }
}

export type ListarAsientos = (filtros: FiltrosDeAsientos) => Promise<PaginaDeAsientos>;

/**
 * Todos los asientos del rango, página por página (el back tope 200 por
 * pedido). Se corta antes de empezar si el total supera el tope del archivo.
 */
export async function todosLosAsientos(
  listar: ListarAsientos,
  rango: Pick<FiltrosDeAsientos, 'desde' | 'hasta'>,
  tope: number = MAX_ASIENTOS_POR_CSV,
): Promise<AsientoContable[]> {
  const primera = await listar({ ...rango, limite: MAX_LIMITE_DE_ASIENTOS, desplazamiento: 0 });
  if (primera.total > tope) throw new LibroDemasiadoGrande(primera.total);

  const asientos = [...primera.asientos];
  let desplazamiento = primera.asientos.length;
  while (desplazamiento < primera.total) {
    const pagina = await listar({ ...rango, limite: MAX_LIMITE_DE_ASIENTOS, desplazamiento });
    if (pagina.asientos.length === 0) break;
    asientos.push(...pagina.asientos);
    desplazamiento += pagina.asientos.length;
  }
  return asientos;
}
