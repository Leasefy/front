import type { ConceptoDelContrato } from '@/lib/api/contracts.service';
import { mesCorto } from './meses-del-concepto';

type ConceptoQueSeLee = Pick<ConceptoDelContrato, 'paga' | 'recibe' | 'recurrente' | 'planDeMeses'>;

/**
 * ¿Entra UNA sola vez? Sin repetirse, o con un plan de un solo mes.
 *
 * La liquidación de servicios públicos de entrada (Juan, 31-10-2026: «es una
 * liquidación única que se va a cobrar cuando llega la primera factura») es un
 * concepto con plan de UN mes. Contarla con «los meses elegidos», debajo de «Se
 * le cobra al inquilino cada mes», hacía creer que era un cobro mensual.
 */
export function esDeUnaSolaVez(c: ConceptoQueSeLee): boolean {
  const plan = c.planDeMeses ?? [];
  return plan.length > 0 ? plan.length === 1 : !c.recurrente;
}

/**
 * Cuándo entra, en palabras, para el renglón del concepto (va después de «lo
 * paga …»). Lo que paga el propietario se le descuenta del giro; lo que paga el
 * inquilino entra en su cuota. Vacío para un recurrente: entra cada mes, que es
 * lo de siempre.
 */
export function cuandoEntraElConcepto(c: ConceptoQueSeLee): string {
  const plan = c.planDeMeses ?? [];
  if (plan.length > 1) return `en ${plan.length} meses`;
  if (!esDeUnaSolaVez(c)) return '';
  const mes = plan.length === 1 ? mesCorto(plan[0].mes) : null;
  const donde =
    c.paga === 'PROPIETARIO'
      ? mes
        ? `de su giro de ${mes}`
        : 'de su próximo giro'
      : c.paga === 'INQUILINO'
        ? mes
          ? `en su cuota de ${mes}`
          : 'en su próxima cuota sin pagar'
        : mes
          ? `en ${mes}`
          : '';
  const aFavor = c.recibe === 'INQUILINO' && c.paga !== 'INQUILINO' ? ' · a favor del inquilino' : '';
  return `una sola vez${donde ? `, ${donde}` : ''}${aFavor}`;
}

export interface LoDeUnaSolaVez {
  delInquilinoCop: number;
  delPropietarioCop: number;
  deOtrosCop: number;
}

/** Lo de una sola vez, por quién lo paga: al inquilino le entra en una cuota; al propietario, en un giro. */
export function loDeUnaSolaVez(conceptos: readonly (ConceptoQueSeLee & { valorCop: number })[]): LoDeUnaSolaVez {
  const r: LoDeUnaSolaVez = { delInquilinoCop: 0, delPropietarioCop: 0, deOtrosCop: 0 };
  for (const c of conceptos) {
    if (!esDeUnaSolaVez(c)) continue;
    if (c.paga === 'INQUILINO') r.delInquilinoCop += c.valorCop;
    else if (c.paga === 'PROPIETARIO') r.delPropietarioCop += c.valorCop;
    else r.deOtrosCop += c.valorCop;
  }
  return r;
}
