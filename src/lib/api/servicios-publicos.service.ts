/**
 * Servicios públicos (Portofino, 22-10-2026) — el contrato con el back
 * (`back/src/inmobiliaria/servicios-publicos/`). Operación → Servicios
 * públicos, el registro de la factura en el contrato y el portal del inquilino.
 */
import { apiClient } from '@/lib/api/client';
import { enviarFormulario } from '@/lib/api/ciclo-de-vida.service';

export type Servicio = 'ENERGIA' | 'AGUA' | 'GAS' | 'ASEO' | 'INTERNET' | 'OTRO';
export type TipoDeFactura = 'MENSUAL' | 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type QuienPago = 'INQUILINO' | 'PROPIETARIO';
export type EstadoDeLaFactura = 'POR_REVISAR' | 'AL_DIA' | 'PENDIENTE' | 'LIQUIDADA' | 'RECHAZADA';
/** `SIN_INICIAR` (29-10-2026): el contrato no había empezado en ese mes: no se le pide factura. */
export type EstadoDelMes = 'AL_DIA' | 'POR_REVISAR' | 'RECHAZADA' | 'SIN_FACTURA' | 'SIN_INICIAR';
/** Cómo cae el CORTE de la factura respecto del inicio del contrato. */
export type ComoCaeEnElContrato = 'ANTES_DEL_INICIO' | 'CRUZA_EL_INICIO' | 'DENTRO';
export type TipoDeConceptoDelPropietario = 'ACUERDO_DE_PAGO' | 'REVISION_PERIODICA' | 'FINANCIACION' | 'INTERESES_DE_MORA' | 'OTRO';

/** Lo que trae la factura y no es del inquilino sino del propietario (Portofino, 29-10-2026). */
export interface ConceptoDelPropietario {
  tipo: TipoDeConceptoDelPropietario;
  concepto: string;
  valorCop: number;
}

export const SERVICIOS: ReadonlyArray<{ valor: Servicio; rotulo: string }> = [
  { valor: 'ENERGIA', rotulo: 'Energía' },
  { valor: 'AGUA', rotulo: 'Acueducto y alcantarillado' },
  { valor: 'GAS', rotulo: 'Gas' },
  { valor: 'ASEO', rotulo: 'Aseo' },
  { valor: 'INTERNET', rotulo: 'Internet' },
  { valor: 'OTRO', rotulo: 'Otro servicio' },
];

export interface FacturaDeServicio {
  id: string;
  contractId: string;
  servicio: Servicio;
  /** Todos los que trae la factura (un back anterior no lo manda). */
  servicios?: Servicio[];
  nombreDelServicio: string;
  empresa: string | null;
  /** El CORTE (período de consumo); lo mismo que `corte.desde`/`corte.hasta`. */
  periodoDesde: string;
  periodoHasta: string;
  /**
   * Portofino 29-10-2026: «esas facturas llegan con un corte atrasado». Un back anterior no manda nada de esto: la
   * pantalla lo deduce de `periodoDesde`/`periodoHasta` (`lib/servicios-publicos/corte-de-la-factura.ts`).
   */
  corte?: { desde: string; hasta: string; dias: number };
  /** El mes al que cuenta en el tablero: el del último día del corte (`AAAA-MM`). */
  mesDelCorte?: string;
  /** El mes en que se facturó (`AAAA-MM`). */
  mesFacturado?: string;
  /** `ESTIMADO` = la factura no lo trae: es el siguiente al corte. */
  mesFacturadoSegun?: 'FACTURA' | 'ESTIMADO';
  /** `null` = no se conoce el inicio del contrato aquí. */
  comoCaeEnElContrato?: ComoCaeEnElContrato | null;
  conceptosDelPropietario?: ConceptoDelPropietario[];
  /** Lo que Servi leyó y propuso (`null` si no la ha revisado). La forma la lee `revisionDeServiDe`. */
  revisionDeServi?: Record<string, unknown> | null;
  valorCop: number;
  tipo: TipoDeFactura;
  pagadaPor: QuienPago | null;
  estado: EstadoDeLaFactura;
  tieneSoporte: boolean;
  soporteNombre: string | null;
  subidaPor: 'INQUILINO' | 'INMOBILIARIA';
  liquidacion: Record<string, unknown> | null;
  nota: string | null;
  motivoDeLaRevision: string | null;
  creadaAt: string;
}

