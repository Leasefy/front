/**
 * Cartera — lo que devuelve `/inmobiliaria/cartera/*`. Espejo de
 * `back-erp/src/inmobiliaria/cartera/cartera.service.ts`: cada número tiene
 * su definición allá, al lado de la consulta que lo produce.
 */

import type { InteresDeMora } from '@/lib/types/inmobiliaria';

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

/** El estado de la CUOTA (`contrato_cuotas.estado`), no el del cobro. */
export type EstadoDeCuota =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'CANCELADA'
  | 'ANULADA'
  | 'ANTERIOR';

/**
 * 🔴 Los tres estados de una deuda, que NO son sinónimos y que ninguna pantalla
 * puede volver a mezclar (Nico, 2026-09-15):
 *
 *   · `POR_VENCER` ...... todavía no vence. Es deuda del contrato, no cartera.
 *   · `VENCIDA_EN_PLAZO`  venció, pero los días de plazo del contrato siguen
 *                         corriendo: sigue siendo deuda, no le corre interés y
 *                         la cobranza no la toca.
 *   · `CARTERA` ......... pasó el vencimiento MÁS el plazo. Ahí —y sólo ahí—
 *                         entra la cobranza.
 *
 * Los cajones son una PARTICIÓN: cada cuota cae en uno solo, así que
 * `porVencer + vencidaEnPlazo + cartera = deuda total` cierra por construcción.
 */
export type CajonDeLaCuota = 'POR_VENCER' | 'VENCIDA_EN_PLAZO' | 'CARTERA' | 'SIN_DEUDA';

export interface FilaDeCarteraDelInquilino {
  /**
   * 🔴 La cuota: la identidad de la fila (una por contrato, lado y mes). Antes
   * esta llave era `cobroId`, que hoy viene en `null` en TODA fila migrada —
   * usarla como `key` de React duplicaba claves en silencio.
   */
  cuotaId: string;
  /**
   * El `Cobro` que MATERIALIZÓ esta cuota, si ya existe. `null` en las 30.951
   * de la agencia migrada y en toda cuota que finanzas no reclamó todavía.
   */
  cobroId: string | null;
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
  /** `YYYY-MM-DD`, el día de cartera del período. De acá arranca el plazo. */
  vence: string;
  /** El estado de la CUOTA. Antes acá venía el `status` del cobro. */
  estado: EstadoDeCuota;
  /** En cuál de los tres cajones cae. Los tres no se solapan. */
  cajon: CajonDeLaCuota;
  diasDeMora: number;
  /** Los días de plazo que rigen para este contrato, ya resueltos. */
  diasDePlazo: number;
  /** El día de cartera ya pasó. Puede ser deuda vencida SIN ser cartera. */
  esVencida: boolean;
  /** 🔴 ES CARTERA: pasó el vencimiento más los días de plazo del contrato. */
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
  /** 🔴 EL CAPITAL que falta. Nunca incluye el interés. */
  saldoCop: number;
  /** El interés de mora de la cuota, liquidado hoy. Aparte del capital. */
  interes?: InteresDeMora;
  /** `saldoCop + interes.pendienteCop`. */
  totalConInteresCop?: number;
}

export interface TotalesDeCartera {
  porConcepto: PorConcepto;
  saldoPorConcepto: PorConcepto;
  facturadoCop: number;
  sinDesgloseCop: number;
  abonadoCop: number;
  /** 🔴 LA DEUDA TOTAL: todo lo pendiente, venza cuando venza. */
  saldoCop: number;
  /**
   * 🔴 LA CARTERA: saldo de las cuotas que pasaron el plazo (siniestros
   * incluidos). Conserva el nombre porque es lo que la pantalla rotula «En
   * mora» y significa exactamente lo mismo que antes.
   */
  enMoraCop: number;
  /**
   * Saldo vencido que TODAVÍA está dentro de los días de plazo del contrato.
   * Es deuda, no es cartera: la cobranza no lo toca y no le corre interés.
   */
  vencidaEnPlazoCop: number;
  /**
   * 🔴 Cambió de significado el 2026-09-15: antes incluía lo vencido dentro del
   * plazo; ahora es estrictamente lo que NO ha vencido.
   */
  porVencerCop: number;
  enSiniestroCop: number;
  /** 🔴 El interés de mora que falta, sumado. Va aparte del capital. */
  interesCop?: number;
  /** `saldoCop + interesCop`. */
  totalConInteresCop?: number;
  /** Cuotas ya pagadas que siguen debiendo el interés de su mora. */
  cuotasPagadasEnMora?: number;
  /** Cuántas cuotas. */
  cuotas: number;
  /** @deprecated Alias de `cuotas`. La unidad ya no es el cobro. */
  cobros: number;
}

