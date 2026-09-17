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
  /**
   * 🔴 (17-09-2026) Al cargar, el sistema arma el LOTE de lo que calza exacto
   * (referencia de recaudo + valor exacto). `null` si nada calza o si la base
   * no tiene la migración del lote.
   */
  lote?: LoteDeConciliacion | null;
}

/**
 * Un cruce propuesto para una línea del banco.
 *
 * 🔴 Desde el 15-09 el cruce es contra las CUOTAS del contrato, no contra un
 * cobro: la deuda nace con el contrato, y en la inmobiliaria migrada no hay un
 * solo cobro emitido contra 30.951 cuotas pendientes. Por eso lo que identifica
 * al candidato es el contrato (y a quién cobrarle), no el documento del mes.
 */
export interface CandidatoDeConciliacion {
  contractId: string;
  /** Contra quién se emite el recibo. `null` = el contrato no llega a una cuenta. */
  tenantId: string | null;
  tenantName: string | null;
  propertyTitle: string;
  /** Los meses que cubre el movimiento, en orden. Un pago puede cubrir varios. */
  meses: string[];
  pendienteCop: number;
  cuotaIds: string[];
  /** El cobro que ya documentaba esas cuotas, si alguien lo emitió. Casi siempre `null`. */
  cobroId: string | null;
  /** El tramo propuesto todavía no vence: es un adelanto, no una deuda atrasada. */
  adelanto: boolean;
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
  /** Desde el 17-09 «conciliar seguros» ya no concilia: arma el lote. */
  lote?: LoteDeConciliacion | null;
}

// ── El lote de lo que calza EXACTO (17-09-2026) ─────────────────────────────

/**
 * «Conciliación bancaria: sólo lo que calza EXACTO (referencia de recaudo +
 * valor exacto): el sistema arma el LOTE y un funcionario lo aprueba de una
 * vez, lo que genera los recibos. Lo que no calza va a la cola manual. Un
 * administrador puede reversar.»
 */
export type EstadoDelLote = 'PROPUESTO' | 'APROBADO' | 'DESCARTADO' | 'REVERSADO';

export interface MovimientoDelLote {
  id: string;
  movimientoId: string;
  contractId: string;
  tenantId: string;
  valorCop: number;
  meses: string[];
  referencia: string | null;
  /** FALLIDO = al aprobar ya no calzaba: volvió a la cola manual. */
  estado: 'INCLUIDO' | 'CONCILIADO' | 'FALLIDO' | 'REVERSADO';
  reciboIds: string[];
  motivo: string | null;
  tenantName?: string | null;
  propertyTitle?: string | null;
  fecha?: string | null;
}

export interface LoteDeConciliacion {
  id: string;
  estado: EstadoDelLote;
  armadoPor: 'persona' | 'extracto' | 'piloto';
  cantidad: number;
  totalCop: number;
  armadoAt: string;
  aprobadoAt: string | null;
  conciliados: number | null;
  fallidos: number | null;
  reversadoAt: string | null;
  motivoDeReversa: string | null;
  movimientos: MovimientoDelLote[];
}

export interface LoteActual {
  /** `false` = la base no tiene la migración 20260917160000. */
  disponible: boolean;
  propuesto: LoteDeConciliacion | null;
  recientes: LoteDeConciliacion[];
}
