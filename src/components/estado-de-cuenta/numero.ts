/**
 * Qué número se lee en cada contrato del estado de cuenta, y cuál es cuál.
 *
 * El back manda `numero` —el que la inmobiliaria conoce: el de Nui en un
 * migrado, nuestro consecutivo sin «#» en un nativo— y `numeroDeLeasefy`,
 * nuestro `code`. Con los dos se arma lo mismo que en la lista y la ficha
 * (`lib/contratos/numero-del-contrato.ts`): «Contrato 1686 · Leasefy #1839»
 * para un migrado, «Contrato #14» para un nativo. Un «#1839» pelado era, en
 * el sistema de Nico, otra persona con otro monto.
 *
 * `numero` NO se toca: es la identidad del contrato en la URL, en los filtros
 * y en los `data-testid`; esto sólo decide cómo se ESCRIBE.
 */

import type { ContratoDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface NumeroDelContratoDelEstado {
  /** Lo que se lee grande: «1686» o «#14». */
  principal: string;
  /** Nuestro consecutivo, sólo cuando el principal es el de la inmobiliaria. */
  numeroDeLeasefy: number | null;
}

export function numeroDelContratoDelEstado(
  c: Pick<ContratoDelEstadoDeCuenta, 'numero' | 'numeroDeLeasefy'>,
): NumeroDelContratoDelEstado {
  // Back anterior a este campo: se muestra tal cual, sin inventar un «#».
  if (c.numeroDeLeasefy == null) return { principal: c.numero, numeroDeLeasefy: null };
  // Nativo: `numero` ES nuestro consecutivo, y se escribe con «#» como en todos lados.
  if (c.numero === String(c.numeroDeLeasefy)) {
    return { principal: `#${c.numero}`, numeroDeLeasefy: null };
  }
  return { principal: c.numero, numeroDeLeasefy: c.numeroDeLeasefy };
}
