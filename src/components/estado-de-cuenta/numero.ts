/**
 * Qué número se lee en cada contrato del estado de cuenta, y cuál es cuál.
 *
 * El back manda `numero` —el que la inmobiliaria conoce: el de Nui en un
 * migrado, nuestro consecutivo sin «#» en un nativo— y `numeroDeLeasefy`,
 * nuestro `code`. Se muestra lo mismo que en la lista y la ficha
 * (`lib/contratos/numero-del-contrato.ts`): «Contrato 1686» para un migrado,
 * «Contrato #14» para un nativo. Desde el 16-09 el «Leasefy #1839» ya no sale
 * (Nico: «ese código de Leasefy no lo dejemos»).
 *
 * `numero` NO se toca: es la identidad del contrato en la URL, en los filtros
 * y en los `data-testid`; esto sólo decide cómo se ESCRIBE.
 */

import type { ContratoDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface NumeroDelContratoDelEstado {
  /** Lo que se lee: «1686» o «#14». */
  principal: string;
}

export function numeroDelContratoDelEstado(
  c: Pick<ContratoDelEstadoDeCuenta, 'numero' | 'numeroDeLeasefy'>,
): NumeroDelContratoDelEstado {
  // Nativo: `numero` ES nuestro consecutivo, y se escribe con «#» como en todos lados.
  if (c.numeroDeLeasefy != null && c.numero === String(c.numeroDeLeasefy)) {
    return { principal: `#${c.numero}` };
  }
  // Migrado (o back anterior a `numeroDeLeasefy`): el número de la inmobiliaria, solo.
  return { principal: c.numero };
}
