/**
 * Cómo va ESTE contrato con la plata, desde su estado de cuenta.
 *
 * ── 🔴 La deuda nace con el CONTRATO, no con el cobro (Nico, 2026-09-15) ─────
 * La ficha del contrato tenía dos respuestas a «¿cuánto debe?»: «Saldo del
 * inquilino — sin cobros todavía», que sumaba los COBROS emitidos, y justo
 * debajo «Resta por pagar $19.214.516», del estado de cuenta. Un contrato
 * puede deber $19 M sin un solo cobro emitido, y eso es lo normal: el cobro es
 * sólo el documento con el que finanzas reclama. Por eso NINGÚN número de acá
 * sale de los cobros. Todo sale de las filas del estado de cuenta, que son las
 * cuotas del contrato.
 *
 * ── Los TRES estados de la deuda, no dos ────────────────────────────────────
 * Espejo de `back-erp/src/inmobiliaria/cartera/cuota-es-cartera.ts`, que es la
 * definición canónica y la misma que usan Pagos y Cartera:
 *
 *   · **Al día** — nada vencido. Puede deber $19 M de cuotas futuras y estar
 *     al día: eso es lo normal, no un logro.
 *   · **Vencido, en plazo** — una cuota pasó su día pero no los días de plazo.
 *     Es deuda, NO es cartera: no corre mora y la cobranza no la toca.
 *   · **En cartera** — pasó el vencimiento MÁS los días de plazo. Ahí corre la
 *     mora y ahí —y sólo ahí— entra la cobranza.
 *
 * «Vencida» es estricta, como en el back: una cuota que vence HOY todavía se
 * puede pagar hoy, así que es la próxima, no una vencida.
 *
 * ── Por qué se calcula acá y no con el resumen barato del back ──────────────
 * `GET /estado-de-cuenta/:tipo/:id/resumen` ya separa `pendiente` y `enMora`,
 * pero es del CLIENTE: un inquilino con dos locales sumaría los dos contratos
 * en la ficha de uno. Acá se toma el contrato del documento por su `id` y se
 * aplica la misma regla a SUS filas, con SU plazo.
 *
 * ── Sólo la sección «Arriendos» ─────────────────────────────────────────────
 * Cada fila de arriendo lleva el neto ENTERO de su cuota (canon + administración
 * + impuestos), que es lo que suman los totales del back (`totalesDe`). Las
 * filas de «Otros conceptos» detallan lo que ya está adentro de ese neto:
 * sumarlas contaría la administración dos veces.
 *
 * Puro: `hoy` y el plazo entran por parámetro.
 */

