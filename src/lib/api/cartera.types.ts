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
  saldoCop: number;
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
