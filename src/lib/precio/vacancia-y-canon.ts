/**
 * Lo que cuesta el canon que escribe el propietario (MANOS-2, 04-10-2026).
 * PURO. Espejo de `back-erp/src/inmobiliaria/comercial/precio/vacancia-y-canon.ts`
 * (`loQueCuestaElCanonPedido`): la pantalla lo calcula mientras escribe, y el
 * back lo vuelve a calcular al guardar. Si cambia una, cambia la otra.
 *
 * 🔴 D-PV-02 (RealPage): aquí no hay ningún canon sugerido. Sólo la cuenta de
 * lo que el PROPIETARIO escribió.
 */

import { alPeso } from '@/lib/plata/plata';

/** Los meses del contrato con que se cuenta lo que cuesta bajar (un año). */
export const MESES_DEL_CONTRATO = 12;

export function loQueCuestaElCanonPedido(
  canonActualCop: number,
  canonPedidoCop: number,
  mesesDelContrato: number = MESES_DEL_CONTRATO,
): { dejaDeRecibirCop: number; equivaleAMesesVacio: number } | null {
  if (!(canonActualCop > 0) || !(canonPedidoCop > 0) || canonPedidoCop >= canonActualCop) return null;
  const dejaDeRecibirCop = alPeso((canonActualCop - canonPedidoCop) * mesesDelContrato);
  // redondeo: no es plata (meses)
  return { dejaDeRecibirCop, equivaleAMesesVacio: Math.round((dejaDeRecibirCop / canonActualCop) * 10) / 10 };
}

/** «1», «1,5»: los meses con una cifra decimal y coma. */
export function mesesEnPalabras(n: number): string {
  const texto = Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  return `${texto} ${n === 1 ? 'mes' : 'meses'}`;
}
