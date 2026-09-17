/**
 * La lógica financiera del 17-09 — los tipos del CONTRATO, tal cual.
 *
 * Fuente de verdad: `back-erp/docs/contratos/finanzas-17-09.md` (contrato
 * congelado). Acá no se inventa un campo: lo que no está ahí, no está acá.
 *
 * ── Las dos formas de decir «todavía no» ────────────────────────────────────
 *
 * El back arrancó estas siete piezas con cuatro migraciones que aplica Víctor,
 * y hasta que las aplique responde de dos maneras distintas —a propósito—:
 *
 *   · las LECTURAS devuelven 200 con `disponible: false` y el `motivo` en
 *     palabras, para que la pantalla lo pueda explicar en vez de romperse;
 *   · las ESCRITURAS devuelven 503 con un `code` (`USURA_SIN_MIGRAR`,
 *     `DETERIORO_SIN_MIGRAR`, `SEDES_SIN_MIGRAR`, `GIROS_DEVUELTOS_SIN_MIGRAR`,
 *     `CERTIFICADOS_SIN_MIGRAR`, `COSTOS_SIN_MIGRAR`) y el nombre de la
 *     migración que falta.
 *
 * `CODIGOS_SIN_MIGRAR` de abajo es la lista de los seis: sirve para reconocer
 * ese 503 y decir «falta la migración X, la aplica Víctor» en vez del «error
 * 503» que no le sirve a nadie.
 *
 * ── Una cifra `null` NO es un cero ──────────────────────────────────────────
 *
 * Varias tasas vienen `number | null`, y el `null` significa «no se pudo
 * medir» (denominador en cero), no «dio cero». Viaja hasta la vista y se pinta
 * `—` con su explicación (`@/lib/tasas`). Un 0 % sobre $0 afirma que no se
 * recaudó, y no había nada que recaudar.
 */

// ══ 0. Los 503 ══════════════════════════════════════════════════════════════

/** Los `code` con que el back dice «falta una migración». */
export const CODIGOS_SIN_MIGRAR = [
  'USURA_SIN_MIGRAR',
  'DETERIORO_SIN_MIGRAR',
  'SEDES_SIN_MIGRAR',
  'GIROS_DEVUELTOS_SIN_MIGRAR',
  'CERTIFICADOS_SIN_MIGRAR',
  'COSTOS_SIN_MIGRAR',
  'PRESUPUESTO_SIN_MIGRAR',
] as const;

export type CodigoSinMigrar = (typeof CODIGOS_SIN_MIGRAR)[number];

/** Lo común a toda lectura que puede llegar antes que su migración. */
export interface PuedeFaltarLaMigracion {
  disponible: boolean;
  motivo: string | null;
}

// ══ 1. Tablero financiero ═══════════════════════════════════════════════════

export interface SedeDelTablero {
  id: string;
  nombre: string;
  codigo: string;
}

export interface RecaudoDelTablero {
  delDiaCop: number;
  delMesCop: number;
  causadoDelMesCop: number;
  /** % del mes contra lo causado. `null` = no se midió (denominador 0). */
  tasaPct: number | null;
  /** Cómo la mide esta inmobiliaria: 'CAUSADO' | 'EMITIDO'. */
  base: string;
  rotulo: string;
  mesAnterior: {
    mes: string;
    recaudadoCop: number;
    causadoCop: number;
    tasaPct: number | null;
  };
  /** Variación del recaudo contra el mes anterior, en %. `null` si no se puede. */
  variacionPct: number | null;
}

export interface TramoDeCartera {
  nombre: string;
  desdeDias: number;
  hastaDias: number | null;
  carteraCop: number;
  cuotas: number;
}

/** 'TEMPRANA' | 'ADMINISTRATIVA' | 'PREJURIDICA' | 'JURIDICA'. */
export type EtapaDeCobranza = string;

export interface DeudorDelTablero {
  clienteId: string | null;
  nombre: string;
  documento: string | null;
  saldoCop: number;
  diasDeMora: number;
  etapa: EtapaDeCobranza;
  contratos: number;
}

