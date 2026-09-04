/**
 * Cómo se lee una regla de mora.
 *
 * Los enums del back son para la máquina; la persona de facturación lee
 * «a los 5 días de mora» y «0,0667 % diario sobre el canon». Todo el copy
 * que describe una regla sale de acá, y la pantalla y el editor lo comparten
 * para que la vista previa del formulario diga exactamente lo mismo que la
 * fila de la lista.
 */

import { formatCurrency } from '@/lib/format';
import type {
  BaseDeCalculo,
  ConceptoDeRegla,
  DisparadorDeRegla,
  FormulaDeRegla,
} from '@/lib/api/reglas-de-mora.types';

export const NOMBRE_DEL_CONCEPTO: Record<ConceptoDeRegla, string> = {
  INTERES_DE_MORA: 'Interés de mora',
  GASTO_ADMINISTRATIVO: 'Gasto administrativo',
  AJUSTE_MANUAL: 'Ajuste manual',
};

export const NOMBRE_DEL_DISPARADOR: Record<DisparadorDeRegla, string> = {
  DIAS_DE_MORA: 'Días de mora',
  DIA_DEL_MES: 'Día del mes',
};

export const NOMBRE_DE_LA_FORMULA: Record<FormulaDeRegla, string> = {
  INTERES_DIARIO: 'Interés diario',
  PORCENTAJE_DE_LA_BASE: 'Porcentaje de la base',
  MONTO_FIJO: 'Monto fijo',
};

/** El nombre de la base como sustantivo, para armar «sobre el canon» / «del canon». */
export const NOMBRE_DE_LA_BASE: Record<BaseDeCalculo, string> = {
  CANON: 'canon',
  CANON_MAS_ADMINISTRACION: 'canon más administración',
  TOTAL_ADEUDADO: 'total adeudado',
};

/** Lo que cada opción significa, para el formulario. */
export const EXPLICACION_DE_LA_FORMULA: Record<FormulaDeRegla, string> = {
  INTERES_DIARIO: 'Una tasa que corre cada día de mora sobre la base. Es el interés corriente.',
  PORCENTAJE_DE_LA_BASE: 'Un porcentaje único de la base, cobrado el día que la regla se dispara.',
  MONTO_FIJO: 'Un monto fijo en pesos, cobrado el día que la regla se dispara.',
};

export const EXPLICACION_DE_LA_BASE: Record<BaseDeCalculo, string> = {
  CANON: 'Sólo el canon.',
  CANON_MAS_ADMINISTRACION: 'Canon más administración y demás conceptos que paga el inquilino.',
  TOTAL_ADEUDADO: 'Todo lo que se debe, recargos previos incluidos. Ojo: compone.',
};

const FORMATO_DE_PORCENTAJE = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

/** `0.0667` → «0,0667 %» · `10` → «10 %». Hasta cuatro decimales, sin ceros de relleno. */
export function formatearPorcentaje(valor: number): string {
  return `${FORMATO_DE_PORCENTAJE.format(valor)} %`;
}

/**
 * «desde el primer día de mora» / «a los 5 días de mora» / «el día 15 de cada mes».
 * Con `DIAS_DE_MORA` y día 0 la regla corre apenas vence el plazo.
 */
export function describirDisparador(regla: {
  disparador: DisparadorDeRegla;
  disparadorDia: number;
}): string {
  const dia = regla.disparadorDia;
  if (regla.disparador === 'DIA_DEL_MES') return `el día ${dia} de cada mes`;
  if (dia <= 0) return 'apenas vence el plazo';
  if (dia === 1) return 'desde el primer día de mora';
  return `a los ${dia} días de mora`;
}

/**
 * «0,0667 % diario sobre el canon» / «10 % del canon» / «$ 50.000 fijo».
 */
export function describirFormula(regla: {
  formula: FormulaDeRegla;
  valor: number;
  base: BaseDeCalculo;
}): string {
  const base = NOMBRE_DE_LA_BASE[regla.base];
  switch (regla.formula) {
    case 'INTERES_DIARIO':
      return `${formatearPorcentaje(regla.valor)} diario sobre el ${base}`;
    case 'PORCENTAJE_DE_LA_BASE':
      return `${formatearPorcentaje(regla.valor)} del ${base}`;
    case 'MONTO_FIJO':
      return `${formatCurrency(regla.valor)} fijo`;
  }
}

/** «hasta $ 500.000» / «sin tope». */
export function describirTope(topeCop: number | null | undefined): string {
  if (topeCop === null || topeCop === undefined) return 'sin tope';
  return `hasta ${formatCurrency(topeCop)}`;
}

/**
 * La regla entera en una frase: «Se dispara a los 5 días de mora y cobra
 * 0,0667 % diario sobre el canon, hasta $ 500.000.»
 */
export function describirRegla(regla: {
  disparador: DisparadorDeRegla;
  disparadorDia: number;
  formula: FormulaDeRegla;
  valor: number;
  base: BaseDeCalculo;
  topeCop: number | null | undefined;
}): string {
  return `Se dispara ${describirDisparador(regla)} y cobra ${describirFormula(regla)}, ${describirTope(regla.topeCop)}.`;
}
