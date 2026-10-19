/**
 * La fecha de la próxima acción de un interesado es un DÍA (QA de agentes
 * 17-10, IMANA-5). PURA.
 *
 * El back la guarda como `@db.Date` y la manda `2026-10-17T00:00:00.000Z`.
 * Leída con `new Date(…)` es medianoche UTC: en Bogotá, las 7 p. m. del día
 * anterior. Por eso la tarjeta del Pipeline decía «16 de oct» de algo del 17, y
 * marcaba «Vencido» desde las 7 p. m. del día anterior lo que vencía hoy.
 */
import { hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';

/** `AAAA-MM-DD` de lo que manda el back, o `null`. */
export function diaDeLaProximaAccion(valor: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? '').trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Vencida sólo si su día ya pasó en Colombia: lo de hoy todavía está a tiempo. */
export function proximaAccionVencida(valor: string | null | undefined, hoy: string = hoyEnColombia()): boolean {
  const dia = diaDeLaProximaAccion(valor);
  return dia !== null && dia < hoy;
}
