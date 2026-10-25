import type { Renovacion } from '@/lib/types/inmobiliaria';

/**
 * Cuántos días le faltan a una renovación para vencer (negativo: ya venció).
 *
 * B1 (revisora r27): el back corta los días en 0 (`Math.max(0, …)`), así que
 * un contrato que venció el 20 llegaba con `daysUntilExpiry: 0` y se pintaba
 * «vence hoy». Los días se cuentan aquí con la fecha de vencimiento de la
 * fila (la parte `YYYY-MM-DD`, en el día local, como `fechaCorta`) contra
 * hoy; sólo si la fecha no se puede leer se usa lo que mandó el back.
 */
export function diasParaVencer(
  r: Pick<Renovacion, 'leaseEndDate' | 'daysUntilExpiry'>,
  hoy: Date = new Date(),
): number {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.leaseEndDate ?? '');
  if (!partes) return r.daysUntilExpiry;
  const fin = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fin.getTime() - inicioDeHoy.getTime()) / 86_400_000);
}
