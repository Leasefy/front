/**
 * Formateo null-safe de campos de un contrato para la pantalla de detalle.
 *
 * F3 (contract.md VERIFY-batch-2, Finding 1) — un contrato MIGRADO sparse
 * (T-0031, M2) puede llegar con `startDate`/`endDate`/`monthlyRent` en
 * `null`. Antes de este archivo, la pantalla los formateaba como si fueran
 * datos reales: `new Date(null)` cae al epoch UNIX ("1 ene 1970") y
 * `formatCurrency(null)` (`@/lib/format`, que resuelve `null` → `0` a
 * propósito para campos donde 0 es un valor real, ej. adminFee) devuelve
 * "$ 0" — un dato ausente mostrado con total confianza como un hecho falso.
 * La misma clase de falla que T-0031 existe para eliminar
 * (`leer-celdas.ts:36-37`, X3), ahora en la capa de render en vez de la de
 * cobro.
 *
 * `null` entra, `null` sale — quien renderiza (`InfoRow`) ya sabe pintar
 * `null` como "—", nunca un valor inventado.
 *
 * Extraído a un módulo aparte (no exportado desde `page.tsx`) porque
 * Next.js valida en build que un `page.tsx` sólo exporte los nombres
 * reservados de la ruta (`default`, `metadata`, …) — un export adicional
 * rompe `tsc` sobre `.next/types`.
 */

import { formatCurrency } from '@/lib/format';

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCanon(monthlyRent: number | null | undefined): string | null {
  return monthlyRent == null ? null : formatCurrency(monthlyRent);
}