export interface FilaDelTablero {
  contractId: string;
  contrato: string | null;
  inquilino: string | null;
  documentoDelInquilino: string | null;
  inmueble: string | null;
  estadoDelMes: EstadoDelMes;
  porRevisar: number;
  ajustesPorRevisar: number;
  entradaRegistrada: boolean;
  /** 29-10-2026: el inicio del contrato (`AAAA-MM-DD`); un back anterior no lo manda. */
  inicio?: string | null;
  ultimaFactura: FacturaDeServicio | null;
  /** 22-10-2026: lo que Mori recordó de la factura de este mes (un back viejo no lo manda). */
  recordatorios?: RecordatorioDeMori[];
  /** Nico 29-10-2026: la cuenta de EPM (u otra empresa) del inmueble, si vino en la migración. Un back viejo no la manda. */
  cuentas?: CuentaDeServiciosDelInmueble[];
}

export interface CuentaDeServiciosDelInmueble {
  empresa: string;
  numero: string;
  /** El código del inmueble en el sistema anterior (el «ID» de Nuby). */
  codigoDelInmueble: string | null;
  vigenciaMeses: number | null;
  /** `false` = lleva ese tiempo sin el servicio («SIN COBERTURA»). */
  conCobertura: boolean | null;
  /** «12 meses sin servicio de EPM», o `null`. */
  cobertura: string | null;
}

/** Mori recuerda la factura (Portofino, Nico 22-10-2026). */
export interface ConfiguracionDelRecordatorio {
  disponible: boolean;
  /** `null` = apagado. */
  dia: number | null;
  diaPorDefecto: number;
  diaMaximo: number;
}

export type EstadoDelRecordatorio = 'EN_CURSO' | 'ENVIADO' | 'EN_LA_GESTION_DE_COBRO' | 'NO_SE_ENVIA';

export interface RecordatorioDeMori {
  intento: 1 | 2;
  estado: EstadoDelRecordatorio;
  /** `AAAA-MM-DD`. */
  dia: string;
  detalle: string | null;
}

export interface TableroDeServicios {
  disponible: boolean;
  mes: string;
  resumen: {
    alDia: number;
    porRevisar: number;
    rechazadas: number;
    sinFactura: number;
    /** 29-10-2026: contratos que no habían empezado en el mes (un back anterior no lo manda). */
    sinIniciar?: number;
    ajustesPorRevisar: number;
  };
  contratos: FilaDelTablero[];
  /** 22-10-2026: si Mori recuerda la factura (un back viejo no lo manda). */
  recordatorio?: ConfiguracionDelRecordatorio | null;
}

export interface ServiciosDelContrato {
  disponible: boolean;
  contractId: string;
  contrato: string | null;
  inquilino: string | null;
  entrega: string | null;
  devolucion: string | null;
  entradaRegistrada: boolean;
  garantia: { saldoCop: number; diferenciaPorCobrarCop?: number; estado?: string } | null;
  facturas: FacturaDeServicio[];
}

export interface LiquidacionDeEntrada {
  entrega: string;
  diasDelPropietario: number;
  diasDelInquilino: number;
  partePropietarioCop: number;
  parteInquilinoCop: number;
  cobrarA: QuienPago;
  abonarA: QuienPago;
  valorAMoverCop: number;
  frase: string;
}

export interface FacturaQueSeRegistra {
  tipo: TipoDeFactura;
  servicio: Servicio;
  /** Varios en una factura (el primero es `servicio`); un back anterior sólo lee `servicio`. */
  servicios?: Servicio[];
  empresa?: string;
  /** El CORTE: primer y último día del consumo que cobra la factura. */
  periodoDesde: string;
  periodoHasta: string;
  /** El mes en que se facturó (`AAAA-MM`), si se sabe. Sin él, el back estima el siguiente al corte. */
  mesFacturado?: string;
  valorCop: number;
  pagadaPor?: QuienPago;
  entrega?: string;
  devolucion?: string;
  pagarConLaGarantia?: boolean;
  nota?: string;
  soporte?: File | null;
}

export interface ServiciosDelPortal {
  disponible: boolean;
  contratos: Array<{
    contractId: string;
    contrato: string | null;
    inmueble: string | null;
    vigente: boolean;
    facturas: FacturaDeServicio[];
  }>;
}

// ── Las liquidaciones de Portofino (29-10-2026): entrada (anterior vs nuevo) y entrega del inmueble ──────────────────

/** La hoja «Liquidación servicios públicos» de Portofino: una factura partida por días entre el anterior y el nuevo. */
export interface LiquidacionDeEntradaEnHoja {
  /** `AAAA-MM`: el mes en que se facturó (o el siguiente al corte). */
  mesFacturado: string;
  corteDesde: string;
  corteHasta: string;
  diasDelCorte: number;
  /** El día en que el inquilino nuevo recibió el inmueble. */
  fechaEntrega: string;
  /** El propietario o el inquilino anterior: hasta el día antes de la entrega. */
  anterior: { desde: string; hasta: string; dias: number; valorCop: number };
  /** El inquilino nuevo: desde el día de la entrega. */
  nuevo: { desde: string; hasta: string; dias: number; valorCop: number };
  totalCop: number;
  frase: string;
}

