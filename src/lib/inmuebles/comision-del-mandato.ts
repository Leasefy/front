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

export function textoDeLaComision(
  c: Pick<
    Consignacion,
    'listingType' | 'commissionPercent' | 'saleCommissionPercent' | 'comisionDesconocida'
  >,
): string {
  if (c.listingType === 'sale') {
    return c.saleCommissionPercent != null ? `${c.saleCommissionPercent}%` : '—';
  }
  if (c.comisionDesconocida) return COMISION_NO_VENIA;
  return `${c.commissionPercent}%`;
}
