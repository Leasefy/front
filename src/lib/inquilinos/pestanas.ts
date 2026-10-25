/**
 * Las pestañas por tarea de Inquilinos (Nico, 22-10-2026): «Activos · Sin
 * arriendo · Terminados · Todos».
 *
 * «Sin arriendo» son las personas que se crearon solas (a mano o desde los
 * terceros de la migración) y todavía no tienen un contrato: no se les cobra
 * nada y lo que toca es crearles el contrato. Antes iban DENTRO de «Activos»,
 * con la marca en la fila, y la pestaña y la fila se contradecían.
 *
 * El back sólo sabe de `activos | terminados | todos` y devuelve la lista
 * ENTERA (una fila por persona, sin paginar), así que «Sin arriendo» se pide
 * como «activos» y se separa aquí. Ninguna regla del back cambia.
 */
import type { ConteosDeInquilinos, FiltroDeEstado, Inquilino } from '@/lib/api/inquilinos.service';

export type PestanaDeInquilinos = 'activos' | 'sinArriendo' | 'terminados' | 'todos';

/** Lo que se le pide al back por cada pestaña. */
export function estadoDelBack(pestana: PestanaDeInquilinos): FiltroDeEstado {
  return pestana === 'sinArriendo' ? 'activos' : pestana;
}

export function sinArriendo(persona: Pick<Inquilino, 'arriendos'>): boolean {
  return persona.arriendos.length === 0;
}

/** Las filas que muestra la pestaña, de la lista que devolvió el back para ella. */
export function filasDeLaPestana<T extends Pick<Inquilino, 'arriendos'>>(lista: readonly T[], pestana: PestanaDeInquilinos): T[] {
  if (pestana === 'sinArriendo') return lista.filter(sinArriendo);
  if (pestana === 'activos') return lista.filter((p) => !sinArriendo(p));
  return [...lista];
}

/**
 * ¿La lista cargada sirve para contar a los que no tienen arriendo? La de
 * «activos» y la de «todos» los traen a todos; la de «terminados», no.
 */
export function laListaCuentaLosSinArriendo(pestana: PestanaDeInquilinos): boolean {
  return pestana !== 'terminados';
}

export interface ConteosDeLasPestanas {
  activos: number | null;
  sinArriendo: number | null;
  terminados: number | null;
  todos: number | null;
}

/**
 * El número de cada pestaña = las filas que se ven al tocarla. «Activos» del
 * back trae a los que no tienen arriendo: se restan. Sin saber cuántos son
 * (o sin los conteos), la pestaña va sin número, nunca con uno falso.
 */
export function conteosDeLasPestanas(
  conteos: ConteosDeInquilinos | null,
  cuantosSinArriendo: number | null,
): ConteosDeLasPestanas {
  return {
    activos: conteos && cuantosSinArriendo !== null ? Math.max(0, conteos.activos - cuantosSinArriendo) : null,
    sinArriendo: cuantosSinArriendo,
    terminados: conteos ? conteos.terminados : null,
    todos: conteos ? conteos.todos : null,
  };
}
