/**
 * El separador de días del chat (QA del portal del propietario, 11-10-2026):
 * un mensaje del 4 de octubre salía sólo con «10:12 a. m.», pegado a uno de
 * hoy, y no había cómo saber que eran de días distintos. Cada vez que cambia
 * el día de Colombia entre un mensaje y el anterior va un rótulo: «Hoy»,
 * «Ayer» o la fecha («4 de octubre», con el año si no es el de hoy).
 *
 * PURA: el día de hoy entra por parámetro.
 */

import { diaEnColombia, fechaLarga, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';

function diaAnterior(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(a!, m! - 1, d! - 1));
  return fecha.toISOString().slice(0, 10);
}

/** El rótulo del día de un mensaje, visto desde `hoy` (`AAAA-MM-DD`). */
export function rotuloDelDia(dia: string, hoy: string): string {
  if (dia === hoy) return 'Hoy';
  if (dia === diaAnterior(hoy)) return 'Ayer';
  const larga = fechaLarga(dia);
  return dia.slice(0, 4) === hoy.slice(0, 4) ? larga.replace(/ de \d{4}$/, '') : larga;
}

/**
 * Para cada mensaje, el rótulo del separador que va ANTES de él, o `null` si
 * es del mismo día que el anterior.
 */
export function separadoresDeDia(
  mensajes: ReadonlyArray<{ createdAt: string }>,
  hoy: string = hoyEnColombia(),
): Array<string | null> {
  let anterior: string | null = null;
  return mensajes.map((m) => {
    const dia = diaEnColombia(m.createdAt);
    if (!dia || dia === anterior) return null;
    anterior = dia;
    return rotuloDelDia(dia, hoy);
  });
}
