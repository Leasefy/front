/**
 * F3 (contract.md VERIFY-batch-2) — la lista de contratos de la agencia es
 * la compañera directa de la pantalla de detalle donde se encontró el
 * "$ 0"/epoch. Un contrato MIGRADO sparse (T-0031, M2) puede tener
 * `monthlyRent` en `null`. Antes de este fix, `val || 0` trataba `null`
 * igual que un canon real de cero.
 *
 * Extraído a un módulo aparte (no exportado desde `page.tsx`) porque
 * Next.js valida en build que un `page.tsx` sólo exporte los nombres
 * reservados de la ruta.
 */
export function fmtCop(val: number | null | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}
