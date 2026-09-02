/**
 * Formateo null-safe de campos de contrato para la lista del inquilino.
 *
 * Un inquilino puede estar asignado (tiene `tenantId`) a un contrato
 * MIGRADO sparse (T-0031) al que le falte el canon o las fechas — D2 exige
 * los CINCO campos para crear el `Lease`, así que faltar uno solo no impide
 * que el `Contract` (y por lo tanto esta pantalla) exista con `tenantId`
 * seteado. `formatCurrency`/`formatDate` de `@/lib/format` no son
 * null-safe en el sentido correcto acá: resuelven `null` a "$ 0"/epoch,
 * indistinguible de un dato real (misma clase de falla que `leer-
 * celdas.ts:36-37`, X3, ahora en la capa de render).
 *
 * `null` entra, `null` sale.
 */

import { formatCurrency as formatCurrencyGlobal, formatDate as formatDateGlobal } from '@/lib/format';

export function formatCanon(monthlyRent: number | null | undefined): string | null {
  return monthlyRent == null ? null : formatCurrencyGlobal(monthlyRent);
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateGlobal(iso);
}