export interface ContratoEnCartera {
  contractId: string | null;
  contrato: string | null;
  /** Ver `FilaDeCarteraDelInquilino.contratoDeLeasefy`. */
  contratoDeLeasefy?: string | null;
  inmueble: string;
  /**
   * 🔴 COBRO JURÍDICO (17-09-2026): «"en jurídico" se ve en el contrato y en la
   * cartera». Ausente = no está en jurídico (o la base no tiene la migración).
   */
  enJuridico?: { casoId: string; abogado: string; pasadoAt: string } | null;
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
  /** `YYYY-MM-DD` en Bogotá: contra qué día se leyó «vence». */
  hoy: string;
  /** Las columnas: los tipos facturados en alguna fila, en orden de lectura. */
  conceptos: TipoDeConcepto[];
  totales: TotalesDeCartera;
  /** De mayor a menor saldo. */
  inquilinos: InquilinoEnCartera[];
  /**
   * 🔴 Contratos vigentes SIN una sola cuota de inquilino (195 en dev el
   * 15-09). Su deuda NO está en estos números porque nadie generó su tabla de
   * amortización todavía. Se cuenta y se dice: un cero por omisión es
   * exactamente el error que esta pantalla vino a arreglar.
   *
   * Opcional: un back anterior a este cambio no lo manda.
   */
  contratosSinCuotas?: number;
  /** Lo que estos números NO incluyen, escrito para que lo lea una persona. */
  avisos?: string[];
  /** La agencia no tiene reglas de mora activas y hay cartera: el 0 no es «sin mora». */
  sinReglasDeMora?: boolean;
}

/**
 * Una cuota del mes, tal como la devuelve `GET /inmobiliaria/cartera/mes`.
 *
 * Espejo de `back-erp/src/inmobiliaria/cartera/cartera-del-mes.ts`. Es la
 * misma fuente que la cartera por concepto —las cuotas del contrato— con otro
 * alcance: un mes, y también las cuotas ya saldadas.
 */
export interface FilaDeLaCuotaDelMes {
  /** 🔴 La llave de la fila. Nunca `cobroId`: viene `null` en toda cuota migrada. */
  cuotaId: string;
  /** El `Cobro` que MATERIALIZÓ esta cuota, si finanzas ya lo emitió. */
  cobroId: string | null;
  contractId: string;
  contrato: string | null;
  contratoDeLeasefy: string | null;
  inquilino: string | null;
  /**
   * 🔴 Contra quién se emite el recibo de caja Y con qué se abre el estado de
   * cuenta del cliente. `null` = el inquilino no tiene cuenta en el portal, que
   * es lo normal en lo migrado: ahí el que identifica es el `documento`, y el
   * back acepta los dos (`GET /estado-de-cuenta/inquilino/:tenantRef`).
   */
  tenantId: string | null;
  documento: string | null;
  telefono: string | null;
  inmueble: string;
  /**
   * `YYYY-MM`, el período de la cuota.
   *
   * 🔴 Se llamaba `month` en este espejo y el back siempre mandó `mes`: la
   * columna «Período» de la tabla del mes venía leyendo `undefined` y salía en
   * blanco. Los nombres de este archivo son los del back, no los del front.
   */
  mes: string;
  /** `YYYY-MM-DD`, el día de cartera del período. De acá arranca el plazo. */
  vence: string;
  estado: EstadoDeCuota;
  cajon: CajonDeLaCuota;
  diasDeMora: number;
  diasDePlazo: number;
  esVencida: boolean;
  /** 🔴 ES CARTERA: pasó el vencimiento MÁS los días de plazo del contrato. */
  enMora: boolean;
  enSiniestro: boolean;
  /** Lo que el período le cuesta al inquilino (lo pactado). */
  totalCop: number;
  pagadoCop: number;
  /** 🔴 El CAPITAL que falta. Nunca incluye el interés. */
  pendienteCop: number;
  /**
   * El interés de mora de la cuota, con la MISMA lectura que la cartera por
   * concepto y el estado de cuenta. Una cuota ya pagada que todavía lo debe
   * llega en `CARTERA` con `pendienteCop` en cero.
   */
  interes?: InteresDeMora;
  /** `pendienteCop + interes.pendienteCop`. */
  totalConInteresCop?: number;
}

export interface TotalesDelMes {
  cuotas: number;
  contratos: number;
  inquilinos: number;
  /** 🔴 LO QUE SE DEBE EN EL MES. Existe desde que se firmó el contrato. */
  totalCop: number;
  pagadoCop: number;
  /** Lo que falta. `porVencer + vencidaEnPlazo + cartera` lo reconstruye. */
  pendienteCop: number;
  porVencerCop: number;
  vencidaEnPlazoCop: number;
  /** 🔴 LA CARTERA: lo único que la cobranza persigue. */
  carteraCop: number;
  cuotasEnCartera: number;
  enSiniestroCop: number;
  /** 🔴 El interés de mora que falta en el mes. Aparte del capital. */
  interesCop?: number;
  /** `pendienteCop + interesCop`. */
  totalConInteresCop?: number;
  /** Cuotas ya pagadas que siguen debiendo el interés de su mora. */
  cuotasPagadasEnMora?: number;
  /** `totalCop − (pagadoCop + pendienteCop)`. Cero cuando las cuotas cuadran. */
  sinCuadrarCop: number;
}

export interface CarteraDelMes {
  generadoEn: string;
  /** `YYYY-MM-DD` en Bogotá: contra qué día se leyó «vence». */
  hoy: string;
  mes: string;
  totales: TotalesDelMes;
  /** Cartera primero, después lo vencido en plazo, lo futuro y lo saldado. */
  filas: FilaDeLaCuotaDelMes[];
  /** Contratos vigentes SIN tabla de amortización: su deuda no está acá. */
  contratosSinCuotas: number;
  /** Cuotas del mes que el contrato ya no cubre, con su motivo. */
  excluidas: { estado: 'ANULADA' | 'ANTERIOR'; cuotas: number; motivo: string }[];
  /** Lo que estos números NO incluyen, escrito para que lo lea una persona. */
  avisos: string[];
  /** La agencia no tiene reglas de mora activas y el mes tiene cartera. */
  sinReglasDeMora?: boolean;
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