export interface CarteraDelTablero {
  totalCop: number;
  /** 1-30 · 31-60 · 61-90 · 90+ */
  tramos: TramoDeCartera[];
  enSiniestroCop: number;
  /** Los 20 más grandes. */
  deudores: DeudorDelTablero[];
}

export interface PropietariosDelTablero {
  porGirarCop: number;
  /** Giros retenidos por cambio de cuenta o devueltos. */
  retenidoCop: number;
  enLotesPorAprobarCop: number;
  lotesPorAprobar: number;
  giradoDelMesCop: number;
}

export interface MargenDelTablero {
  /** Causadas del mes. */
  comisionesCop: number;
  /** Recaudados del mes. */
  interesesCop: number;
  /** Recaudados del mes. */
  gastosDeCobranzaCop: number;
  ingresosPropiosCop: number;
  /** Sólo lo que asume la inmobiliaria. */
  gmfCop: number;
  /** Sólo lo que asume la inmobiliaria. */
  pasarelaCop: number;
  costosCop: number;
  margenCop: number;
  margenPct: number | null;
}

export interface TableroFinanciero {
  mes: string;
  /** `YYYY-MM-DD` en Bogotá. */
  hoy: string;
  /** `null` = consolidado. */
  sedeId: string | null;
  sedes: SedeDelTablero[];
  recaudo: RecaudoDelTablero;
  cartera: CarteraDelTablero;
  propietarios: PropietariosDelTablero;
  margen: MargenDelTablero;
  /** Lo que la pantalla tiene que decir en voz alta (datos que faltan). */
  avisos: string[];
}

// ══ 2. Tasas de usura ═══════════════════════════════════════════════════════

export interface TasaDeUsura {
  id: string;
  mes: string;
  efectivaAnualPct: number;
  diariaPct: number;
  fuente: string | null;
  /** `true` = la cargó esta inmobiliaria; `false` = la serie de Colombia. */
  esDeLaAgencia: boolean;
}

export interface TasasDeUsura extends PuedeFaltarLaMigracion {
  tasas: TasaDeUsura[];
  /**
   * Los meses del rango que NO tienen tasa. El interés de esos meses sale SIN
   * topear, así que la pantalla lo grita.
   *
   * Opcional en el tipo porque el contrato escrito no lo nombra, aunque el
   * servicio del back sí lo devuelve (`usura.service.ts#listar`). Cuando no
   * viene, la pantalla lo deduce del rango que pidió (`mesesQueFaltan`).
   */
  mesesSinTasa?: string[];
}

export interface NuevaTasaDeUsura {
  mes: string;
  efectivaAnualPct: number;
  fuente?: string;
  /** `true` guarda en la serie de Colombia; por defecto, en la de la agencia. */
  general?: boolean;
}

// ══ 3. Deterioro de cartera ═════════════════════════════════════════════════

export interface TramoDeDeterioro {
  nombre: string;
  desdeDias: number;
  hastaDias: number | null;
  porcentaje: number;
}

export interface TramoCalculado extends TramoDeDeterioro {
  porcentajeSugerido: number;
  carteraCop: number;
  provisionCop: number;
  cuotas: number;
}

export interface DeterioroCalculado {
  tramos: TramoCalculado[];
  carteraCop: number;
  provisionCop: number;
  cuotas: number;
  enSiniestroCop: number;
  cuotasEnSiniestro: number;
  /** Cartera que no cayó en ningún tramo. Debería ser 0. */
  sinTramoCop: number;
  avisos: string[];
}

export type EstadoDeLaProvision = 'PROPUESTA' | 'APROBADA' | 'ANULADA';

export interface ProvisionDeCartera {
  id: string;
  mes: string;
  estado: EstadoDeLaProvision;
  carteraCop: number;
  provisionCop: number;
  provisionAnteriorCop: number;
  /** 🔴 Lo que se asienta. Positivo = gasto; negativo = recuperación. */
  movimientoCop: number;
  aprobadaAt: string | null;
  asientoId: string | null;
  notas: string | null;
  tramos: TramoDeDeterioro[];
}

