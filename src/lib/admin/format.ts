/**
 * Admin presentation formatters — ported from the monolith (`src/lib/db.ts`).
 * Kept separate from the customer app's own formatters so the admin stays
 * self-contained. The API returns raw numbers / ISO strings; the SPA formats.
 */

import { plataEnPantalla } from '@/lib/plata/escribir-plata'
export function fmtCOP(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (!Number.isFinite(num)) return '—'
  return plataEnPantalla('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Lee una fecha que manda el back (19-10-2026, QA del admin).
 *
 * El esquema `agent` guarda casi todo en `timestamp without time zone` (en UTC)
 * y el admin lo manda como texto sin zona: «2026-10-20 04:33:01». `new Date()`
 * lo leía como hora LOCAL y cada hora salía 5 horas adelantada. Sin zona ⇒ UTC.
 * Un día solo («2026-10-07») es una fecha de calendario, no la medianoche UTC
 * (que en Colombia es el día anterior).
 */
export function aFecha(d: Date | string): Date {
  if (typeof d !== 'string') return d
  const dia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (dia) return new Date(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3]))
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(d)) return new Date(d.replace(' ', 'T') + 'Z')
  return new Date(d)
}

/**
 * «16 oct 2026, 5:35 p. m.» (ronda 26, revisora T5; VOZ §4). Antes salía «16 de
 * oct de 2026, 05:35 p. m.»: con hora, el navegador mete «de» y el cero.
 */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = aFecha(d)
  if (!Number.isFinite(date.getTime())) return '—'
  const hora = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return `${fmtFecha(date)}, ${hora}`
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** USD→COP for screens that mix currencies (costs, dashboard). FRONT.md §4. */
export const USD_TO_COP = 4000

/** «14 oct 2026» — sólo el día, para columnas angostas. */
export function fmtFecha(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = aFecha(d)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).replace(/\./g, '')
}

/** 12.345 — miles con punto, como el resto de Leasefy. */
export function fmtNumero(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-CO')
}

/** Quita tildes y pasa a minúsculas, para buscar sin que importe cómo se escribió. */
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** «7 oct» — un día «AAAA-MM-DD» sin hora (se lee como fecha de calendario, nunca como medianoche UTC). */
export function fmtDiaCorto(dia: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia ?? '')
  if (!m) return '—'
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return fecha.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }).replace(/\./g, '')
}

/** «12,5 %» — un porcentaje ya en escala 0–100, con coma decimal y espacio antes del signo. */
export function fmtPorcentaje(n: number | string | null | undefined, decimales = 1): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`
}
