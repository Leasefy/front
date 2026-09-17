'use client';

/**
 * Lo que el mandato (17-09) le agrega a una liquidación, en pantalla:
 *
 *   · D1 GARANTIZADO — se gira el canon causado aunque el inquilino no haya
 *     pagado; lo girado sin recaudo queda como cuenta por cobrar al inquilino.
 *   · D1 SOBRE RECAUDO — se gira lo que el inquilino ya pagó; una cuota que
 *     pagó tarde entra en la liquidación siguiente, y por eso un renglón puede
 *     traer un mes distinto al de la liquidación.
 *   · D2 — intereses de mora y gastos de cobranza recaudados que son del
 *     propietario: entran como renglón propio, sin comisión.
 *
 * Ninguno de los dos números cambia lo que se gira: lo explican. Un back sin
 * las migraciones no los manda y acá no se pinta nada.
 */

import { HandCoins, Receipt, Warning } from '@phosphor-icons/react';

import { NOMBRE_DE_LA_MODALIDAD, PESOS, mesLegible } from '@/lib/mandato/textos';
import type { DispersionItem } from '@/lib/types/inmobiliaria';

export interface NumerosDelMandato {
  /** Lo girado sin recaudo del inquilino (garantizado). */
  cuentaPorCobrarAlInquilinoCop?: number;
  /** Intereses de mora y gastos de cobranza recaudados que se le giran (D2). */
  interesesCop?: number;
}

/** ¿Vale la pena pintar el bloque? Sin mandato, los dos vienen en 0 o ausentes. */
export function hayAlgoDelMandato(n: NumerosDelMandato): boolean {
  return (n.cuentaPorCobrarAlInquilinoCop ?? 0) > 0 || (n.interesesCop ?? 0) > 0;
}

export function ResumenDelMandato({
  numeros,
  className,
}: {
  numeros: NumerosDelMandato;
  className?: string;
}) {
  if (!hayAlgoDelMandato(numeros)) return null;
  const cxc = numeros.cuentaPorCobrarAlInquilinoCop ?? 0;
  const intereses = numeros.interesesCop ?? 0;

  return (
    <div
      className={`rounded-lg border border-border bg-muted/30 p-4 space-y-3 ${className ?? ''}`}
      data-testid="resumen-del-mandato"
    >
      {cxc > 0 ? (
        <div className="flex gap-2">
          <Warning className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{PESOS.format(cxc)}</span> se giran sin
            que el inquilino los haya pagado (mandato garantizado). Quedan como cuenta por cobrar
            al inquilino y se recuperan cuando pague.
          </p>
        </div>
      ) : null}
      {intereses > 0 ? (
        <div className="flex gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{PESOS.format(intereses)}</span> de
            intereses de mora y gastos de cobranza recaudados van al propietario. No llevan
            comisión.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * El rótulo de UN renglón: su modalidad, el mes que trae si no es el de la
 * liquidación, lo girado sin recaudo y el recibo de los intereses.
 */
export function RotuloDelMandato({
  item,
  mesDeLaLiquidacion,
}: {
  item: Pick<
    DispersionItem,
    'modalidad' | 'fuenteDeLaModalidad' | 'mesDeLaCuota' | 'sinRecaudoCop' | 'interesDelRecibo'
  >;
  mesDeLaLiquidacion?: string;
}) {
  const partes: string[] = [];
  if (item.modalidad) partes.push(NOMBRE_DE_LA_MODALIDAD[item.modalidad]);
  if (item.mesDeLaCuota && item.mesDeLaCuota !== mesDeLaLiquidacion) {
    partes.push(`cuota de ${mesLegible(item.mesDeLaCuota)}`);
  }
  if ((item.sinRecaudoCop ?? 0) > 0) {
    partes.push(`${PESOS.format(item.sinRecaudoCop ?? 0)} sin recaudo`);
  }
  if (item.interesDelRecibo) {
    partes.push(
      item.interesDelRecibo.reciboNumero
        ? `intereses del recibo N.º ${item.interesDelRecibo.reciboNumero}`
        : 'intereses recaudados',
    );
  }
  if (partes.length === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      data-testid="rotulo-del-mandato"
    >
      <HandCoins className="w-3 h-3" aria-hidden="true" />
      {partes.join(' · ')}
    </span>
  );
}
