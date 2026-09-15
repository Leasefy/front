/**
 * Conciliación bancaria — tipos calcados de
 * `back-erp/src/inmobiliaria/conciliacion-bancaria/`.
 */

export type EstadoDelMovimientoBancario = 'PENDIENTE' | 'CONCILIADO' | 'IGNORADO';

export interface FilaDeExtracto {
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** Pesos enteros; positivo = entrada, negativo = salida. */
  valorCop: number;
  descripcion: string;
  referencia?: string;
}

export interface ResultadoDeCarga {
  nuevas: number;
  repetidas: number;
  salidas: number;
  descartadas: number;
  /** Líneas nuevas que ya estaban pagadas por la pasarela: quedan ignoradas con su motivo. */
  yaPagadasPorPasarela: number;
  /** Entradas pendientes de conciliar en la agencia, después de esta carga. */
  pendientes: number;
  /** De las pendientes, cuántas tienen exactamente un candidato seguro. */
  seguras: number;
}

export interface CandidatoDeConciliacion {
  cobroId: string;
  tenantName: string | null;
  propertyTitle: string;
  month: string;
  saldoCop: number;
  puntaje: number;
  porQue: string[];
  seguro: boolean;
}

export interface MovimientoBancario {
  id: string;
  agencyId: string;
  /** ISO del día (`2026-09-03T00:00:00.000Z`). */
  fecha: string;
  valorCop: number;
  descripcion: string;
  referencia: string | null;
  extractoNombre: string | null;
  estado: EstadoDelMovimientoBancario;
  cobroId: string | null;
  reciboId: string | null;
  motivoIgnorado: string | null;
  conciliadoPorUserId: string | null;
  conciliadoAt: string | null;
  cargadoPorUserId: string;
  createdAt: string;
  candidatos: CandidatoDeConciliacion[];
  recibo: { id: string; numero: number; anuladoAt: string | null } | null;
}

export interface PaginaDeMovimientos {
  data: MovimientoBancario[];
  total: number;
  limite: number;
  desplazamiento: number;
}

export interface FiltrosDeMovimientos {
  estado?: EstadoDelMovimientoBancario;
  desde?: string;
  hasta?: string;
  limite?: number;
  desplazamiento?: number;
}

export interface ResumenDeConciliacion {
  pendientes: number;
  ignorados: number;
  conciliadosEsteMes: number;
  ultimoExtracto: { nombre: string | null; cargadoAt: string } | null;
}

/**
 * Contra qué se concilia una línea del banco.
 *
 * 🔴 `tenantId` es lo que destraba el extracto (2026-09-15): antes sólo se
 * podía conciliar contra un cobro que YA existiera, y si el mes que la persona
 * pagó no estaba cobrado la línea no tenía a dónde ir. Con el cliente, el back
 * reparte la plata a su deuda más vieja, cobra el mes en curso si hace falta y
 * deja el sobrante a su favor.
 */
export type DestinoDeConciliacion = { cobroId: string } | { tenantId: string };

export interface ResultadoDeConciliar {
  movimiento: MovimientoBancario;
  /**
   * 🔴 Pueden venir en NULO: cuando se concilia contra un cliente que no debía
   * nada, el pago entero queda como saldo a favor y no hay ningún recibo que
   * mostrar. Pintar `recibo.numero` sin guardia revienta la pantalla justo en
   * el caso que este cambio vino a habilitar.
   */
  recibo: { id: string; numero: number } | null;
  cobro: { id: string; paidAmount: number; status: string } | null;
  /** El detalle del reparto, sólo cuando se concilió contra un CLIENTE. */
  pago?: {
    recibos: { id: string; numero: number | string; valorCop: number }[];
    imputacion: { month: string; propertyTitle: string; valorCop: number }[];
    totalCop: number;
    deudaRestante: number;
    anticipoCop?: number;
  };
}

export interface ResultadoDeSeguros {
  conciliados: number;
  sinCandidatoSeguro: number;
  errores: { movimientoId: string; mensaje: string }[];
}
