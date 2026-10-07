/**
 * El depósito, SÓLO en comercial (QA-CONT CR-11). Nico, 03-10-2026, TAL CUAL:
 * «Dejarlo sólo para comercial» — en vivienda ni se pide ni se muestra; en
 * comercial se pide y sale en la ficha.
 *
 * Quién decide si aplica: el back (`depositoDelContrato.aplica`, por el tipo
 * del inmueble, la misma regla con que acepta o rechaza el valor —400
 * `DEPOSITO_SOLO_COMERCIAL`—). Un back anterior no lo manda: entonces el uso
 * del contrato (`usoInmueble`), como hasta hoy.
 */

import type { Contract } from '@/lib/types/contract';

type ContratoDelDeposito = Pick<Contract, 'usoInmueble'> &
  Partial<Pick<Contract, 'deposit' | 'depositoDelContrato'>>;

/** ¿Este contrato pide (y muestra) depósito? */
export function depositoAplica(c: ContratoDelDeposito): boolean {
  if (c.depositoDelContrato) return c.depositoDelContrato.aplica === true;
  return c.usoInmueble === 'COMERCIAL';
}

/** El depósito pactado, o `null` si no hay (o no aplica: en vivienda no se muestra ni uno viejo). */
export function depositoParaMostrar(c: ContratoDelDeposito): number | null {
  if (!depositoAplica(c)) return null;
  const valor = c.depositoDelContrato ? c.depositoDelContrato.valorCop : (c.deposit ?? null);
  return typeof valor === 'number' && valor > 0 ? valor : null;
}
