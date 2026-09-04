/**
 * Fechas «de calendario» (YYYY-MM-DD) ↔ Date local, sin que la zona horaria
 * corra el día. `new Date('2026-10-01')` es UTC y en Colombia cae el 30 de
 * septiembre; estos dos helpers evitan eso en los pickers de cadence, que
 * trabajan con `Date`.
 */

export function fechaLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function aFechaIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Hoy a las 00:00 local, para `minDate`. */
export function hoyLocal(): Date {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}