export interface DeterioroDelMes extends PuedeFaltarLaMigracion {
  mes: string;
  calculo: DeterioroCalculado;
  provision: ProvisionDeCartera | null;
  anterior: ProvisionDeCartera | null;
  tramosSugeridos: TramoDeDeterioro[];
}

/**
 * Lo que devuelve aprobar: la provisión más si la MISMA persona la propuso y la
 * aprobó.
 *
 * 🔴 `mismoAprobador: true` **no bloquea nada** —en una inmobiliaria chica el
 * contador es una sola persona— pero la pantalla tiene que decirlo: un control
 * que existe sin que nadie sepa que no se aplicó es peor que no tenerlo. Si
 * esta provisión debe exigir un segundo par de ojos como el lote de giros es
 * una pregunta abierta para Nico (contrato del 17-09, §3).
 */
export interface ProvisionAprobada extends ProvisionDeCartera {
  mismoAprobador: boolean;
}

export interface PropuestaDeDeterioro {
  mes: string;
  tramos: TramoDeDeterioro[];
  sedeId?: string;
  notas?: string;
}

// ══ 4. Sedes (centro de costo) ══════════════════════════════════════════════

export interface Sede {
  id: string;
  nombre: string;
  codigo: string;
  ciudad: string | null;
  direccion: string | null;
  esPorDefecto: boolean;
  activa: boolean;
  inmuebles: number;
  contratos: number;
}

export interface Sedes extends PuedeFaltarLaMigracion {
  sedes: Sede[];
  sinAsignar: { inmuebles: number; contratos: number };
}

export interface NuevaSede {
  nombre: string;
  codigo: string;
  ciudad?: string;
  direccion?: string;
  esPorDefecto?: boolean;
}

export type CambiosDeLaSede = Partial<NuevaSede> & { activa?: boolean };

// ══ 5. Medios de recibo ═════════════════════════════════════════════════════

export interface MedioDeRecibo {
  medio: string;
  nombre: string;
  familia: string;
  habilitado: boolean;
}

export interface MediosDeRecibo {
  medios: MedioDeRecibo[];
  apagados: string[];
  /** `true` = nadie decidió todavía: rige el preset (efectivo y cheque apagados). */
  esElPreset: boolean;
}

// ══ 6. Costos de la plata ═══════════════════════════════════════════════════

export type QuienAsume = 'INMOBILIARIA' | 'PROPIETARIO' | 'INQUILINO';

export interface CostoDeLaPlata {
  valorCop: number;
  asume: QuienAsume;
  /** Cómo se lee la línea en pantalla. Nunca se esconde. */
  rotulo: string;
  /** La cuenta, escrita, para poder auditarla sin abrir el código. */
  detalle: string;
  /** `false` = la inmobiliaria no configuró la tarifa: no se calculó nada. */
  configurado: boolean;
}

export interface ConfigDeCostos {
  gmfPorMil: number | null;
  trasladaGmfAlPropietario: boolean;
  costoPasarelaPct: number | null;
  costoPasarelaFijoCop: number | null;
  trasladaPasarelaAlInquilino: boolean;
}

export interface CostosDeLaPlata extends PuedeFaltarLaMigracion {
  config: ConfigDeCostos;
  /** El ejemplo que arma el back con la configuración guardada. */
  ejemplo: {
    giroCop: number;
    gmf: CostoDeLaPlata;
    recaudoCop: number;
    pasarela: CostoDeLaPlata;
  };
}

export type CambiosDeCostos = Partial<{
  gmfPorMil: number | null;
  trasladaGmfAlPropietario: boolean;
  costoPasarelaPct: number | null;
  costoPasarelaFijoCop: number | null;
  trasladaPasarelaAlInquilino: boolean;
}>;

// ══ 7. Certificado anual de retenciones ═════════════════════════════════════

export type CriterioDeRetencion = 'CAUSADO' | 'PAGADO';

export interface MesDelCertificado {
  mes: string;
  baseCop: number;
  retefuenteCop: number;
  reteIvaCop: number;
  reteIcaCop: number;
}

export interface FilaDelCertificado {
  propietarioId: string;
  nombre: string;
  documento: string;
  baseCop: number;
  retefuenteCop: number;
  reteIvaCop: number;
  reteIcaCop: number;
  totalRetenidoCop: number;
  /** En cuántos períodos le retuvieron. */
  periodos: number;
  porMes: MesDelCertificado[];
}