export interface PedidoDeLaEntrada {
  periodoDesde: string;
  periodoHasta: string;
  valorCop: number;
  entrega: string;
}

/** De dónde salió la fecha de entrega que usó el back. */
export type OrigenDeLaFechaDeEntrega = 'PEDIDA' | 'ACTA_DE_DEVOLUCION' | 'TERMINACION' | 'FIN_DEL_CONTRATO';

export interface TarifaDelGrupo {
  /** Pesos por día; `null` = sin historial: no hay con qué estimar. */
  tarifaDiariaCop: number | null;
  desviacionCop: number | null;
  facturasUsadas: number;
  cortes: Array<{ desde: string; hasta: string; dias: number; valorCop: number; porDiaCop: number }>;
}

export interface GrupoDeLaSalida {
  grupo: string;
  servicios: Servicio[];
  nombreDelServicio: string;
  ultimoCortePagado: string | null;
  diaDeCorte: number | null;
  tarifa: TarifaDelGrupo;
}

/** Una fila de la liquidación de salida: un corte pendiente hasta la entrega (real o estimado). */
export interface FilaDeLaSalida {
  grupo: string;
  servicios: Servicio[];
  nombreDelServicio: string;
  /** `AAAA-MM`: el mes en que la empresa lo factura. */
  mesFacturado: string;
  corteDesde: string;
  corteHasta: string;
  dias: number;
  tarifaDiariaCop: number | null;
  valorCop: number;
  /** La factura no ha llegado: es el promedio por días. */
  estimado: boolean;
  /** La persona escribió el valor. */
  valorAMano: boolean;
  facturaId: string | null;
}

export interface LiquidacionDeSalida {
  disponible: boolean;
  contractId: string;
  contrato: string | null;
  inquilino: string | null;
  inmueble: string | null;
  fechaEntrega: string;
  fechaEntregaDe: OrigenDeLaFechaDeEntrega | null;
  tramitesPorDefectoCop: number;
  /** El saldo a favor que el inquilino ya tiene en el contrato (`null` = no se pudo leer). */
  anticipoDelContratoCop: number | null;
  facturasDelPromedio: number;
  grupos: GrupoDeLaSalida[];
  filas: FilaDeLaSalida[];
  subtotalCop: number;
  tramitesCop: number;
  saldoAFavorCop: number;
  totalCop: number;
  aDevolverCop: number;
  sinHistorial: boolean;
  avisos: string[];
  frase: string;
}

export interface PedidoDeLaSalida {
  fechaEntrega?: string;
  tramitesCop?: number;
  saldoAFavorCop?: number;
  /** Cuántas facturas entran al promedio (1 a 24). */
  facturas?: number;
}

export interface CargaDeLaSalida {
  fechaEntrega: string;
  filas: Array<Partial<FilaDeLaSalida> & Pick<FilaDeLaSalida, 'corteDesde' | 'corteHasta' | 'dias' | 'estimado'>>;
  tramitesCop?: number;
  saldoAFavorCop?: number;
  desdeMes?: string;
  hastaMes?: string;
}

export interface SalidaCargada {
  contractId: string;
  conceptoId: string;
  nombre: string;
  valorCop: number;
  meses: Array<{ mes: string; valorCop: number }>;
  subtotalCop: number;
  tramitesCop: number;
  saldoAFavorCop: number;
  totalCop: number;
  aDevolverCop: number;
  filas: FilaDeLaSalida[];
  avisos: string[];
  frase: string;
}

function consulta(pares: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(pares)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}

function formulario(d: FacturaQueSeRegistra): FormData {
  const f = new FormData();
  f.append('tipo', d.tipo);
  f.append('servicio', d.servicio);
  if (d.servicios && d.servicios.length > 1) f.append('servicios', d.servicios.join(','));
  f.append('periodoDesde', d.periodoDesde);
  f.append('periodoHasta', d.periodoHasta);
  if (d.mesFacturado) f.append('mesFacturado', d.mesFacturado);
  f.append('valorCop', String(d.valorCop));
  if (d.empresa?.trim()) f.append('empresa', d.empresa.trim());
  if (d.pagadaPor) f.append('pagadaPor', d.pagadaPor);
  if (d.entrega) f.append('entrega', d.entrega);
  if (d.devolucion) f.append('devolucion', d.devolucion);
  if (d.pagarConLaGarantia) f.append('pagarConLaGarantia', 'true');
  if (d.nota?.trim()) f.append('nota', d.nota.trim());
  if (d.soporte) f.append('soporte', d.soporte);
  return f;
}