import type {
  ContratoDelEstadoDeCuenta,
  FilaDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';
import { diasEntreFechas } from './avance-del-contrato';

export type EstadoDeLaDeuda =
  | 'AL_DIA'
  | 'VENCIDO_EN_PLAZO'
  | 'EN_CARTERA'
  /**
   * Hay algo vencido, pero el contrato hereda el plazo de la inmobiliaria y
   * no se pudo saber cuál es. Decir «en plazo» tranquilizaría a quien quizás
   * ya está en cartera; decir «en cartera» mandaría a cobrar a quien quizás
   * está usando su plazo. Se dice lo que se sabe.
   */
  | 'VENCIDO_SIN_PLAZO';

/** Las palabras de Pagos y de Cartera (`CuotasDelMesTabla`, `CarteraTable`). */
export const NOMBRE_DEL_ESTADO: Record<EstadoDeLaDeuda, string> = {
  AL_DIA: 'Al día',
  VENCIDO_EN_PLAZO: 'Vencido, en plazo',
  EN_CARTERA: 'En cartera',
  VENCIDO_SIN_PLAZO: 'Vencido',
};

export interface DeudaDelContrato {
  /** Todo lo que falta hasta el fin del contrato, vencido o no (totales del back). */
  restaPorPagar: number;
  /** Lo ya pagado (totales del back). */
  cancelado: number;
  /** La primera fecha con algo por pagar que todavía no venció. */
  proxima: { fecha: string; monto: number; enDias: number } | null;
  /** Lo vencido y no pagado, esté o no dentro del plazo. */
  vencido: number;
  /** Lo que pasó el plazo. Siempre ≤ `vencido`. */
  enCartera: number;
  /** Días desde que se acabó el plazo de la cuota más vieja en cartera. */
  diasDeMora: number;
  /**
   * Cuántos días de plazo le quedan a la cuota vencida que primero se queda
   * sin plazo. `null` si no hay nada vencido en plazo.
   */
  diasDePlazoQueQuedan: number | null;
  estado: EstadoDeLaDeuda;
  /**
   * La tabla de amortización en tres números, contando CUOTAS y no filas: un
   * abono parcial parte una cuota en varias filas, y contarlas diría que el
   * contrato tiene más cuotas de las que tiene.
   */
  cuotas: {
    /** Canceladas del todo en Leasefy. */
    pagadas: number;
    /** Del sistema anterior: ocurrieron, pero no las respondemos. */
    anteriores: number;
    /** Todas menos las anuladas. */
    total: number;
  };
}

function dia(f: FilaDelEstadoDeCuenta): string {
  return f.fechaVencimiento.slice(0, 10);
}

export function deudaDelContrato(args: {
  contrato: ContratoDelEstadoDeCuenta;
  /** `YYYY-MM-DD`. */
  hoy: string;
  /** Los días de plazo que rigen, ya resueltos. `null` = no se conocen. */
  diasDePlazo: number | null;
}): DeudaDelContrato {
  const { contrato, hoy, diasDePlazo } = args;
  const filas = contrato.secciones.arriendos;

  let vencido = 0;
  let enCartera = 0;
  let diasDeMora = 0;
  let diasDePlazoQueQuedan: number | null = null;
  const futuras = new Map<string, number>();

  for (const fila of filas) {
    if (fila.estado !== 'PENDIENTE' || fila.valorNeto <= 0) continue;
    const desdeElVencimiento = diasEntreFechas(dia(fila), hoy);

    if (desdeElVencimiento <= 0) {
      futuras.set(dia(fila), (futuras.get(dia(fila)) ?? 0) + fila.valorNeto);
      continue;
    }

    vencido += fila.valorNeto;
    if (diasDePlazo === null) continue;

    const mora = desdeElVencimiento - diasDePlazo;
    if (mora > 0) {
      enCartera += fila.valorNeto;
      diasDeMora = Math.max(diasDeMora, mora);
    } else {
      const quedan = diasDePlazo - desdeElVencimiento;
      diasDePlazoQueQuedan =
        diasDePlazoQueQuedan === null ? quedan : Math.min(diasDePlazoQueQuedan, quedan);
    }
  }

  const fechaProxima = [...futuras.keys()].sort()[0];
  const proxima = fechaProxima
    ? {
        fecha: fechaProxima,
        monto: futuras.get(fechaProxima) ?? 0,
        enDias: diasEntreFechas(hoy, fechaProxima),
      }
    : null;

  const estado: EstadoDeLaDeuda =
    enCartera > 0
      ? 'EN_CARTERA'
      : vencido > 0
        ? diasDePlazo === null
          ? 'VENCIDO_SIN_PLAZO'
          : 'VENCIDO_EN_PLAZO'
        : 'AL_DIA';

  // Cuotas, no filas: se agrupa por la cuota de la que salió cada fila.
  const porCuota = new Map<string, FilaDelEstadoDeCuenta[]>();
  for (const fila of filas) {
    const llave = fila.cuotaId ?? `${dia(fila)}|${fila.concepto.replace(/^Saldo pendiente por /, '')}`;
    porCuota.set(llave, [...(porCuota.get(llave) ?? []), fila]);
  }
  let pagadas = 0;
  let anteriores = 0;
  let total = 0;
  for (const grupo of porCuota.values()) {
    if (grupo.every((f) => f.estado === 'ANULADA')) continue;
    total += 1;
    if (grupo.some((f) => f.estado === 'ANTERIOR')) anteriores += 1;
    else if (grupo.every((f) => f.estado === 'CANCELADA')) pagadas += 1;
  }

  return {
    restaPorPagar: contrato.totales.restaPorPagar,
    cancelado: contrato.totales.cancelado,
    proxima,
    vencido,
    enCartera,
    diasDeMora,
    diasDePlazoQueQuedan,
    estado,
    cuotas: { pagadas, anteriores, total },
  };
}
