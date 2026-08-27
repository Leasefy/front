/**
 * Formateo null-safe de campos de contrato para `ContractExpandableItem`
 * (la lista de contratos del panel landlord tradicional,
 * `/panel/(landlord)/contratos`).
 *
 * Un contrato MIGRADO sparse (T-0031, M2) puede tener `monthlyRent`/
 * `startDate`/`endDate` en `null`. `formatCurrency`/`formatDate` de
 * `@/lib/format` no son null-safe en el sentido correcto acá: la primera
 * resuelve `null` → "$ 0" (indistinguible de un canon real de cero) y la
 * segunda revienta con `new Date(null)` cayendo al epoch UNIX.
 */

import { formatCurrency as formatCurrencyGlobal } from '@/lib/format';

export function formatCanon(monthlyRent: number | null | undefined): string {
  return monthlyRent == null ? '—' : formatCurrencyGlobal(monthlyRent);
}

/**
 * `iso` viaja como datetime ISO completo a medianoche UTC (Prisma serializa
 * así una columna `@db.Date`). Se toma sólo la fecha y se fuerza mediodía
 * local antes de parsear — evita que una fecha a medianoche UTC caiga al día
 * anterior en un huso horario detrás de UTC (Colombia incluida).
 */
function fecha(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const soloFecha = iso.slice(0, 10);
  const date = new Date(`${soloFecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatVigencia(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const inicio = fecha(startDate);
  const fin = fecha(endDate);
  if (!inicio && !fin) return '—';
  return `${inicio ?? '—'} – ${fin ?? '—'}`;
}