export const serviciosPublicosApi = {
  tablero: (mes: string) => apiClient.get<TableroDeServicios>(`/inmobiliaria/servicios-publicos?mes=${mes}`),
  delContrato: (contractId: string) => apiClient.get<ServiciosDelContrato>(`/contracts/${contractId}/servicios-publicos`),
  revisarEntrada: (contractId: string, d: Omit<FacturaQueSeRegistra, 'tipo' | 'soporte'>) =>
    apiClient.post<LiquidacionDeEntrada>(`/contracts/${contractId}/servicios-publicos/entrada/revisar`, { ...d, tipo: 'ENTRADA' }),
  registrar: (contractId: string, d: FacturaQueSeRegistra) =>
    enviarFormulario<FacturaDeServicio>(`/contracts/${contractId}/servicios-publicos/facturas`, formulario(d)),
  aprobar: (facturaId: string) =>
    apiClient.post<FacturaDeServicio>(`/inmobiliaria/servicios-publicos/facturas/${facturaId}/aprobar`, {}),
  rechazar: (facturaId: string, motivo: string) =>
    apiClient.post<FacturaDeServicio>(`/inmobiliaria/servicios-publicos/facturas/${facturaId}/rechazar`, { motivo }),
  pagarConLaGarantia: (facturaId: string, devolucion?: string) =>
    apiClient.post<FacturaDeServicio>(
      `/inmobiliaria/servicios-publicos/facturas/${facturaId}/pagar-con-la-garantia`,
      devolucion ? { devolucion } : {},
    ),
  soporte: (facturaId: string) => apiClient.get<{ url: string }>(`/inmobiliaria/servicios-publicos/facturas/${facturaId}/soporte`),
  /** Mori recuerda la factura: el día del mes siguiente, o `null` para apagarlo. */
  guardarRecordatorio: (dia: number | null) =>
    apiClient.put<ConfiguracionDelRecordatorio>('/inmobiliaria/servicios-publicos/recordatorios', { dia }),

  /** La liquidación de servicios al entregar el inmueble (400 `FALTA_LA_FECHA_DE_ENTREGA` si no hay con qué deducirla). */
  liquidacionDeSalida: (contractId: string, p: PedidoDeLaSalida = {}) =>
    apiClient.get<LiquidacionDeSalida>(
      `/contracts/${contractId}/servicios-publicos/liquidacion-de-salida${consulta({
        fechaEntrega: p.fechaEntrega,
        tramitesCop: p.tramitesCop,
        saldoAFavorCop: p.saldoAFavorCop,
        facturas: p.facturas,
      })}`,
    ),
  /** Carga al contrato el concepto «Anticipo de servicios públicos» (409 `NADA_QUE_COBRAR` si el saldo a favor lo cubre). */
  cargarLiquidacionDeSalida: (contractId: string, d: CargaDeLaSalida) =>
    apiClient.post<SalidaCargada>(`/contracts/${contractId}/servicios-publicos/liquidacion-de-salida/cargar`, d),
  /** Una factura registrada partida entre el anterior y el nuevo (por defecto, la entrega = el inicio del contrato). */
  entradaDeLaFactura: (facturaId: string, entrega?: string) =>
    apiClient.get<LiquidacionDeEntradaEnHoja>(
      `/inmobiliaria/servicios-publicos/facturas/${facturaId}/liquidacion-de-entrada${consulta({ entrega })}`,
    ),
  /** El simulador de la liquidación de entrada: no escribe nada. */
  simularEntrada: (p: PedidoDeLaEntrada) =>
    apiClient.get<LiquidacionDeEntradaEnHoja>(
      `/inmobiliaria/servicios-publicos/liquidacion-de-entrada${consulta({
        periodoDesde: p.periodoDesde,
        periodoHasta: p.periodoHasta,
        valorCop: p.valorCop,
        entrega: p.entrega,
      })}`,
    ),

  // El portal del inquilino.
  delPortal: () => apiClient.get<ServiciosDelPortal>('/portal/servicios-publicos'),
  subirDelPortal: (contractId: string, d: FacturaQueSeRegistra) =>
    enviarFormulario<FacturaDeServicio>(`/portal/servicios-publicos/${contractId}/facturas`, formulario(d)),
  soporteDelPortal: (facturaId: string) => apiClient.get<{ url: string }>(`/portal/servicios-publicos/facturas/${facturaId}/soporte`),
};
