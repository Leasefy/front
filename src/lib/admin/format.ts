/**
 * Admin presentation formatters — ported from the monolith (`src/lib/db.ts`).
 * Kept separate from the customer app's own formatters so the admin stays
 * self-contained. The API returns raw numbers / ISO strings; the SPA formats.
 */
export function fmtCOP(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num)
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** USD→COP for screens that mix currencies (costs, dashboard). FRONT.md §4. */
export const USD_TO_COP = 4000
