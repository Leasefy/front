/**
 * Los tipos de `/inmobiliaria/nomina`, espejo del back.
 *
 * ── Tres formas de «no se puede», y la pantalla las distingue ──────────────
 *
 *   · **402 `NOMINA_NO_HABILITADA`** — la inmobiliaria no compró el módulo. No es
 *     un error: es un producto que se contrata. La pantalla lo dice así.
 *   · **503 `NOMINA_SIN_MIGRAR`** — faltan migraciones. Las aplica Víctor.
 *   · **422 `NOMINA_PARAMETROS_INCOMPLETOS`** — falta el salario mínimo, el
 *     auxilio de transporte o la UVT del año. Los carga la inmobiliaria.
 *
 * Confundirlas manda a la persona equivocada a resolver el problema equivocado.
 *
 * ── Y una forma de «todavía no» ────────────────────────────────────────────
 *
 * Las LECTURAS devuelven `disponible: false` con `motivo` en vez de tirar 503,
 * igual que finanzas: así la pantalla muestra lo que sí se puede y explica el
 * resto, en lugar de caerse entera.
 */

export const CODIGOS_DE_NOMINA = [
  'NOMINA_NO_HABILITADA',
  'NOMINA_SIN_MIGRAR',
  'NOMINA_SIN_PARAMETROS',
  'NOMINA_PARAMETROS_INCOMPLETOS',
  'NOMINA_SIN_MAPEO_CONTABLE',
  'NOMINA_CUENTAS_QUE_NO_EXISTEN',
  'NOMINA_ASIENTO_DESCUADRADO',
  'NOMINA_SIN_PERSONAS',
  'PERIODO_NO_ES_BORRADOR',
  'PERIODO_NO_APROBADO',
  'PERIODO_YA_PAGADO',
  'NOVEDAD_YA_LIQUIDADA',
  'SIN_ACCESO_A_NOMINA',
  'DOCUMENTO_NO_ACEPTADO',
] as const;

export type CodigoDeNomina = (typeof CODIGOS_DE_NOMINA)[number];

export interface Lectura {
  disponible: boolean;
  motivo: string | null;
}

// ── Parámetros del año ──────────────────────────────────────────────────────

export interface FactoresDeNomina {
  recargoNocturnoBps: number;
  recargoDominicalBps: number;
  extraDiurnaBps: number;
  extraNocturnaBps: number;
  extraDominicalDiurnaBps: number;
  extraDominicalNocturnaBps: number;
  horasMes: number;
  saludEmpleadoBps: number;
  saludEmpleadorBps: number;
  pensionEmpleadoBps: number;
  pensionEmpleadorBps: number;
  cajaCompensacionBps: number;
  senaBps: number;
  icbfBps: number;
  exoneracion1141: boolean;
  ibcTopeSmlmv: number;
  primaBps: number;
  cesantiasBps: number;
  interesesCesantiasBps: number;
  vacacionesBps: number;
}

export interface ParametrosGuardados extends FactoresDeNomina {
  id: string;
  anio: number;
  /** `null` = todavía no se cargó. NUNCA cero: un cero afirmaría algo falso. */
  salarioMinimoCop: number | null;
  auxilioTransporteCop: number | null;
  uvtCop: number | null;
  /** 🔴 Quién CARGÓ las cifras del año y cuándo. Siempre presentes. */
  cargadoPorUserId: string;
  cargadoAt: string;
  /** Quién las REVISÓ. Es otra cosa que cargarlas. */
  confirmadoPorUserId: string | null;
  confirmadoAt: string | null;
  notas: string | null;
}

/** Quién hizo algo, con nombre. `nombre` en `null` = el usuario ya no está. */
export interface QuienFue {
  id: string;
  nombre: string | null;
}

export interface PropuestaDeParametros extends FactoresDeNomina {
  anio: number;
  salarioMinimoCop: number | null;
  auxilioTransporteCop: number | null;
  uvtCop: number | null;
  fuente: string;
  motivoSiFalta: string | null;
  referencia: {
    anio: number;
    salarioMinimoCop: number | null;
    auxilioTransporteCop: number | null;
    uvtCop: number | null;
    fuente: string;
  } | null;
}

