import { formatCurrency } from '@/lib/format';

/**
 * La fecha del movimiento viene como día UTC (`@db.Date`, «2026-10-04» o
 * «2026-10-04T00:00:00.000Z»): se muestra en UTC para no correrla. Un INSTANTE
 * (cuándo se cargó el extracto, cuándo se armó o aprobó un lote) se muestra en
 * el día de Bogotá: en UTC, lo cargado a las 22:30 del 4 decía «5 de oct»
 * (N-08, QA-PAGOS-95).
 */
export function diaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const esUnDia = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.0+)?Z)?$/.test(iso);
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: esUnDia ? 'UTC' : 'America/Bogota',
  });
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