export interface CertificadoEmitido {
  propietarioId: string;
  numero: string;
  emitidoAt: string;
}

export interface CertificadoDeRetenciones {
  anio: number;
  criterio: CriterioDeRetencion;
  filas: FilaDelCertificado[];
  totales: {
    baseCop: number;
    retefuenteCop: number;
    reteIvaCop: number;
    reteIcaCop: number;
    totalRetenidoCop: number;
    propietarios: number;
  };
  avisos: string[];
  /** Lo que YA se emitió, por propietario. */
  emitidos: CertificadoEmitido[];
}

export interface Emision {
  id: string;
  numero: string;
  emitidoAt: string;
  propietarioId?: string;
  anio?: number;
}

// ══ 8. Giros devueltos ══════════════════════════════════════════════════════

export type MotivoDeDevolucion =
  | 'CUENTA_ERRADA'
  | 'CUENTA_CANCELADA'
  | 'TITULAR_NO_COINCIDE'
  | 'RECHAZO_DEL_BANCO'
  | 'OTRO';

/**
 * Cómo se lee cada motivo, y si obliga a corregir la cuenta del propietario.
 * Calcado de `finanzas/giros-devueltos/fecha-del-egreso.ts` del back: la
 * pantalla ofrece exactamente los motivos que el back acepta.
 */
export const MOTIVOS_DE_DEVOLUCION: readonly {
  motivo: MotivoDeDevolucion;
  nombre: string;
  exigeCorregirCuenta: boolean;
}[] = [
  { motivo: 'CUENTA_ERRADA', nombre: 'La cuenta no existe o está mal digitada', exigeCorregirCuenta: true },
  { motivo: 'CUENTA_CANCELADA', nombre: 'La cuenta está cancelada o inactiva', exigeCorregirCuenta: true },
  { motivo: 'TITULAR_NO_COINCIDE', nombre: 'El titular de la cuenta no es el propietario', exigeCorregirCuenta: true },
  { motivo: 'RECHAZO_DEL_BANCO', nombre: 'El banco rechazó la transacción', exigeCorregirCuenta: false },
  { motivo: 'OTRO', nombre: 'Otro motivo', exigeCorregirCuenta: false },
];

/**
 * Un giro que el banco devolvió.
 *
 * ⚠️ El contrato nombra `GiroDevuelto[]` sin escribir sus campos, así que sólo
 * cuatro se dan por seguros —los que salen del cuerpo del POST y de la regla
 * de la fecha del egreso—: `id`, `dispersionId`, `motivo` y
 * `fechaDeLaDevolucion`. El resto va OPCIONAL y la pantalla lo pinta con `—`
 * si no viene: preferimos un guion a un `undefined` en pantalla.
 */
export interface GiroDevuelto {
  id: string;
  dispersionId: string;
  motivo: MotivoDeDevolucion;
  /** `YYYY-MM-DD`. */
  fechaDeLaDevolucion: string;
  motivoDetalle?: string | null;
  codigoDelBanco?: string | null;
  valorCop?: number | null;
  propietarioId?: string | null;
  nombreTitular?: string | null;
  /** La dispersión con la que se volvió a girar. `null` = todavía por girar. */
  dispersionNuevaId?: string | null;
  /** `YYYY-MM-DD` del giro que sí salió. */
  fechaDelNuevoGiro?: string | null;
  resueltoAt?: string | null;
  createdAt?: string;
}

export interface GirosDevueltos extends PuedeFaltarLaMigracion {
  giros: GiroDevuelto[];
}

export interface QueHacerConLaDevolucion {
  vuelveAEstarPorGirar: boolean;
  avisarAlPropietario: boolean;
  exigirCambioDeCuenta: boolean;
  dejarEnBitacora: boolean;
  /** El texto que queda en la bitácora del contrato. Se muestra tal cual. */
  bitacora: string;
}

export interface DevolucionRegistrada {
  giro: GiroDevuelto;
  queHacer: QueHacerConLaDevolucion;
}

