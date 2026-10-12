/**
 * El portal del propietario de inmobiliaria (QA 11-10-2026): su cuenta de
 * giro, sus giros, la ficha de cada inmueble, los documentos firmados y los
 * certificados descargables. Back: `portal/propietario/*` (por la sesión).
 */
import { apiClient } from './client';
import { enviarFormulario } from './ciclo-de-vida.service';

export interface CuentaDeGiro {
  propietarioId: string;
  inmobiliaria: string;
  cuenta: { banco: string | null; tipo: string | null; numero: string | null; titular: string } | null;
  giroDevuelto: { valorCop: number; fecha: string | null; motivo: string; cuenta: string | null } | null;
  cambioEnCurso: {
    id: string;
    estado: 'PENDIENTE_CONFIRMACION' | 'CONFIRMADO';
    banco: string | null;
    numero: string | null;
    pedidoEl: string;
    venceEl: string;
  } | null;
}

export type EstadoDelGiro = 'GIRADO' | 'EN_CAMINO' | 'DEVUELTO' | 'REGIRADO';

export interface GiroDelPropietario {
  id: string;
  inmobiliaria: string;
  mes: string;
  valorCop: number;
  estado: EstadoDelGiro;
  giradoEl: string | null;
  banco: string | null;
  cuenta: string | null;
  referencia: string | null;
  devolucion: { fecha: string | null; motivo: string } | null;
}

export type EstadoDelContratoEnElPortal = 'VIGENTE' | 'POR_EMPEZAR' | 'EN_FIRMA' | 'TERMINADO' | 'CANCELADO';
export type EstadoDelMes = 'PAGADO' | 'ABONADO' | 'PENDIENTE' | 'VENCIDO' | 'SIN_CUOTA';

export interface FichaDelInmueble {
  contrato: {
    id: string;
    estado: EstadoDelContratoEnElPortal;
    inicio: string | null;
    fin: string | null;
    canonCop: number | null;
  };
  inmueble: { titulo: string; direccion: string; ciudad: string; tipo: string };
  inmobiliaria: string;
  inquilino: { nombre: string | null } | null;
  mesActual: {
    mes: string;
    estado: EstadoDelMes;
    pagadoEl: string | null;
    vence: string | null;
    pagadoCop: number;
    pendienteCop: number;
  } | null;
  desocupado: { desde: string | null; dias: number | null; publicado: boolean; visitas: number; postulaciones: number } | null;
  documentos: { mandato: { firmadoEl: string | null } | null; contrato: { firmadoEl: string | null } | null };
}

export interface CertificacionDelMandatario {
  id: string;
  inmobiliaria: string;
  periodo: string;
  desde: string | null;
  hasta: string | null;
  facturas: number;
  totalCop: number;
}

export interface FacturaDeLaComision {
  id: string;
  inmobiliaria: string;
  numero: string | null;
  mes: string;
  inmueble: string;
  totalCop: number;
  emitidaEl: string;
}

export interface SobrecostoDeReparacion {
  id: string;
  solicitudId: string;
  titulo: string;
  inmueble: string | null;
  aprobadoCop: number;
  costoFinalCop: number;
  diferenciaCop: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ANULADO';
  pedidoEl: string;
  decididoEl: string | null;
  motivoDeRechazo: string | null;
}

/** Baja un PDF del back y lo entrega al navegador con su nombre. */
async function bajar(ruta: string, nombre: string): Promise<void> {
  const blob = await apiClient.getBlob(ruta);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const portalDelPropietarioApi = {
  cuentaDeGiro: () => apiClient.get<{ fichas: CuentaDeGiro[] }>('/portal/propietario/cuenta-de-giro'),
  /** Cambiar la cuenta: certificación + confirmación por correo + aprobación de un administrador. */
  pedirCambioDeCuenta: (propietarioId: string, formulario: FormData) =>
    enviarFormulario<{ cambio: unknown; enlaceDePrueba?: string }>(
      `/portal/propietario/cuenta-de-giro/${propietarioId}/cambio`,
      formulario,
    ),
  giros: () => apiClient.get<{ giros: GiroDelPropietario[] }>('/portal/propietario/giros'),
  bajarExtracto: (g: Pick<GiroDelPropietario, 'id' | 'mes'>) =>
    bajar(`/portal/propietario/giros/${g.id}/extracto.pdf`, `extracto-${g.mes}.pdf`),
  inmueble: (contractId: string) => apiClient.get<FichaDelInmueble>(`/portal/propietario/contratos/${contractId}`),
  // Las dos rutas del back son fijas: escritas enteras para que el guardián de rutas las reconozca.
  documento: (contractId: string, cual: 'mandato' | 'contrato') =>
    cual === 'mandato'
      ? apiClient.get<{ url: string }>(`/portal/propietario/contratos/${contractId}/documentos/mandato`)
      : apiClient.get<{ url: string }>(`/portal/propietario/contratos/${contractId}/documentos/contrato`),
  bajarCertificadoDeIngresos: (anio: number) =>
    bajar(`/portal/propietario/certificado-de-ingresos.pdf?anio=${anio}`, `certificado-de-ingresos-${anio}.pdf`),
  certificacionesDelMandatario: () =>
    apiClient.get<{ disponible: boolean; certificaciones: CertificacionDelMandatario[] }>(
      '/portal/propietario/certificaciones-del-mandatario',
    ),
  bajarCertificacion: (c: Pick<CertificacionDelMandatario, 'id' | 'hasta'>) =>
    bajar(`/portal/propietario/certificaciones-del-mandatario/${c.id}/pdf`, `certificacion-del-mandatario-${c.hasta ?? c.id}.pdf`),
  facturas: () => apiClient.get<{ facturas: FacturaDeLaComision[] }>('/portal/propietario/facturas'),
  bajarFactura: (f: Pick<FacturaDeLaComision, 'id' | 'numero'>) =>
    bajar(`/portal/propietario/facturas/${f.id}/pdf`, `factura-${f.numero ?? f.id}.pdf`),
  sobrecostos: () =>
    apiClient.get<{ disponible: boolean; pendientes: SobrecostoDeReparacion[]; historial: SobrecostoDeReparacion[] }>(
      '/portal/aprobaciones-de-reparacion/sobrecostos',
    ),
  aprobarSobrecosto: (id: string) => apiClient.post(`/portal/aprobaciones-de-reparacion/sobrecostos/${id}/aprobar`, {}),
  rechazarSobrecosto: (id: string, motivo?: string) =>
    apiClient.post(`/portal/aprobaciones-de-reparacion/sobrecostos/${id}/rechazar`, motivo ? { motivo } : {}),
};
