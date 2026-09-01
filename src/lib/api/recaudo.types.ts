/**
 * Recaudo — `GET /inmobiliaria/recaudo/{resumen,serie}`.
 *
 * Cada cifra tiene UNA definición, la del back (`recaudo.service.ts`), y la
 * pantalla la repite debajo del número. Acá sólo se copian los nombres.
 */

export interface ResumenDeRecaudo {
  /** `YYYY-MM`. */
  month: string;
  /** Σ total con mora de los cobros del mes: lo que se le pidió a los inquilinos. */
  facturadoCop: number;
  /** Σ recibos de caja vivos con fecha en el mes, del cobro que sea: lo que llegó. */
  recaudadoCop: number;
  /** Lo mismo, sólo de recibos cuyo cobro es del mes. */
  recaudadoDelMesCop: number;
  /** Σ saldo de los cobros del mes que no están pagados. */
  pendienteCop: number;
  /** Σ saldo de los cobros en mora o siniestro, del mes y anteriores. */
  enMoraCop: number;
  /** Lo que salió a propietarios en el mes: lotes pagados + giros uno a uno. */
  dispersadoCop: number;
  /** La comisión que la inmobiliaria se quedó al girar eso. */
  comisionesCop: number;
  /** Recaudado acumulado − dispersado acumulado − comisiones acumuladas, al cierre del mes. */
  disponibleCop: number;
  porMedio: Array<{ medio: string; valorCop: number; cantidad: number }>;
  cobrosPagados: number;
  cobrosPendientes: number;
  cobrosEnMora: number;
}

export interface PuntoDeLaSerie {
  month: string;
  facturadoCop: number;
  recaudadoCop: number;
  dispersadoCop: number;
}
