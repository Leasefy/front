/**
 * Deducciones del propietario — lo que manda el back
 * (`back-erp/src/inmobiliaria/deducciones/`).
 *
 * La liquidación del propietario es «lo que el contrato cobra menos sus
 * deducciones» (Nico y Juan Camilo, 2026-09-16). Toda la cuenta la hace el back
 * con UNA regla (`neto-con-deducciones.ts`): acá no se suma ni se resta nada,
 * se pinta lo que llega.
 */

/**
 * De dónde sale la deducción. `COBRO_AL_ARRENDAR` (17-09) es lo que la
 * inmobiliaria le cobra al PROPIETARIO por arrendar el inmueble —colocación,
 * una póliza opcional— y se descuenta en su primera liquidación.
 */
export type OrigenDeDeduccion =
  | 'REPARACION'
  | 'MANUAL'
  | 'SALDO_ANTERIOR'
  | 'COBRO_AL_ARRENDAR';

/** En qué va. `PROYECTADA` = calculada para una liquidación que todavía no se generó. */
export type EstadoDeLaDeduccion =
  | 'PENDIENTE'
  | 'EN_LIQUIDACION'
  | 'APLICADA'
  | 'ANULADA'
  | 'PROYECTADA';

export interface DeduccionDeLaLiquidacion {
  id: string;
  propietarioId: string;
  origen: OrigenDeDeduccion;
  motivo: string;
  /** Lo que se le descuenta a ESTE dueño. */
  valorCop: number;
  /** La primera liquidación en la que puede entrar, `YYYY-MM`. */
  mesDesde: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** Las partes de una misma deducción repartida entre copropietarios. */
  grupoId: string;
  /** El valor antes de repartir. */
  valorTotalCop: number;
  /** 10000 = el inmueble entero. */
  participacionBps: number;
  consignacionId: string | null;
  solicitudMantenimientoId: string | null;
  tieneSoporte: boolean;
  soporteNombre: string | null;
  estado: EstadoDeLaDeduccion;
}

/** Un renglón de la liquidación, con el signo en el número. */
export interface RenglonDeLaDeduccion {
  concepto: string;
  valorCop: number;
  motivo: string;
}

/**
 * El bloque de deducciones de UNA liquidación (vista previa, dispersión o
 * extracto). Opcional en quien lo trae: un back anterior al 2026-09-16 no lo
 * manda, y entonces la pantalla se queda con el neto de siempre.
 */
export interface DeduccionesDeLaLiquidacion {
  /** Lo que el contrato cobra, antes de las deducciones. */
  netoDelMesCop: number;
  deducciones: DeduccionDeLaLiquidacion[];
  deduccionesCop: number;
  /** De las deducciones, lo que viene del mes anterior. */
  saldoAnteriorCop: number;
  /** Neto del mes menos deducciones. Puede ser negativo. */
  netoCop: number;
  /** 🔴 Lo que se gira: entero o nada. */
  aGirarCop: number;
  /** Lo que queda en contra y pasa a la siguiente liquidación. */
  saldoEnContraCop: number;
  /** Lo que las deducciones cubrieron de este mes. */
  compensadoCop: number;
  renglones: RenglonDeLaDeduccion[];
}

/** Una fila del listado de la ficha. */
export interface DeduccionDelListado extends DeduccionDeLaLiquidacion {
  /** El mes de la liquidación donde está reservada o aplicada. */
  mesDeLaLiquidacion: string | null;
  loteId: string | null;
  aplicadaAt: string | null;
  anuladaAt: string | null;
  motivoDeAnulacion: string | null;
  createdAt: string;
}

export interface ListadoDeDeducciones {
  /** `false` = la base todavía no tiene la tabla. `motivo` dice qué falta. */
  disponible: boolean;
  motivo: string | null;
  deducciones: DeduccionDelListado[];
  totales: {
    pendienteCop: number;
    enLiquidacionCop: number;
    saldoEnContraCop: number;
  };
}

export interface NuevoDescuento {
  motivo: string;
  valorCop: number;
  /** El inmueble del descuento. Con varios dueños, el back lo reparte. */
  consignacionId?: string | null;
  soporte: File;
}

/** A cargo de quién queda una reparación al aprobar su cotización. */
export type ACargoDe = 'PROPIETARIO' | 'INQUILINO';

/**
 * El cargo de una sola vez que una reparación a cargo del inquilino dejó en su
 * cuota del mes (Nico y Juan Camilo, 2026-09-16). La cartera, el estado de
 * cuenta, el recibo de caja y la prefactura lo leen como un renglón más.
 */
export interface CargoAlInquilino {
  id: string;
  contractId: string;
  nombre: string;
  valorCop: number;
  /** El mes de la aprobación, `YYYY-MM`. */
  mesDesde: string;
  /** El mes de la cuota donde entró, `YYYY-MM`. */
  mes: string;
  cuotaId: string | null;
}

