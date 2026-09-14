/**
 * Cartera — lo que devuelve `/inmobiliaria/cartera/*`. Espejo de
 * `back-erp/src/inmobiliaria/cartera/cartera.service.ts`: cada número tiene
 * su definición allá, al lado de la consulta que lo produce.
 */

export type TipoDeConcepto =
  | 'CANON'
  | 'ADMINISTRACION'
  | 'CONCEPTO_DEL_CONTRATO'
  | 'PRORRATEO'
  | 'INTERES_DE_MORA'
  | 'GASTO_ADMINISTRATIVO'
  | 'IVA'
  | 'RETEFUENTE'
  | 'RETEICA'
  | 'RETEIVA'
  | 'AJUSTE_MANUAL';

/** Pesos por concepto, ya con signo. Sólo los que aparecen. */
export type PorConcepto = Partial<Record<TipoDeConcepto, number>>;

export type EstadoDelCobro = 'COBRO_PENDING' | 'PAID' | 'PARTIAL' | 'LATE' | 'DEFAULTED';

export interface FilaDeCarteraDelInquilino {
  cobroId: string;
  contractId: string | null;
  /** El número que la inmobiliaria conoce (el del sistema viejo si es migrado). */
  contrato: string | null;
  /**
   * Nuestro consecutivo rotulado («Leasefy #1839»), sólo cuando `contrato` es
   * el de la inmobiliaria; `null` en un nativo. Ausente con un back anterior.
   */
  contratoDeLeasefy?: string | null;
  inmueble: string;
  month: string;
  /** `YYYY-MM-DD`. */
  vence: string;
  status: EstadoDelCobro;
  diasDeMora: number;
  /** Según la regla de cobro (plazo incluido). */
  enMora: boolean;
  enSiniestro: boolean;
  /** Lo facturado por concepto. */
  porConcepto: PorConcepto;
  /** Lo que se debe por concepto, con el abono ya imputado (mora → canon → resto). */
  saldoPorConcepto: PorConcepto;
  facturadoCop: number;
  /** `saldoCop` − Σ `saldoPorConcepto`; cero cuando el desglose cierra. */
  sinDesgloseCop: number;
  abonadoCop: number;
  saldoCop: number;
}

export interface TotalesDeCartera {
  porConcepto: PorConcepto;
  saldoPorConcepto: PorConcepto;
  facturadoCop: number;
  sinDesgloseCop: number;
  abonadoCop: number;
  saldoCop: number;
  enMoraCop: number;
  porVencerCop: number;
  enSiniestroCop: number;
  cobros: number;
}

export interface ContratoEnCartera {
  contractId: string | null;
  contrato: string | null;
  /** Ver `FilaDeCarteraDelInquilino.contratoDeLeasefy`. */
  contratoDeLeasefy?: string | null;
  inmueble: string;
}

export interface InquilinoEnCartera {
  clave: string;
  nombre: string | null;
  documento: string | null;
  telefono: string | null;
  contratos: ContratoEnCartera[];
  /** En orden cronológico. */
  filas: FilaDeCarteraDelInquilino[];
  totales: TotalesDeCartera;
}

export interface CarteraDeInquilinos {
  generadoEn: string;
  /** `YYYY-MM-DD` en Bogotá. */
  hoy: string;
  /** Las columnas: los tipos facturados en alguna fila, en orden de lectura. */
  conceptos: TipoDeConcepto[];
  totales: TotalesDeCartera;
  /** De mayor a menor saldo. */
  inquilinos: InquilinoEnCartera[];
}

export type EstadoDelGiro =
  | 'SIN_GENERAR'
  | 'DISP_PENDING'
  | 'PROCESSING'
  | 'DISP_COMPLETED'
  | 'FAILED';

export interface MesDelPropietario {
  month: string;
  recaudadoCop: number;
  comisionCop: number;
  conceptosAFavorCop: number;
  conceptosACargoCop: number;
  /** Lo que hay que girarle por el mes. */
  netoCop: number;
  estado: EstadoDelGiro;
  giradoCop: number;
  /** `netoCop` − `giradoCop`. */
  pendienteCop: number;
}

export interface TotalesDelGiro {
  netoCop: number;
  giradoCop: number;
  pendienteCop: number;
}

export interface PropietarioEnCartera {
  propietarioId: string;
  nombre: string;
  /** En orden cronológico; sólo los meses en que hubo algo. */
  meses: MesDelPropietario[];
  totales: TotalesDelGiro;
}

export interface CarteraConPropietarios {
  generadoEn: string;
  /** Todos los meses que aparecen, en orden cronológico. */
  meses: string[];
  avisos: Array<{ month: string; mensaje: string }>;
  totalesPorMes: Array<{ month: string } & TotalesDelGiro>;
  totales: TotalesDelGiro;
  /** De mayor a menor pendiente. */
  propietarios: PropietarioEnCartera[];
}
