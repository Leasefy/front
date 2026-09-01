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

export interface ResultadoDeConciliar {
  movimiento: MovimientoBancario;
  recibo: { id: string; numero: number };
  cobro: { id: string; paidAmount: number; status: string };
}

export interface ResultadoDeSeguros {
  conciliados: number;
  sinCandidatoSeguro: number;
  errores: { movimientoId: string; mensaje: string }[];
}
