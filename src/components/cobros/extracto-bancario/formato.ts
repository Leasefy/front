import { formatCurrency } from '@/lib/format';

/** La fecha del movimiento viene como día UTC (`@db.Date`): se muestra en UTC para no correrla. */
export function diaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function plata(n: number): string {
  return n < 0 ? `−${formatCurrency(-n)}` : formatCurrency(n);
}

export function mesLegible(yyyyMm: string): string {
  const [a, m] = yyyyMm.split('-').map(Number);
  if (!a || !m) return yyyyMm;
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}
