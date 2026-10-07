/**
 * CB-27 (QA de Contabilidad, 03-10-2026): la naturaleza que corresponde a la
 * CLASE del código del PUC (Decreto 2650): 1 activo, 5 gastos, 6 y 7 costos →
 * débito; 2 pasivo, 3 patrimonio, 4 ingresos → crédito. Las de orden (8, 9) no
 * se proponen: dependen de la cuenta. PURA.
 */

import type { NaturalezaContable } from '@/lib/api/contabilidad.service';

const NOMBRE_DE_LA_CLASE: Record<string, string> = {
  '1': 'activo',
  '2': 'pasivo',
  '3': 'patrimonio',
  '4': 'ingresos',
  '5': 'gastos',
  '6': 'costos de ventas',
  '7': 'costos de producción',
};

export function naturalezaDeLaClase(codigo: string): NaturalezaContable | null {
  const clase = codigo.trim().charAt(0);
  if (['1', '5', '6', '7'].includes(clase)) return 'DEBITO';
  if (['2', '3', '4'].includes(clase)) return 'CREDITO';
  return null;
}

/**
 * El aviso cuando la naturaleza elegida no es la de su clase. No impide (hay
 * cuentas correctoras: la depreciación acumulada es crédito dentro del activo),
 * pero se dice. `null` si coincide o la clase no propone nada.
 */
export function avisoDeNaturaleza(codigo: string, naturaleza: NaturalezaContable): string | null {
  const propuesta = naturalezaDeLaClase(codigo);
  if (!propuesta || propuesta === naturaleza) return null;
  const clase = codigo.trim().charAt(0);
  const dice = (n: NaturalezaContable) => (n === 'DEBITO' ? 'débito' : 'crédito');
  return `Las cuentas de la clase ${clase} (${NOMBRE_DE_LA_CLASE[clase]}) son de naturaleza ${dice(propuesta)}. Ésta quedaría ${dice(naturaleza)}: está bien sólo si es una cuenta correctora (como una depreciación acumulada).`;
}
