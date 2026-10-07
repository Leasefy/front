import type { Consignacion } from '@/lib/types/inmobiliaria';

/**
 * Cómo se escribe la comisión de un mandato en pantalla (QA 22-09).
 *
 * Una comisión que el archivo de inmuebles NO traía queda guardada como 0 con
 * `comisionDesconocida`: mostrar «0%» afirmaría que la inmobiliaria no cobra
 * nada, y mostrar el % por defecto de la casa (lo que pasaba antes) era
 * inventarlo. Se dice que no venía. En una venta manda
 * `saleCommissionPercent` (`—` si no está).
 */
export const COMISION_NO_VENIA = 'No venía en el archivo';

/**
 * `10` → «10 %», `2.5` → «2,5 %» (la norma de la casa, como
 * `porcentajeLegible`). IN-03 (QA 04-10): la tabla ponía el ícono de
 * porcentaje y además el «%» pegado al número: «% 10%».
 */
function conPorcentaje(n: number | null | undefined): string {
  // Sin número no hay porcentaje que decir (una respuesta vieja o incompleta).
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
}

export function textoDeLaComision(
  c: Pick<
    Consignacion,
    'listingType' | 'commissionPercent' | 'saleCommissionPercent' | 'comisionDesconocida'
  >,
): string {
  if (c.listingType === 'sale') {
    return c.saleCommissionPercent != null ? conPorcentaje(c.saleCommissionPercent) : '—';
  }
  if (c.comisionDesconocida) return COMISION_NO_VENIA;
  return conPorcentaje(c.commissionPercent);
}

/**
 * La misma regla, para una CELDA de tabla: «No venía en el archivo» no cabe en
 * la columna de la lista a 1440 px (empujaba «Estado» fuera de la pantalla), así
 * que ahí se dice «Sin definir» —lo que propuso el QA con avatares (04-10): «un
 * 0 % literal parece dato falso; mejor “sin definir”»— y la frase larga va en el
 * `title`. Lo demás, igual que `textoDeLaComision`.
 */
export const COMISION_SIN_DEFINIR = 'Sin definir';

export function textoCortoDeLaComision(
  c: Parameters<typeof textoDeLaComision>[0],
): { texto: string; explicacion: string | undefined } {
  if (c.listingType !== 'sale' && c.comisionDesconocida) {
    return { texto: COMISION_SIN_DEFINIR, explicacion: COMISION_NO_VENIA };
  }
  return { texto: textoDeLaComision(c), explicacion: undefined };
}