export interface NuevaDevolucion {
  dispersionId: string;
  motivo: MotivoDeDevolucion;
  motivoDetalle?: string;
  codigoDelBanco?: string;
  /** `YYYY-MM-DD`. */
  fechaDeLaDevolucion: string;
}

export interface Regiro {
  giro: GiroDevuelto;
  egreso: {
    fecha: string | null;
    seReFecho: boolean;
    /** Por qué la fecha del egreso quedó así. Se muestra tal cual. */
    motivo: string;
  };
}

// ── 10. El cuadre DIARIO de la plata de terceros (segunda tanda, 17-09) ─────

/**
 * `saldo de la cuenta de recaudo = recaudado y no girado + anticipos del
 * inquilino + garantías de servicios + partidas por identificar`.
 *
 * 🔴 `diferenciaCop` es `null` cuando NO hay extracto cargado: eso es «no se
 * pudo cuadrar», y NO es lo mismo que cuadrar en cero. La pantalla tiene que
 * distinguirlos.
 */
export interface CuadreDeTerceros {
  fecha: string;
  saldoDeLaCuentaCop: number;
  recaudadoYNoGiradoCop: number;
  anticiposDelInquilinoCop: number;
  garantiasDeServiciosCop: number;
  partidasPorIdentificarCop: number;
  partidasPorIdentificar: number;
  /** 🚨 Entradas de plata marcadas IGNORADAS: se denuncian, no se suman. */
  entradasIgnoradasCop: number;
  entradasIgnoradas: number;
  /** Referencia para explicar una diferencia a favor. NO entra en la identidad. */
  comisionRetenidaCop: number;
  haySaldoDelBanco: boolean;
  plataDeTercerosCop: number;
  diferenciaCop: number | null;
  cuadra: boolean;
  /** 🚨 Lo único de esta pantalla que se pinta en rojo. */
  faltaPlataDeTerceros: boolean;
  explicaciones: string[];
  avisos: string[];
  detalle: {
    recaudadoCop: number;
    giradoCop: number;
    movimientosDelExtracto: number;
    garantiasVivas: number;
  };
}

// ── 11. Presupuesto por mes y rubro ────────────────────────────────────────

export type FuenteDelReal =
  | 'COMISION_CAUSADA'
  | 'RECARGOS_RECAUDADOS'
  | 'COSTOS_DE_LA_PLATA'
  | 'SIN_FUENTE';

export interface RubroDelPresupuesto {
  rubro: string;
  nombre: string;
  naturaleza: 'INGRESO' | 'COSTO';
  fuenteDelReal: FuenteDelReal;
  /** 🔴 No nulo = se presupuesta pero NO se puede comparar. Se MUESTRA. */
  motivoSinReal: string | null;
}

export interface CatalogoDeRubros {
  rubros: RubroDelPresupuesto[];
}

export interface PresupuestoCargado {
  id: string;
  mes: string;
  rubro: string;
  valorCop: number;
  sedeId: string | null;
  notas: string | null;
}

export interface PresupuestoDelMes extends PuedeFaltarLaMigracion {
  mes: string;
  filas: PresupuestoCargado[];
}

export interface FilaDelPresupuesto {
  rubro: string;
  nombre: string;
  naturaleza: 'INGRESO' | 'COSTO';
  presupuestoCop: number | null;
  /** 🔴 `null` = no hay de dónde sacar el real. NUNCA se pinta como `0`. */
  realCop: number | null;
  anioAnteriorCop: number | null;
  contraPresupuestoCop: number | null;
  variacionAnualPct: number | null;
  motivoSinReal: string | null;
}

export interface ComparacionDelPresupuesto {
  disponible: boolean;
  sedeId: string | null;
  mes: string;
  mesDelAnioAnterior: string;
  filas: FilaDelPresupuesto[];
  totales: {
    presupuestoCop: number;
    realCop: number;
    anioAnteriorCop: number;
    rubrosSinReal: number;
  };
  avisos: string[];
}

export interface NuevoPresupuesto {
  mes: string;
  rubro: string;
  valorCop: number;
  sedeId?: string;
  notas?: string;
}