export interface ParametrosDelAnio extends Lectura {
  anio: number;
  guardado: ParametrosGuardados | null;
  /**
   * 🔴 Viaja SIEMPRE, también con parámetros guardados — y sus tres cifras del
   * Estado vienen SIEMPRE en `null`. No es para prellenar: es para que la
   * pantalla pueda mostrar la REFERENCIA del año conocido al lado de cada campo,
   * también cuando se está corrigiendo algo ya cargado.
   */
  propuesta: PropuestaDeParametros | null;
  cargadoPor: QuienFue | null;
  confirmadoPor: QuienFue | null;
  avisos: Record<string, string>;
  completos: boolean;
  /** En palabras de quien lo tiene que buscar: «el salario mínimo del año». */
  queFalta: string[];
}

// ── Personas ────────────────────────────────────────────────────────────────

export type TipoDePersona =
  | 'EMPLEADO'
  | 'ASESOR'
  | 'PRESTACION_SERVICIOS'
  | 'APRENDIZ';

export interface PersonaDeNomina {
  id: string;
  tipo: TipoDePersona;
  nombre: string;
  documentoTipo: string | null;
  documento: string | null;
  correo: string | null;
  telefono: string | null;
  cargo: string | null;
  sedeId: string | null;
  fechaIngreso: string;
  fechaRetiro: string | null;
  tipoContrato: string;
  causalRetiro: string | null;
  salarioCop: number | null;
  salarioIntegral: boolean;
  periodicidad: 'QUINCENAL' | 'MENSUAL';
  auxilioTransporte: boolean;
  claseRiesgoArl: string | null;
  eps: string | null;
  fondoPension: string | null;
  fondoCesantias: string | null;
  caja: string | null;
  banco: string | null;
  tipoCuenta: string | null;
  numeroDeCuenta: string | null;
  procedimientoRetencion: number | null;
  porcentajeFijoBps: number | null;
  tieneDependientes: boolean | null;
  interesesViviendaMesCop: number | null;
  medicinaPrepagadaMesCop: number | null;
  aportesVoluntariosMesCop: number | null;
  perfilTributario: string | null;
  responsableIva: boolean | null;
  tarifaIcaPorMil: number | null;
  etapaAprendizaje: string | null;
  activo: boolean;
  notas: string | null;
}

export interface CuotaDeAprendices {
  obligada: boolean;
  minimos: number;
  actuales: number;
  faltan: number;
  aviso: string | null;
  fuente: string;
}

export interface Personas extends Lectura {
  personas: PersonaDeNomina[];
  total: number;
  cuotaDeAprendices: CuotaDeAprendices | null;
}

export interface CatalogoDePersonas {
  tipos: { tipo: TipoDePersona; nombre: string; descripcion: string }[];
  tiposDeContrato: readonly string[];
  periodicidades: readonly string[];
  clasesDeRiesgoArl: readonly string[];
  claseDeRiesgoSugerida: string;
  fuenteArl: string;
  modeloDeAprendizajeSugerido: string;
}

// ── Conceptos ───────────────────────────────────────────────────────────────

export type ClaseDeConcepto =
  | 'DEVENGADO'
  | 'DEDUCCION'
  | 'APORTE_EMPLEADOR'
  | 'PROVISION';

export interface ConceptoDeNomina {
  id: string;
  codigo: string;
  nombre: string;
  clase: ClaseDeConcepto;
  naturaleza: string;
  constitutivoSalario: boolean;
  basePrestacional: boolean;
  cuentaPuc: string | null;
  cuentaPucContra: string | null;
  esDeSistema: boolean;
  activo: boolean;
  notas: string | null;
}

export interface Conceptos extends Lectura {
  conceptos: ConceptoDeNomina[];
  sinCuenta: {
    codigo: string;
    nombre: string;
    clase: string;
    falta: string;
  }[];
  avisoDeCuentas: string;
  sembrados: number;
  deSistema: number;
}

// ── Novedades ───────────────────────────────────────────────────────────────

export interface NovedadDeNomina {
  id: string;
  personaId: string;
  tipo: string;
  desde: string;
  hasta: string | null;
  cantidadCentesimas: number | null;
  valorCop: number | null;
  porcentajeBps: number | null;
  liquidacionId: string | null;
  soporteRuta: string | null;
  soporteNombre: string | null;
  notas: string | null;
  persona?: { id: string; nombre: string; documento: string | null; tipo: string };
  concepto?: { codigo: string; nombre: string } | null;
}