/** Lo que devuelve aprobar una cotización con `aCargoDe`. */
export interface CargoDeLaReparacion {
  aCargoDe: ACargoDe;
  deduccionIds: string[];
  /**
   * El cargo que entró al estado de cuenta del inquilino. Ausente con un back
   * anterior; `null` a cargo del propietario o sin la migración (entonces
   * `avisos` dice que se cobra aparte).
   */
  cargoAlInquilino?: CargoAlInquilino | null;
  /** Lo que la pantalla tiene que decir, en palabras. */
  avisos: string[];
  /**
   * 🔴 D12 (17-09-2026): a cargo del propietario, la solicitud de aprobación
   * que se le hizo (PENDIENTE, sin descuento) o la emergencia registrada (con
   * descuento y aviso). `null` a cargo del inquilino; ausente con un back viejo.
   */
  aprobacionDelPropietario?: AprobacionDeReparacion | null;
}

/**
 * 🔴 D12 (Nico y Juan Camilo, 17-09-2026): «las reparaciones a cargo del
 * propietario SIEMPRE las aprueba el propietario, con excepción de
 * EMERGENCIA». Espejo de `AprobacionDeReparacionDto` del back.
 */
export type EstadoDeLaAprobacion =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'EMERGENCIA'
  | 'ANULADA';

export interface AprobacionDeReparacion {
  id: string;
  solicitudId: string;
  quoteId: string;
  consignacionId: string;
  propietarioId: string;
  valorCop: number;
  motivo: string;
  estado: EstadoDeLaAprobacion;
  emergencia: boolean;
  motivoDeEmergencia: string | null;
  soporteNombre: string | null;
  /** El aviso GENERADO al propietario (sólo en una emergencia). */
  aviso: { asunto: string; cuerpo: string; generadoAt: string } | null;
  pedidaAt: string;
  decididaAt: string | null;
  motivoDeRechazo: string | null;
  anuladaAt: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que el propietario ve en su portal. */
export interface AprobacionEnElPortal extends AprobacionDeReparacion {
  inmobiliaria: string;
  inmueble: string;
  reparacion: { titulo: string; descripcion: string };
  cotizacion: { proveedor: string; descripcion: string | null; diasEstimados: number | null } | null;
}

/** La bandeja de la inmobiliaria. */
export interface AprobacionEnLaBandeja extends AprobacionDeReparacion {
  inmueble: string;
  propietario: string;
  reparacion: string;
}

/** La excepción de emergencia, tal como la manda el diálogo. */
export interface EmergenciaDeLaReparacion {
  motivo: string;
  soporte: File;
}

/**
 * Lo que dejó propuesto el agente de mantenimiento. 🔴 El agente PROPONE, una
 * persona APRUEBA: la propuesta no aprueba ni descuenta ni cobra nada.
 */
export interface PropuestaDelAgente {
  quoteId: string | null;
  aCargoDeSugerido: ACargoDe | null;
  nota: string | null;
  propuestaPor: 'AGENTE';
  propuestaAt: string;
  /** Cuándo una persona aprobó una cotización de la solicitud. `null` = esperando. */
  atendidaAt: string | null;
}

/** Un renglón de lo que el propietario le debe a la inmobiliaria. */
export interface RenglonDeLaDeuda {
  id: string;
  grupoId: string;
  origen: OrigenDeDeduccion;
  motivo: string;
  valorCop: number;
  /** `YYYY-MM-DD`. */
  fecha: string;
  mesDesde: string;
  tieneSoporte: boolean;
}

export interface CuentaDeCobroResumida {
  id: string;
  numero: number;
  emitidaAt: string;
}

/**
 * Lo que el propietario le DEBE a la inmobiliaria: deducciones o saldo en
 * contra que ya no tienen ninguna liquidación de la cual descontarse (se le
 * terminó el contrato). Se le cobra con una cuenta de cobro.
 */
export interface DeudaDelPropietario {
  /** `false` = la base no tiene la tabla de deducciones. */
  disponible: boolean;
  motivo: string | null;
  propietarioId: string;
  debeCop: number;
  desde: string | null;
  ultimoMesConLiquidacion: string | null;
  renglones: RenglonDeLaDeuda[];
  sinCuentaDeCobroCop: number;
  cuentasDeCobro: CuentaDeCobroResumida[];
  /** `false` = generar la cuenta de cobro responde 503 en esta base. */
  cuentaDeCobroDisponible: boolean;
}

export interface PropietarioQueDebe {
  propietarioId: string;
  nombre: string;
  debeCop: number;
  desde: string | null;
  sinCuentaDeCobroCop: number;
  ultimaCuentaDeCobro: CuentaDeCobroResumida | null;
}

export interface DeudasDePropietarios {
  disponible: boolean;
  motivo: string | null;
  totalCop: number;
  propietarios: PropietarioQueDebe[];
}

/** El documento de la cuenta de cobro al propietario. */
export interface CuentaDeCobroDelPropietario {
  id: string;
  numero: number;
  emitidaAt: string;
  propietario: {
    id: string;
    nombre: string;
    tipoDeDocumento: string;
    documento: string;
    correo: string | null;
    direccion: string | null;
    ciudad: string | null;
  };
  agencia: {
    nombre: string;
    nit: string | null;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
    correo: string | null;
  } | null;
  renglones: (RenglonDeLaDeuda & { estado: 'VIGENTE' | 'DESCONTADA' | 'ANULADA' })[];
  /** Sólo los renglones VIGENTES. */
  totalCop: number;
  porQue: string;
}
