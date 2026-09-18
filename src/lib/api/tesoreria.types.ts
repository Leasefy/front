/**
 * Lo que devuelve `/inmobiliaria/tesoreria` — el convenio de recaudo con el
 * banco, el traslado de la comisión, la plata pendiente de aplicar y el
 * calendario de días hábiles.
 *
 * 🔴 Copiado del back campo por campo, sin inventar ninguno. Cada bloque trae
 * `disponible` + `motivo`: la migración puede no estar aplicada y la pantalla
 * tiene que decir QUÉ falta y QUIÉN lo aplica, no caerse con un 503.
 */

// ── 1. El convenio de recaudo ───────────────────────────────────────────────

export type TipoDeArchivoDeRecaudo = 'ANCHO_FIJO' | 'DELIMITADO';

export type AlgoritmoDeDv = 'NINGUNO' | 'MODULO_10' | 'MODULO_11';

/**
 * 🔴 UN CAMINO DE ENTRADA POR CUENTA (18-09-2026). La plata de una cuenta entra
 * por el `ARCHIVO` del convenio o por el `EXTRACTO` bancario, nunca por los dos:
 * son la misma plata vista dos veces y el mismo pago quedaría dos veces en la
 * cola. `SIN_DEFINIR` = ningún convenio nombra esa cuenta, y se comporta como
 * hoy (entra por extracto).
 */
export type ViaDeEntrada = 'ARCHIVO' | 'EXTRACTO';
export type ViaResuelta = ViaDeEntrada | 'SIN_DEFINIR';

/** Ancho fijo: un tramo de la línea (1-based). Delimitado: una columna (0-based). */
export type UbicacionDelCampo = { desde: number; largo: number } | { indice: number };

export type MapaDeColumnas = Partial<
  Record<'referencia' | 'valor' | 'fecha' | 'secuencia' | 'oficina', UbicacionDelCampo>
>;

