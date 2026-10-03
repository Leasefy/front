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
  /**
   * 🔴 (02-10-2026) De las `descartadas`, las que pasaban de $2.000.000.000 y
   * no se guardaron porque la columna del back todavía es int4 (falta su
   * migración). La frase va en `avisos`. Opcional: un back de antes no lo manda.
   */
  descartadasPorValor?: number;
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
  /**
   * 🔴 (18-09-2026) Lo que hay que mirar aunque la carga haya entrado: un extracto
   * sin cuenta declarada, o de una cuenta que ningún convenio de recaudo nombra,
   * no se puede proteger de que el mismo pago entre además por el archivo del
   * banco. Opcional: un back sin desplegar no lo manda.
   */
  avisos?: string[];
  /** Por dónde entra esa cuenta. `SIN_DEFINIR` = como hoy, por extracto. */
  viaDeEntrada?: 'ARCHIVO' | 'EXTRACTO' | 'SIN_DEFINIR';
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
  /**
   * 🔴 (02-10-2026, S2-D) «Este movimiento son N recibos»: la mejor
   * combinación de recibos de caja YA EMITIDOS que suma este movimiento. Sólo
   * para los PENDIENTES; `null` si ninguna combinación suma. Opcional: un back
   * de antes no lo manda, y entonces la fila se ve como siempre.
   */
  muchosAUno?: MuchosAUnoDelMovimiento | null;
}

// ── Muchos a uno: un movimiento = la suma de VARIOS recibos (02-10-2026) ────
//
// Calcado del contrato FINAL del back (`s2d/contrato-final.md`,
// `back-erp/src/inmobiliaria/conciliacion-bancaria/muchos-a-uno.ts`).

/**
 * Conciliar muchos-a-uno NO emite recibos ni asientos: ya existen. VINCULA el
 * movimiento con sus N recibos y lo deja CONCILIADO. Casos: la aseguradora que
 * paga en una consignación los siniestros de varios inquilinos, la empresa que
 * paga el arriendo de varios empleados, el movimiento de más de $2.000M
 * partido en varios recibos, el efectivo del día.
 */
export type NivelDeConfianza = 'alta' | 'media' | 'baja';

/** Quien pagó el recibo cuando no fue el inquilino (la aseguradora, pagador D11). */
export interface PagadorDelRecibo {
  nombre: string;
  nit: string;
  siniestroReferencia: string | null;
}

export interface ReciboDeLaPropuesta {
  id: string;
  numero: number;
  /** Lo que FALTA por respaldar del recibo (normalmente su valor entero). */
  valorCop: number;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `transferencia`, `efectivo`, `cheque`, `pse`, `tarjeta`, `otro`… */
  medio: string;
  tenantName: string | null;
  propertyTitle: string | null;
  pagador: PagadorDelRecibo | null;
}

/**
 * Lo que explica que la suma no sea igual al valor del banco. Ninguna inventa
 * plata: el 4×1000 es la ley; la retención y la comisión sólo valen si la
 * inmobiliaria las configuró (`diferencias-conocidas`). Nico, 02-10-2026: una
 * combinación que sólo cuadra con una diferencia se PROPONE, nunca se aplica sola.
 */
export interface DiferenciaConocida {
  tipo: 'GMF_4X1000' | 'COMISION' | 'RETENCION';
  /** Lo que la suma de los recibos tiene de MÁS sobre el movimiento. */
  valorCop: number;
  /** La regla en palabras, para la persona. */
  regla: string;
  /** El nombre que le puso la inmobiliaria (retención o comisión). */
  nombre?: string;
}

export interface PropuestaMuchosAUno {
  reciboIds: string[];
  recibos: ReciboDeLaPropuesta[];
  sumaCop: number;
  /** `null` = la suma es EXACTA. */
  diferencia: DiferenciaConocida | null;
  /** 0–1, dos decimales (alta 0,90–0,99 · media 0,50–0,89 · baja 0,05–0,49). */
  confianza: number;
  nivel: NivelDeConfianza;
  /** ¿Es la ÚNICA combinación con evidencia, en una búsqueda completa? */
  unica: boolean;
  /** Frases concretas, en español, de por qué es esta combinación. */
  porQue: string[];
}

