/**
 * La reparación diferida en meses (reunión con Portofino, 22-10-2026), dicha en
 * palabras. 🔁 La frase es la misma del back (`mantenimiento/diferida/reparacion-diferida.ts`,
 * `planEnFrase`): «en 3 meses (noviembre de 2026 a enero de 2027)».
 */
import { mesEnPalabras } from '@/lib/contratos/meses-del-concepto';
import type { MesDeLaReparacion } from '@/lib/types/deducciones';

/** «en noviembre de 2026» o «en 3 meses (noviembre de 2026 a enero de 2027)». */
export function planEnFrase(plan: ReadonlyArray<Pick<MesDeLaReparacion, 'mes'>>): string {
  if (plan.length === 0) return '';
  const meses = [...plan].sort((a, b) => a.mes.localeCompare(b.mes));
  if (meses.length === 1) return `en ${mesEnPalabras(meses[0].mes)}`;
  return `en ${meses.length} meses (${mesEnPalabras(meses[0].mes)} a ${mesEnPalabras(meses[meses.length - 1].mes)})`;
}

/** «Diferida en 3 meses», para una marca corta en la tarjeta. */
export function marcaDeDiferida(plan: ReadonlyArray<unknown>): string {
  return plan.length === 1 ? 'Diferida a 1 mes' : `Diferida en ${plan.length} meses`;
}
