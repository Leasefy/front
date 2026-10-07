/**
 * Los valores con que arranca «Nuevo contrato», desde el back
 * (`GET /contracts/valores-por-defecto?inicio=`, QA-CONT C-13, back ff282197).
 *
 * Nico (03-10-2026): «los de la inmobiliaria» — el prorrateo y el día de pago
 * según su configuración, y el fin = inicio + 12 meses − 1 día. Hasta hoy el
 * formulario los leía de `GET /inmobiliaria/agency`, que NO publica el
 * prorrateo: abría apagado («No: va fecha a fecha… del 20 al 19») en una
 * inmobiliaria que genera el canon el 1 con el primer mes prorrateado.
 *
 * El back decide el prorrateo por la mayoría de los contratos vigentes de la
 * inmobiliaria (empate o ninguno: la regla de la casa, prorrateado) y lo dice
 * en `origenDelProrrateo`; aquí sólo se lee y se explica.
 */

import type { ReglaDeCobroDelBack } from '@/lib/types/contract';
import type { TerminosPorDefecto } from './terminos-por-defecto';

export interface ValoresPorDefectoDelContrato {
  prorratear: boolean;
  origenDelProrrateo: 'CONTRATOS_DE_LA_INMOBILIARIA' | 'REGLA_DE_LA_CASA';
  contratosVigentes: { prorrateados: number; fechaAFecha: number };
  diasDePlazo: number;
  origenDelPlazo: 'INMOBILIARIA';
  duracionMeses: number;
  /** `AAAA-MM-DD` (inicio + 12 meses − 1 día); `null` sin `inicio`. */
  finSugerido: string | null;
  comisionPorcentaje: number | null;
  penalidadTerminacionCanones: number | null;
  reglaDeCobro: ReglaDeCobroDelBack;
}

/**
 * Los términos del formulario con los valores del back encima de los de la
 * inmobiliaria: el prorrateo y los días de plazo salen del back (son los de la
 * inmobiliaria resueltos); el día de pago, de la inmobiliaria (es sólo una
 * referencia: no decide el vencimiento, C-07).
 */
export function terminosConLosValoresDelBack(
  deLaAgencia: TerminosPorDefecto | null,
  delBack: ValoresPorDefectoDelContrato | null,
): TerminosPorDefecto | null {
  if (!delBack) return deLaAgencia;
  return {
    diaDePago: deLaAgencia?.diaDePago ?? null,
    prorratear: delBack.prorratear,
    diasDePlazo: Number.isInteger(delBack.diasDePlazo) ? delBack.diasDePlazo : (deLaAgencia?.diasDePlazo ?? null),
  };
}

/** Por qué el prorrateo arranca como arranca, en una línea. */
export function porQueSeProponeElProrrateo(v: ValoresPorDefectoDelContrato): string {
  if (v.origenDelProrrateo === 'REGLA_DE_LA_CASA') {
    const { prorrateados, fechaAFecha } = v.contratosVigentes;
    return prorrateados + fechaAFecha > 0
      ? 'Así lo propone la inmobiliaria: tus contratos vigentes están repartidos por igual, y en un empate va prorrateado.'
      : 'Así lo propone la inmobiliaria: todavía no tienes contratos vigentes, y por defecto va prorrateado.';
  }
  const total = v.contratosVigentes.prorrateados + v.contratosVigentes.fechaAFecha;
  const iguales = v.prorratear ? v.contratosVigentes.prorrateados : v.contratosVigentes.fechaAFecha;
  const como = v.prorratear ? 'prorrateados' : 'fecha a fecha';
  if (total === 1) {
    return `Así lo propone la inmobiliaria: tu contrato vigente va ${v.prorratear ? 'prorrateado' : 'fecha a fecha'}.`;
  }
  return iguales === total
    ? `Así lo propone la inmobiliaria: tus ${total} contratos vigentes van ${como}.`
    : `Así lo propone la inmobiliaria: ${iguales} de tus ${total} contratos vigentes van ${como}.`;
}