/**
 * Nico, 02-10-2026: el movimiento trae MÁS plata que la mejor combinación. NO
 * se concilia: va a la persona con la propuesta parcial a la vista. Nunca se
 * aprueba (el back respondería 400 `LA_SUMA_NO_CALZA`).
 */
export interface PropuestaParcial {
  reciboIds: string[];
  recibos: ReciboDeLaPropuesta[];
  sumaCop: number;
  /** Lo que trae el banco de más sobre la suma de los recibos. */
  sobranteCop: number;
  confianza: number;
  porQue: string[];
}

/** Lo que trae cada movimiento PENDIENTE de entrada en la lista (`null` en lo demás). */
export interface MuchosAUnoDelMovimiento {
  mejor: PropuestaMuchosAUno | null;
  /** Dos o más combinaciones que las señales no separan: nada se aplica solo. */
  ambigua: boolean;
  total: number;
  parcial: PropuestaParcial | null;
}

/** `GET …/movimientos/:id/recibos-que-suman`. */
export interface RespuestaRecibosQueSuman {
  movimiento: {
    id: string;
    /** `YYYY-MM-DD`. */
    fecha: string;
    valorCop: number;
    descripcion: string;
    referencia: string | null;
    estado: EstadoDelMovimientoBancario;
    extractoNombre: string | null;
  };
  /** Máximo 3, la mejor primero. Vacío si el movimiento no es una entrada PENDIENTE. */
  propuestas: PropuestaMuchosAUno[];
  ambigua: boolean;
  /** La búsqueda se cortó por presupuesto: no se afirma que sea la única. */
  agotada: boolean;
  /** Sólo cuando NINGUNA propuesta tiene señal: lo que explica parte del movimiento. */
  parcial: PropuestaParcial | null;
  /** `false` = falta la migración de la tabla de vínculos: se ve, no se aplica. */
  sePuedeAplicar: boolean;
}

/** `POST …/movimientos/:id/conciliar-con-recibos` (201). */
export interface ResultadoDeConciliarConRecibos {
  /** La fila completa; `reciboId` = el recibo de menor número (el resto va en `vinculos`). */
  movimiento: MovimientoBancario;
  recibos: ReciboDeLaPropuesta[];
  vinculos: {
    id: string;
    reciboId: string;
    valorCop: number;
    confianza: number | null;
    porQue: string[];
    conciliadoPor: 'persona' | 'piloto';
    createdAt: string;
  }[];
  /** La diferencia con la que se aceptó (sin contabilizar todavía), o `null` si fue exacta. */
  diferencia: DiferenciaConocida | null;
}

// ── Diferencias conocidas configuradas por la inmobiliaria (02-10-2026) ─────

/**
 * Nico, 02-10-2026: «Retención de aseguradora/empresa (p. ej. 3,5 % de
 * arrendamientos): SÍ se reconoce como DIFERENCIA CONOCIDA CONFIGURABLE POR
 * INMOBILIARIA». Las comisiones del banco también van acá.
 *
 * A quién se le reconoce: `aseguradoras` = todos los recibos de la combinación
 * los pagó una aseguradora; `empresas` = la línea del banco viene de una
 * empresa (NIT, «SAS», «LTDA»…); `todos` = a cualquiera.
 */
export type AQuienAplicaLaDiferencia = 'aseguradoras' | 'empresas' | 'todos';

export type DiferenciaConfigurada =
  | {
      nombre: string;
      tipo: 'RETENCION';
      /** 0 < p ≤ 100, hasta 2 decimales (3.5 = 3,5 %). */
      porcentaje: number;
      aQuien: AQuienAplicaLaDiferencia;
    }
  | {
      nombre: string;
      tipo: 'COMISION';
      /** Entero, 1..10.000.000. */
      valorCop: number;
      aQuien: AQuienAplicaLaDiferencia;
    };

/** `GET`/`PUT …/diferencias-conocidas`. */
export interface DiferenciasConocidasDeLaInmobiliaria {
  /** `false` = falta la migración: se ve, no se guarda (el PUT es un 503). */
  sePuedeGuardar: boolean;
  diferencias: DiferenciaConfigurada[];
  /** El 4×1000 es la ley: no se configura, sólo se muestra. */
  gmf: { porMil: number; politica: 'proponer' | 'aplicar' | 'no-reconocer' };
  /** Cuántas puede tener una inmobiliaria. */
  maximo: number;
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
