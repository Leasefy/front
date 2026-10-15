/**
 * «Sube tu archivo contable»: ¿qué archivo es, y a qué puerta va?
 *
 * 🔴 8.ª tanda de la migración (14-10-2026). Nico vio a Juan (Portofino)
 * subiendo todo por «libro diario» y preguntó cuál opción tiene que usar la
 * persona. Decidió que Leasefy lo reconozca: un solo botón, y el archivo va
 * solo a su lugar —el balance a los saldos iniciales, el libro diario a los
 * asientos, los comprobantes a la ficha de los contratos—.
 *
 * Mira sólo las primeras filas (los exports traen títulos arriba: se busca la
 * fila de encabezados con el mismo criterio de cada pantalla) y decide con
 * `queArchivoContableEs`, la misma regla que avisa de la puerta equivocada.
 * `null` = no se reconoce: la persona elige a mano.
 */

import { COLUMNAS_DE_ASIENTO } from '@/lib/migracion/columnas-de-asiento';
import { COLUMNAS_DE_BALANCE } from '@/lib/migracion/balance-de-apertura';
import { COLUMNAS_DE_DOCUMENTO } from '@/lib/migracion/columnas-de-documento';
import {
  queArchivoContableEs,
  type FormaDeArchivoContable,
} from '@/lib/migracion/que-archivo-contable-es';

import { mejorHojaYEncabezado, primerasFilasDelArchivo } from './encabezado-del-archivo';

/** Los encabezados de una fila, como texto, sin las celdas vacías. */
function encabezadosDe(celdas: readonly unknown[] | undefined): string[] {
  return (celdas ?? [])
    .map((c) => (c === null || c === undefined ? '' : String(c).replace(/\s+/g, ' ').trim()))
    .filter((t) => t !== '');
}

/** Con las primeras filas ya leídas (sin archivo: para probarlo). */
export function queArchivoContableTraen(
  filasPorHoja: readonly { hoja: string; filas: readonly (readonly unknown[])[] }[],
): FormaDeArchivoContable | null {
  const candidatos = [COLUMNAS_DE_BALANCE, COLUMNAS_DE_ASIENTO, COLUMNAS_DE_DOCUMENTO]
    .map((columnas) => mejorHojaYEncabezado(filasPorHoja, columnas))
    .sort((a, b) => b.obligatorias - a.obligatorias);
  for (const c of candidatos) {
    const filas = filasPorHoja.find((h) => h.hoja === c.hoja)?.filas;
    const forma = queArchivoContableEs(encabezadosDe(filas?.[c.filaDeEncabezado])).forma;
    if (forma) return forma;
  }
  return null;
}

export async function queArchivoContableSubieron(
  archivo: File,
): Promise<FormaDeArchivoContable | null> {
  const leidas = await primerasFilasDelArchivo(archivo);
  return leidas ? queArchivoContableTraen(leidas.filasPorHoja) : null;
}
