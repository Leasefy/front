/**
 * Recaudo — `GET /inmobiliaria/recaudo/{resumen,serie}`.
 *
 * Cada cifra tiene UNA definición, la del back (`recaudo.service.ts`), y la
 * pantalla la repite debajo del número. Acá sólo se copian los nombres.
 *
 * ── 🔴 Lo que cambió el 2026-09-16, y por qué importa acá ──────────────────
 *
 * Las tres cifras de deuda salían de `Cobro`, el DOCUMENTO con el que finanzas
 * reclama. La inmobiliaria migrada tiene **0 cobros** y 30.951 cuotas de
 * inquilino: septiembre de 2026 se pintaba «Facturado $0 · Pendiente $0»
 * teniendo **$1.251,0 millones** de deuda viva ese mes y **$655,1 millones** de
 * cartera acumulada. La deuda nace con el CONTRATO y vive en `contrato_cuotas`.
 *
 * Por eso las cifras quedaron en TRES bloques que no se mezclan, y el nombre de
 * cada una dice de cuál es. Mezclarlas es cómo se termina rotulando «el saldo
 * de los 0 cobros del mes» sobre $1.251 millones.
 */

import type { TasaDeRecaudo } from '@/lib/tasa-de-recaudo';

export interface ResumenDeRecaudo {
  /** `YYYY-MM`. */
  month: string;

  // ── LA DEUDA: sale de `contrato_cuotas` ──────────────────────────────────
  /** 🔴 Lo que el mes hace deber por contrato, pagado o no. Existe desde la firma. */
  deudaDelMesCop: number;
  /** 🔴 Σ saldo de las cuotas del mes: lo que de ese mes todavía se debe. */
  pendienteCop: number;
  /**
   * 🔴 LA CARTERA acumulada: saldo de las cuotas (del mes y anteriores) que
   * pasaron el vencimiento MÁS los días de plazo del contrato. Lo vencido
   * DENTRO del plazo no entra: es deuda, no cartera.
   */
  enMoraCop: number;
  cuotasDelMes: number;
  cuotasPagadas: number;
  /** Cuotas del mes en PENDIENTE o PARCIAL. */
  cuotasPendientes: number;
  /** Cuántas cuotas hay detrás de `enMoraCop`. */
  cuotasEnCartera: number;

  // ── EL RECLAMO: sale de `Cobro`, el documento ────────────────────────────
  /** Σ total con mora de los COBROS del mes: lo que finanzas alcanzó a emitir. */
  facturadoCop: number;
  /** `0` dice «no hay documento», que es distinto de «no se debe nada». */
  cobrosEmitidos: number;
  cobrosPagados: number;
  cobrosPendientes: number;
  cobrosEnMora: number;

  // ── LA PLATA: recibos de caja y giros ────────────────────────────────────
  /** Σ recibos de caja vivos con fecha en el mes, del cobro que sea: lo que llegó. */
  recaudadoCop: number;
  /** Lo mismo, sólo de recibos cuyo cobro es del mes. */
  recaudadoDelMesCop: number;
  /** Lo que salió a propietarios en el mes: lotes pagados + giros uno a uno. */
  dispersadoCop: number;
  /** La comisión que la inmobiliaria se quedó al girar eso. */
  comisionesCop: number;
  /** Recaudado acumulado − dispersado acumulado − comisiones acumuladas, al cierre. */
  disponibleCop: number;
  porMedio: Array<{ medio: string; valorCop: number; cantidad: number }>;

  // ── LA TASA ──────────────────────────────────────────────────────────────
  /**
   * 🔴 La tasa de recaudo del mes, medida como la eligió la inmobiliaria y con
   * su fórmula. Antes la pantalla dividía `recaudadoCop` (la caja del mes, de
   * cualquier período) entre la deuda: una tercera definición.
   */
  tasaDeRecaudo?: TasaDeRecaudo;
}

export interface PuntoDeLaSerie {
  month: string;
  /** 🔴 Lo que ese mes hizo deber por contrato. El denominador de la tasa. */
  deudaDelMesCop: number;
  /** Lo que se emitió como documento ese mes. Puede ser 0 con deuda real. */
  facturadoCop: number;
  recaudadoCop: number;
  dispersadoCop: number;
  /** La tasa de recaudo de ese mes, como la eligió la inmobiliaria. */
  tasaDeRecaudo?: TasaDeRecaudo;
}

// ── La comparativa: `GET /inmobiliaria/recaudo/comparativa` (2026-09-25) ──────
//
// El mes contra el anterior A LA MISMA FECHA (día N contra día N), el recaudo
// acumulado día a día de los dos y la proyección del cierre. Las definiciones
// viven en el back (`recaudo/comparativa-del-mes.ts`); acá sólo se copian.

export interface VariacionDeLaCifra {
  /** El valor del mes en foco, al día de corte. */
  actualCop: number;
  /** El del mes anterior al mismo día. `null` = no hay dato. */
  anteriorCop: number | null;
  /** 🔴 `null` = SIN COMPARACIÓN (anterior 0, negativo o sin dato). Nunca «0 %» ni «∞». */
  pct: number | null;
}

export interface MesDeHistoria {
  month: string;
  vencioCop: number;
  pagadoDentroCop: number;
  /** Entre 0 y 1. */
  tasa: number;
}

export interface ProyeccionDelCierre {
  estado: 'PROYECTADA' | 'SIN_HISTORIA' | 'MES_CERRADO';
  llegoCop: number;
  porVencerCop: number;
  /** Σ pagado dentro ÷ Σ lo que vencía. `null` sin historia o con el mes cerrado. */
  tasa: number | null;
  /** Sólo los meses con deuda que SÍ se usaron. */
  historia: MesDeHistoria[];
  mesesPedidos: number;
  /** `null` = no se proyecta (sin historia). Nunca pintarlo como `$ 0`. */
  cierreCop: number | null;
  rango: { minCop: number; maxCop: number } | null;
}

export interface DiaDeLaComparativa {
  dia: number;
  /** `null` = el día todavía no pasó. */
  esteMesCop: number | null;
  /** `null` = el mes anterior no tiene ese día. */
  mesAnteriorCop: number | null;
}

export interface ComparativaDelMes {
  month: string;
  mesAnterior: string;
  enCurso: boolean;
  /** Hoy si el mes está en curso; su último día si ya cerró. */
  dia: number;
  diaDelMesAnterior: number;
  dias: DiaDeLaComparativa[];
  vsMesAnterior: {
    seDebe: VariacionDeLaCifra;
    llego: VariacionDeLaCifra;
    falta: VariacionDeLaCifra;
    salio: VariacionDeLaCifra;
    queda: VariacionDeLaCifra;
  };
  proyeccion: ProyeccionDelCierre;
}
