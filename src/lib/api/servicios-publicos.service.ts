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
export type EstadoDelMes = 'AL_DIA' | 'POR_REVISAR' | 'RECHAZADA' | 'SIN_FACTURA';

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
  nombreDelServicio: string;
  empresa: string | null;
  periodoDesde: string;
  periodoHasta: string;
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
  ultimaFactura: FacturaDeServicio | null;
  /** 22-10-2026: lo que Mori recordó de la factura de este mes (un back viejo no lo manda). */
  recordatorios?: RecordatorioDeMori[];
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
  resumen: { alDia: number; porRevisar: number; rechazadas: number; sinFactura: number; ajustesPorRevisar: number };
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
  empresa?: string;
  periodoDesde: string;
  periodoHasta: string;
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

function formulario(d: FacturaQueSeRegistra): FormData {
  const f = new FormData();
  f.append('tipo', d.tipo);
  f.append('servicio', d.servicio);
  f.append('periodoDesde', d.periodoDesde);
  f.append('periodoHasta', d.periodoHasta);
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

  // El portal del inquilino.
  delPortal: () => apiClient.get<ServiciosDelPortal>('/portal/servicios-publicos'),
  subirDelPortal: (contractId: string, d: FacturaQueSeRegistra) =>
    enviarFormulario<FacturaDeServicio>(`/portal/servicios-publicos/${contractId}/facturas`, formulario(d)),
  soporteDelPortal: (facturaId: string) => apiClient.get<{ url: string }>(`/portal/servicios-publicos/facturas/${facturaId}/soporte`),
};
