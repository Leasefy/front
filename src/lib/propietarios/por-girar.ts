/**
 * «Por girar»: UNA sola cifra y UNAS solas palabras en toda la plataforma.
 *
 * Nico, 04-10-2026, tal cual: «Por girar» → una sola cifra: hasta el mes en
 * curso; lo de meses futuros aparte como «próximos giros».
 *
 * La cifra la calcula el back (`dispersiones/por-girar.ts`: el Tablero,
 * «Cartera → Por pagar», Liquidaciones, los pendientes del chat y el estado de
 * cuenta del propietario la leen de ahí, neta de deducciones). Este archivo
 * sólo dice cómo se ROTULA, para que las pantallas no la llamen distinto.
 */

import { nombreDelMes } from '@/lib/recaudo/meses';

/** Lo que manda el back en cada pantalla. */
export interface PorGirarDelBack {
  /** `AAAA-MM`: el mes en curso, último que entra. */
  hastaMes: string;
  porGirarCop: number;
  /** Deducciones vivas ya descontadas (reparaciones, descuentos, saldo en contra). */
  deduccionesCop?: number;
  proximosGiros: {
    desdeMes: string;
    hastaMes: string;
    totalCop: number;
  };
}

/** «Por girar hasta octubre de 2026». */
export function rotuloDePorGirar(hastaMes: string): string {
  return `Por girar hasta ${nombreDelMes(hastaMes)}`;
}

/** «Próximos giros · noviembre de 2026 a enero de 2027». */
export function rotuloDeProximosGiros(desdeMes: string, hastaMes: string): string {
  return desdeMes === hastaMes
    ? `Próximos giros · ${nombreDelMes(desdeMes)}`
    : `Próximos giros · ${nombreDelMes(desdeMes)} a ${nombreDelMes(hastaMes)}`;
}

/** La definición que va debajo de la cifra, igual en todas las pantallas. */
export function definicionDePorGirar(hastaMes: string): string {
  return `Lo que se le debe girar a los propietarios de ${nombreDelMes(
    hastaMes,
  )} y los meses anteriores y todavía no ha salido (también lo que ya está en un lote sin pagar), descontadas sus deducciones. Es la misma cifra en el Tablero, en Cartera → Por pagar y en Liquidaciones; los meses siguientes van aparte, como próximos giros.`;
}
