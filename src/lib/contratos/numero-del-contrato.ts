/**
 * Qué número se lee en un contrato, y cuál es cuál.
 *
 * 🔴 Nico, 2026-09-12: «estás tergiversando los números de contrato». Vio el
 * «#1839» en Leasefy, lo buscó en su sistema anterior y era OTRA persona con
 * otro monto. Los datos estaban bien: #1839 es NUESTRO consecutivo
 * (`Contract.code`) y el número que él conoce es `externalId` (1686), la
 * columna «Consecutivo contrato» del archivo que migró. Lo que estaba mal era
 * qué número mostraba la pantalla.
 *
 * Regla: si el contrato trae el número de la inmobiliaria, ÉSE es el que se
 * muestra —es el que ella escribe en sus recibos y busca en su archivo—.
 *
 * 🔴 Nico, 2026-09-16: «ese código de Leasefy no lo dejemos». Hasta ese día
 * nuestro consecutivo salía al lado como «Leasefy #1839»; ya no sale en
 * ninguna pantalla ni documento. Con `externalId` se muestra SÓLO ése.
 *
 * Sin `externalId` (contrato nativo, o migrado sin número), el número es
 * `#code` como siempre. Sin ninguno de los dos (un back anterior a T-0040),
 * `null`: la pantalla no dibuja nada, nunca «#0» ni «—».
 */

import type { Contract } from '@/lib/types/contract';

export interface NumeroDelContrato {
  /** Lo que se lee. `null` = no hay número que mostrar. */
  principal: string | null;
  /** Si el número es el de la inmobiliaria y no el nuestro. */
  esDeLaInmobiliaria: boolean;
}

export function numeroDelContrato(
  c: Pick<Contract, 'code' | 'externalId'>,
): NumeroDelContrato {
  const externo = typeof c.externalId === 'string' ? c.externalId.trim() : '';
  if (externo !== '') return { principal: externo, esDeLaInmobiliaria: true };
  const nuestro = c.code != null ? `#${c.code}` : null;
  return { principal: nuestro, esDeLaInmobiliaria: false };
}

/**
 * El título de la ficha: «Contrato 1686» para uno migrado con número,
 * «Contrato #14» para uno nativo, y el genérico si no hay número.
 */
export function tituloDelContrato(c: Pick<Contract, 'code' | 'externalId'>): string {
  const { principal } = numeroDelContrato(c);
  return principal ? `Contrato ${principal}` : 'Contrato de arrendamiento';
}