export interface Novedades extends Lectura {
  novedades: NovedadDeNomina[];
}

export interface CatalogoDeNovedades {
  tipos: { tipo: string; mide: 'HORAS' | 'DIAS' | 'VALOR'; exigeSoporte: boolean }[];
  horas: {
    tipo: string;
    nombre: string;
    codigo: string;
    incluyeLaHoraOrdinaria: boolean;
    fuente: string;
  }[];
  ausencias: {
    tipo: string;
    nombre: string;
    codigo: string;
    porcentajeBps: number | null;
    pagador: string;
    fuente: string;
  }[];
}

// ── Períodos y liquidaciones ───────────────────────────────────────────────

export type EstadoDelPeriodo = 'BORRADOR' | 'APROBADO' | 'PAGADO' | 'ANULADO';

export interface PeriodoDeNomina {
  id: string;
  mes: string;
  quincena: number | null;
  desde: string;
  hasta: string;
  estado: EstadoDelPeriodo;
  totalDevengadoCop: number;
  totalDeduccionesCop: number;
  totalNetoCop: number;
  totalAportesCop: number;
  personas: number;
  aprobadoAt: string | null;
  pagadoAt: string | null;
  asientoId: string | null;
  loteDeEgresosId: string | null;
  motivoAnulacion: string | null;
}

export interface LineaDeLiquidacion {
  id: string;
  orden: number;
  codigo: string;
  nombre: string;
  clase: ClaseDeConcepto;
  cantidadCentesimas: number | null;
  valorCop: number;
  constitutivoSalario: boolean;
  cuentaPuc: string | null;
  detalle: string | null;
  requiereValidacionContador: boolean;
  motivoValidacion: string | null;
}

export interface LiquidacionDeNomina {
  id: string;
  periodoId: string;
  personaId: string;
  nombre: string;
  documento: string | null;
  cargo: string | null;
  tipo: TipoDePersona;
  salarioCop: number | null;
  sedeId: string | null;
  diasLiquidados: number;
  devengadoCop: number;
  deduccionesCop: number;
  netoCop: number;
  aportesEmpleadorCop: number;
  provisionesCop: number;
  ibcCop: number;
  baseRetencionCop: number;
  retencionCop: number;
  esDefinitiva: boolean;
  fechaRetiro: string | null;
  causalRetiro: string | null;
  requiereValidacionContador: boolean;
  avisos: string[] | null;
  /**
   * 🔴 La CONSTANCIA del desprendible enviado. Tres campos y no un booleano:
   * cuando alguien reclame que no le llegó, la pregunta es a QUÉ correo salió.
   */
  desprendibleEnviadoA: string | null;
  desprendibleEnviadoAt: string | null;
  desprendibleError: string | null;
  desprendibleIntentos: number;
  lineas: LineaDeLiquidacion[];
}

/** Qué pasó con un envío. `SIN_CORREO` no es un error del sistema: falta un dato. */
export interface EnvioDelDesprendible {
  estado: 'ENVIADO' | 'SIN_CORREO' | 'FALLO';
  enviadoA: string | null;
  motivo: string | null;
}

/** El resumen del envío al aprobar el período. */
export interface EnvioDeDesprendibles {
  enviados: number;
  fallaron: number;
  sinCorreo: number;
  avisos: string[];
}

export interface Periodos extends Lectura {
  periodos: PeriodoDeNomina[];
}

export interface PeriodoConLiquidaciones extends PeriodoDeNomina {
  liquidaciones: LiquidacionDeNomina[];
  /** Sólo viene en la respuesta de APROBAR: qué pasó con los desprendibles. */
  envioDeDesprendibles?: EnvioDeDesprendibles;
}

export interface Desprendible extends LiquidacionDeNomina {
  periodo: PeriodoDeNomina;
  documentosDeNomina: DocumentoDeNomina[];
}

export interface BorradorArmado {
  periodoId: string;
  personas: number;
  devengado: number;
  deducciones: number;
  neto: number;
  aportes: number;
  avisos: string[];
}

// ── Provisiones ─────────────────────────────────────────────────────────────

