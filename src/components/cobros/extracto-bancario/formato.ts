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

/**
 * Los meses que cubre un cruce. Un pago puede cubrir varias cuotas seguidas del
 * mismo contrato —«pagar dos meses o lo que sea», que es justo lo que se pidió—
 * y la fila tiene que decirlo sin volverse ilegible.
 */
export function mesesLegibles(meses: string[]): string {
  if (meses.length === 0) return '—';
  if (meses.length === 1) return mesLegible(meses[0]);
  if (meses.length === 2) return `${mesLegible(meses[0])} y ${mesLegible(meses[1])}`;
  return `${mesLegible(meses[0])} → ${mesLegible(meses[meses.length - 1])} (${meses.length} meses)`;
}

export function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}