export interface Convenio {
  id: string;
  banco: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  tipo: TipoDeArchivoDeRecaudo;
  separador: string | null;
  columnas: MapaDeColumnas;
  formatoDeFecha: string;
  decimales: number;
  lineasDeEncabezado: number;
  lineasDePie: number;
  marcaDeDetalle: string | null;
  marcaEn: number | null;
  referenciaLargo: number | null;
  referenciaPrefijo: string | null;
  referenciaDv: AlgoritmoDeDv;
  /** La cuenta a la que el banco le consigna. `null` = el convenio no lo dice. */
  cuentaBancaria: string | null;
  viaDeEntrada: ViaDeEntrada;
  /** Qué significa esa vía, en palabras. */
  viaDeEntradaNombre: string;
  /** Cómo se vería la referencia del contrato 1850 con este convenio. */
  ejemploDeReferencia: string;
  avisos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PresetDeConvenio {
  clave: string;
  nombre: string;
  advertencia: string;
  formato: {
    tipo: TipoDeArchivoDeRecaudo;
    separador?: string | null;
    columnas: MapaDeColumnas;
    formatoDeFecha: string;
    decimales: number;
    lineasDeEncabezado: number;
    lineasDePie: number;
    marcaDeDetalle?: string | null;
    marcaEn?: number | null;
  };
}

export interface ListaDeConvenios {
  disponible: boolean;
  motivo: string | null;
  convenios: Convenio[];
  tipos: { valor: TipoDeArchivoDeRecaudo; nombre: string }[];
  formatosDeFecha: string[];
  presets: PresetDeConvenio[];
  viasDeEntrada: { valor: ViaDeEntrada; nombre: string }[];
}

export interface GuardarConvenio {
  banco: string;
  codigo: string;
  nombre: string;
  tipo: TipoDeArchivoDeRecaudo;
  separador?: string;
  columnas: MapaDeColumnas;
  formatoDeFecha: string;
  decimales: number;
  lineasDeEncabezado?: number;
  lineasDePie?: number;
  marcaDeDetalle?: string;
  marcaEn?: number;
  referenciaLargo?: number;
  referenciaPrefijo?: string;
  referenciaDv?: AlgoritmoDeDv;
  cuentaBancaria?: string;
  viaDeEntrada?: ViaDeEntrada;
  activo?: boolean;
}

// ── 2. El archivo de recaudo ────────────────────────────────────────────────

export interface FilaLeidaDelRecaudo {
  linea: number;
  crudo: string;
  referencia: string;
  nucleo: string;
  nucleoAlterno: string | null;
  dvValido: boolean;
  valorCop: number;
  fecha: string | null;
  secuencia: string | null;
  oficina: string | null;
}

export interface FilaRechazadaDelRecaudo {
  linea: number;
  crudo: string;
  codigo: string;
  motivo: string;
}

export interface PreviaDelRecaudo {
  convenio: { id: string; nombre: string; banco: string };
  huella: string;
  /** No `null` = este archivo YA se importó: volver a subirlo no aplica nada. */
  yaImportado: { id: string; nombre: string; createdAt: string; nuevas: number } | null;
  lineas: number;
  omitidas: number;
  totalCop: number;
  validas: number;
  rechazadas: FilaRechazadaDelRecaudo[];
  avisos: string[];
  /** `false` = importarlo va a responder 409: esa cuenta entra por extracto. */
  puedeImportarse: boolean;
  viaDeEntrada: ViaResuelta;
  muestra: FilaLeidaDelRecaudo[];
}

export interface ArchivoDeRecaudo {
  id: string;
  convenioId: string;
  convenio: string | null;
  banco: string | null;
  nombre: string;
  huella: string;
  lineas: number;
  filasValidas: number;
  filasRechazadas: number;
  nuevas: number;
  repetidas: number;
  totalCop: number;
  estado: string;
  loteId: string | null;
  createdAt: string;
  cargadoPorUserId: string;
}

/** El lote de conciliación que se arma al importar. Mismo shape que el de cobros. */
export interface LoteDelRecaudo {
  id: string;
  estado: string;
  cantidad: number;
  totalCop: number;
  movimientos: { movimientoId: string; valorCop: number; tenantName?: string | null }[];
}

export interface ResultadoDeImportar {
  /** `true` = el mismo archivo ya se había subido y NO se aplicó nada. */
  yaImportado: boolean;
  archivo: ArchivoDeRecaudo;
  lote: LoteDelRecaudo | null;
  rechazadas: FilaRechazadaDelRecaudo[];
  avisos: string[];
}

export interface FilaDelArchivo {
  id: string;
  linea: number;
  crudo: string;
  referencia: string | null;
  referenciaValida: boolean;
  valorCop: number;
  fecha: string | null;
  secuencia: string | null;
  oficina: string | null;
  estado: 'NUEVA' | 'REPETIDA' | 'RECHAZADA';
  motivo: string | null;
  movimientoId: string | null;
  contractId: string | null;
  calzaExacto: boolean;
  movimiento: { estado: string; reciboId: string | null } | null;
}

export interface DetalleDelArchivo {
  archivo: ArchivoDeRecaudo;
  filas: FilaDelArchivo[];
  aplicadas: number;
}

// ── 3. El traslado de la comisión ───────────────────────────────────────────

export interface ConfiguracionDeTesoreria {
  disponible: boolean;
  motivo: string | null;
  cuentaPucRecaudoId: string | null;
  cuentaPucPropiaId: string | null;
  cuentaDeRecaudo: string | null;
  cuentaPropia: string | null;
  trasladarIvaDeLaComision: boolean;
  trasladarIntereses: boolean;
  trasladarGastosDeCobranza: boolean;
}

export interface RenglonDelTraslado {
  concepto: string;
  valorCop: number;
  porQue: string;
}

export interface PropuestaDeTraslado {
  disponible: boolean;
  periodo: string;
  comisionCop: number;
  ivaComisionCop: number;
  retencionesComisionCop: number;
  interesesCop: number;
  gastosDeCobranzaCop: number;
  yaTrasladadoCop: number;
  totalCop: number;
  renglones: RenglonDelTraslado[];
  hayQueTrasladar: boolean;
  avisos: string[];
}

export type EstadoDelTraslado = 'PROPUESTO' | 'APROBADO' | 'RECHAZADO' | 'ANULADO';

export interface Traslado {
  id: string;
  origen: 'LOTE' | 'MES' | 'MANUAL';
  loteId: string | null;
  periodo: string;
  comisionCop: number;
  ivaComisionCop: number;
  retencionesComisionCop: number;
  interesesCop: number;
  gastosDeCobranzaCop: number;
  totalCop: number;
  estado: EstadoDelTraslado;
  fecha: string | null;
  comprobanteNumero: number | null;
  asientoId: string | null;
  motivo: string | null;
  propuestoPorUserId: string | null;
  aprobadoPorUserId: string | null;
  aprobadoAt: string | null;
  createdAt: string;
}

export interface ListaDeTraslados {
  disponible: boolean;
  propuestos: Traslado[];
  recientes: Traslado[];
}

// ── 4. La plata pendiente de aplicar ────────────────────────────────────────

export type EstadoDelPendiente = 'PENDIENTE' | 'APLICADO' | 'DEVUELTO' | 'ANULADO';

export interface PendienteDeAplicar {
  id: string;
  contractId: string | null;
  tenantId: string | null;
  nombre: string;
  origen: 'SINIESTRO' | 'OTRO';
  pagadorTipo: string | null;
  aseguradoraId: string | null;
  pagadorNombre: string | null;
  siniestroReferencia: string | null;
  valorCop: number;
  aplicadoCop: number;
  devueltoCop: number;
  saldoCop: number;
  estado: EstadoDelPendiente;
  fecha: string;
  medio: string;
  referencia: string | null;
  notas: string | null;
  motivo: string | null;
  createdAt: string;
  movimientos: {
    id: string;
    tipo: 'APLICACION' | 'DEVOLUCION';
    valorCop: number;
    fecha: string;
    reciboIds: string[];
    meses: string[];
    motivo: string | null;
    createdAt: string;
  }[];
}

export interface PendienteAplicable {
  pendiente: PendienteDeAplicar;
  vencidoCop: number;
  aplicableCop: number;
  porQue: string;
}

export interface ListaDeAplicables {
  disponible: boolean;
  motivo: string | null;
  aplicables: PendienteAplicable[];
  totalAplicableCop?: number;
}

export interface ListaDePendientes {
  disponible: boolean;
  motivo: string | null;
  pendientes: PendienteDeAplicar[];
  totalPendienteCop: number;
}

// ── 5. El calendario ────────────────────────────────────────────────────────

export interface DiaDelCalendario {
  fecha: string;
  nombre: string;
  trasladado: boolean;
  origen: 'CALCULADO' | 'AGREGADO';
  activo: boolean;
  correccionId: string | null;
  deLaInmobiliaria: boolean;
}

export interface CalendarioDelAnio {
  anio: number;
  puedeCorregir: boolean;
  motivo: string | null;
  esperados: number;
  dias: DiaDelCalendario[];
  activos: number;
  diasDistintos: number;
}

// ── 6. Los certificados en el portal del propietario ────────────────────────

export interface CertificadoDelPropietario {
  id: string;
  agencyId: string;
  anio: number;
  numero: number;
  nombre: string;
  documento: string;
  baseCop: number;
  retefuenteCop: number;
  reteIvaCop: number;
  reteIcaCop: number;
  totalRetenidoCop: number;
  emitidoAt: string;
}

export interface MisCertificados {
  certificados: CertificadoDelPropietario[];
  /** Por qué la lista está vacía. `null` cuando hay certificados. */
  motivo: string | null;
}

// ── 7. Las cuentas con camino de entrada declarado ──────────────────────────

export interface CuentaDeclarada {
  cuenta: string;
  via: ViaDeEntrada;
  convenio: string;
  banco: string;
}