export type TipoDePrestacion =
  | 'PRIMA'
  | 'CESANTIAS'
  | 'INTERESES_CESANTIAS'
  | 'VACACIONES';

export interface Provisiones extends Lectura {
  porTipo: {
    tipo: TipoDePrestacion;
    provisionadoCop: number;
    cruzadoCop: number;
    vivoCop: number;
  }[];
  porPersona: {
    personaId: string;
    nombre: string;
    documento: string | null;
    porTipo: Record<string, number>;
    vivoCop: number;
  }[];
  totalVivoCop: number;
}

export interface CruceDeProvision {
  valorPagadoCop: number;
  provisionadoCop: number;
  /** Positiva = se provisionó de más. Negativa = faltó. */
  diferenciaCop: number;
  explicacion: string;
}

// ── Nómina electrónica ──────────────────────────────────────────────────────

export type EstadoDelDocumento =
  | 'GENERADO'
  | 'EN_COLA'
  | 'TRANSMITIDO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'NO_CONFIGURADO';

export interface DocumentoDeNomina {
  id: string;
  liquidacionId: string | null;
  tipo: 'NOMINA' | 'AJUSTE_REEMPLAZAR' | 'AJUSTE_ELIMINAR';
  periodo: string;
  prefijo: string;
  numero: number;
  estado: EstadoDelDocumento;
  cune: string | null;
  transmitidoAt: string | null;
  validadoAt: string | null;
  intentos: number;
  ultimoError: string | null;
  proveedor: string | null;
  totalDevengadoCop: number;
  totalDeduccionesCop: number;
  totalNetoCop: number;
}

export interface EstadoDelProveedor {
  nombre: string;
  configurado: boolean;
  esDePrueba: boolean;
  aviso: string | null;
  pila: string;
}

export interface NominaElectronica extends Lectura {
  documentos: DocumentoDeNomina[];
  proveedor: EstadoDelProveedor;
  cola: number;
}

// ── El estado del módulo ────────────────────────────────────────────────────

export interface EstadoDeNomina {
  anio: number;
  parametros: {
    disponible: boolean;
    motivo: string | null;
    completos: boolean;
    queFalta: string[];
    confirmados: boolean;
  };
  personas: {
    disponible: boolean;
    total: number;
    cuotaDeAprendices: CuotaDeAprendices | null;
  };
  conceptos: {
    disponible: boolean;
    sembrados: number;
    deSistema: number;
    sinCuenta: { codigo: string; nombre: string; falta: string }[];
  };
  nominaElectronica: EstadoDelProveedor;
  avisos: {
    pila: string;
    recobroEps: string;
    recorteDeDeducciones: string;
  };
}

export interface ResumenDelMes extends Lectura {
  mes: string;
  personas?: number;
  devengadoCop: number;
  aportesCop: number;
  provisionesCop: number;
  netoCop?: number;
  retencionCop?: number;
  /** 🔴 El COSTO de la nómina no es el neto: devengado + aportes + provisiones. */
  costoTotalCop: number;
  porSede: {
    sedeId: string | null;
    devengadoCop: number;
    aportesCop: number;
    provisionesCop: number;
  }[];
}

// ── La liquidación definitiva ───────────────────────────────────────────────

export interface Definitiva {
  persona: {
    id: string;
    nombre: string;
    documento: string | null;
    cargo: string | null;
    fechaIngreso: string;
    tipoContrato: string;
    salarioCop: number | null;
    salarioIntegral: boolean;
  };
  base: {
    salarioCop: number;
    auxilioCop: number;
    promedioVariableCop: number;
    basePrestacionalCop: number;
    baseDeVacacionesCop: number;
    mesesPromediados: number;
  };
  lineas: {
    codigo: string;
    nombre: string;
    valorCop: number;
    dias: number;
    detalle: string;
    requiereValidacionContador: boolean;
    motivoValidacion: string | null;
  }[];
  totalCop: number;
  diasTrabajados: number;
  aniosTrabajados: number;
  avisos: string[];
  requiereValidacionContador: boolean;
  provisionDisponible: {
    tipo: TipoDePrestacion;
    provisionadoCop: number;
    cruzadoCop: number;
    disponibleCop: number;
  }[];
}
